from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import bcrypt
import random
import string
from flask import current_app

# Load environment variables
load_dotenv()

# MongoDB connection - fetch from environment
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_system')
client = MongoClient(mongo_uri)
db = client[os.getenv('MONGO_DBNAME', 'attendance_system')]  # Access database using dictionary notation

# Collections
users = db.users
attendance = db.attendance
face_data = db.face_data
otp_data = db.otp_data
student_profiles = db.student_profiles
settings = db.settings

class Settings:
    """
    Model for system-wide settings like live attendance control
    """
    @staticmethod
    def get_setting(key):
        """Get a setting by key"""
        try:
            # Get direct access to the settings collection
            mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_system')
            client = MongoClient(mongo_uri)
            db = client[os.getenv('MONGO_DBNAME', 'attendance_system')]
            setting = db.settings.find_one({'key': key})
            
            # Extract value
            value = setting['value'] if setting else None
            
            # Handle boolean values consistently
            if isinstance(value, str) and value.lower() in ['true', 'false']:
                value = value.lower() == 'true'
                
            current_app.logger.debug(f"Getting setting {key}: {value} (type: {type(value)})")
            return value
        except Exception as e:
            current_app.logger.error(f"Error getting setting {key}: {str(e)}")
            return None
    
    @staticmethod
    def update_setting(key, value):
        """Update or create a setting"""
        try:
            # Ensure consistent handling of boolean values
            if isinstance(value, str) and value.lower() in ['true', 'false']:
                value = value.lower() == 'true'
                
            # Log before update
            current_app.logger.debug(f"Updating setting {key} to {value} (type: {type(value)})")
            
            # Get direct access to the settings collection
            mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_system')
            client = MongoClient(mongo_uri)
            db = client[os.getenv('MONGO_DBNAME', 'attendance_system')]
            
            # Delete any existing settings with this key to avoid duplicates
            db.settings.delete_many({'key': key})
            
            # Insert new setting
            result = db.settings.insert_one({
                'key': key,
                'value': value,
                'updated_at': __import__('datetime').datetime.now()
            })
            
            # Verify the setting was saved correctly
            saved_setting = db.settings.find_one({'_id': result.inserted_id})
            current_app.logger.debug(f"Setting saved: {saved_setting}")
            
            return True
        except Exception as e:
            current_app.logger.error(f"Error updating setting {key}: {str(e)}")
            return False
    
    @staticmethod
    def get_live_attendance_settings():
        """Get live attendance settings as a dictionary"""
        try:
            # Get direct access to the settings collection
            mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_system')
            client = MongoClient(mongo_uri)
            db = client[os.getenv('MONGO_DBNAME', 'attendance_system')]
            
            # Get settings from MongoDB directly
            visibility_setting = db.settings.find_one({'key': 'live_attendance_visible'})
            schedule_setting = db.settings.find_one({'key': 'live_attendance_auto_schedule'})
            
            # Parse values with defaults
            is_visible = visibility_setting.get('value', False) if visibility_setting else False
            auto_schedule = schedule_setting.get('value', True) if schedule_setting else True
            
            # Ensure boolean values
            if not isinstance(is_visible, bool):
                is_visible = str(is_visible).lower() == 'true'
            if not isinstance(auto_schedule, bool):
                auto_schedule = str(auto_schedule).lower() == 'true'
                
            # Return as dictionary
            return {
                'isVisible': is_visible,
                'autoSchedule': auto_schedule
            }
        except Exception as e:
            current_app.logger.error(f"Error getting live attendance settings: {str(e)}")
            # Return defaults on error
            return {
                'isVisible': False,
                'autoSchedule': True
            }
    
    @staticmethod
    def update_live_attendance_settings(is_visible, auto_schedule=None):
        """Update live attendance settings"""
        Settings.update_setting('live_attendance_visible', is_visible)
        
        if auto_schedule is not None:
            Settings.update_setting('live_attendance_auto_schedule', auto_schedule)
        
        return True

class User:
    """
    User model for both students and admin users
    """
    @staticmethod
    def create(user_data):
        if isinstance(user_data, dict) and 'password' in user_data and not user_data['password'].startswith('$2b$'):
            # Hash the password if it's provided as a plain string
            user_data['password'] = User.hash_password(user_data['password'])
            
        # Ensure created_at and updated_at fields
        if 'created_at' not in user_data:
            user_data['created_at'] = datetime.utcnow()
        user_data['updated_at'] = datetime.utcnow()
        
        # Insert into database
        result = users.insert_one(user_data)
        return result.inserted_id
    
    @staticmethod
    def create_legacy(name, email, password, role='student', phone_number=None):
        # Hash the password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create user document
        user = {
            'name': name,
            'email': email,
            'password': hashed.decode('utf-8'),
            'role': role,
            'phone_number': phone_number,
            'is_verified': False,  # Email verification status
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert into database
        result = users.insert_one(user)
        user['_id'] = result.inserted_id
        return user
    
    @staticmethod
    def find_by_email(email):
        return users.find_one({'email': email})
    
    @staticmethod
    def get_by_email(email):
        """Alias for find_by_email for consistency"""
        return User.find_by_email(email)
    
    @staticmethod
    def find_by_id(user_id):
        from bson.objectid import ObjectId
        return users.find_one({'_id': ObjectId(user_id)})
    
    @staticmethod
    def get_by_id(user_id):
        """Alias for find_by_id for consistency"""
        return User.find_by_id(user_id)
    
    @staticmethod
    def hash_password(password):
        """Hash a password using bcrypt"""
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(stored_password, provided_password):
        return bcrypt.checkpw(
            provided_password.encode('utf-8'), 
            stored_password.encode('utf-8')
        )
    
    @staticmethod
    def get_all_students():
        return list(users.find({'role': 'student'}))
    
    @staticmethod
    def verify_email(email):
        result = users.update_one(
            {'email': email},
            {'$set': {'is_verified': True, 'updated_at': datetime.utcnow()}}
        )
        return result.modified_count > 0
        
    @staticmethod
    def update(user_id, update_data):
        """Update a user's information"""
        from bson.objectid import ObjectId
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        result = users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        return result.modified_count > 0

class StudentProfile:
    """
    Model for student profile information
    """
    @staticmethod
    def create(user_id, college_name, course, year_of_study, registration_number, profile_photo=None, face_images=None):
        profile = {
            'user_id': user_id,
            'college_name': college_name,
            'course': course,
            'year_of_study': year_of_study,
            'registration_number': registration_number,
            'profile_photo': profile_photo,
            'face_images': face_images or {},
            'is_approved': False,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert into database
        result = student_profiles.insert_one(profile)
        profile['_id'] = result.inserted_id
        return profile
    
    @staticmethod
    def find_by_user_id(user_id):
        """Find a student profile by user_id, with handling for different ID formats"""
        # Return None right away if user_id is None or empty
        if user_id is None or user_id == '' or user_id == 'None':
            return None
            
        # Try finding with user_id as is
        profile = student_profiles.find_one({'user_id': user_id})
        if profile:
            return profile
            
        # If no result and user_id is a string that looks like an ObjectId, try converting
        if isinstance(user_id, str) and len(user_id) == 24:
            try:
                from bson.objectid import ObjectId
                obj_id = ObjectId(user_id)
                return student_profiles.find_one({'user_id': obj_id})
            except Exception:
                pass
        
        # If we get this far, no profile was found
        return None
    
    @staticmethod
    def update(user_id, update_data):
        update_data['updated_at'] = datetime.utcnow()
        
        result = student_profiles.update_one(
            {'user_id': user_id},
            {'$set': update_data}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def approve_profile(profile_id):
        from bson.objectid import ObjectId
        result = student_profiles.update_one(
            {'_id': ObjectId(profile_id)},
            {'$set': {'is_approved': True, 'updated_at': datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def get_pending_profiles():
        return list(student_profiles.find({'is_approved': False}))
    
    @staticmethod
    def get_all_profiles():
        return list(student_profiles.find())
        
    @staticmethod
    def collection():
        return student_profiles
        
    @staticmethod
    def find_by_id(profile_id):
        from bson.objectid import ObjectId
        return student_profiles.find_one({'_id': ObjectId(profile_id)})

class OTP:
    """
    OTP model for email verification
    """
    @staticmethod
    def generate(email, length=6):
        # Generate a random OTP
        otp = ''.join(random.choices(string.digits, k=length))
        
        # Store in database with expiry time (10 minutes)
        otp_record = {
            'email': email,
            'otp': otp,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=10),
            'is_used': False
        }
        
        # Remove any existing OTP for this email
        otp_data.delete_many({'email': email})
        
        # Insert new OTP
        result = otp_data.insert_one(otp_record)
        
        return otp
    
    @staticmethod
    def verify(email, otp):
        # Find the OTP record
        record = otp_data.find_one({
            'email': email,
            'otp': otp,
            'is_used': False,
            'expires_at': {'$gt': datetime.utcnow()}
        })
        
        if not record:
            return False
        
        # Mark OTP as used
        otp_data.update_one(
            {'_id': record['_id']},
            {'$set': {'is_used': True}}
        )
        
        # Verify the user's email
        User.verify_email(email)
        
        return True

class FaceData:
    """
    Model for face recognition data
    """
    @staticmethod
    def store(user_id, encoding_data):
        face_record = {
            'user_id': user_id,
            'encoding': encoding_data,
            'created_at': datetime.utcnow()
        }
        result = face_data.insert_one(face_record)
        return result.inserted_id
    
    @staticmethod
    def get_by_user_id(user_id):
        return face_data.find_one({'user_id': user_id})
    
    @staticmethod
    def get_all_encodings():
        return list(face_data.find())

class Attendance:
    """
    Model for attendance records
    """
    @staticmethod
    def mark_attendance(user_id, status='present'):
        attendance_record = {
            'user_id': user_id,
            'date': datetime.utcnow().date().isoformat(),
            'timestamp': datetime.utcnow(),
            'status': status
        }
        result = attendance.insert_one(attendance_record)
        return result.inserted_id
    
    @staticmethod
    def get_user_attendance(user_id):
        return list(attendance.find({'user_id': user_id}))
    
    @staticmethod
    def get_attendance_by_date(date):
        return list(attendance.find({'date': date}))
    
    @staticmethod
    def get_all_attendance():
        return list(attendance.find())
        
    @staticmethod
    def collection():
        return attendance