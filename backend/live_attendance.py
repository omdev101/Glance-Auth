from flask import request, jsonify, current_app, make_response, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from models import User, Attendance, StudentProfile, Settings
import json
import base64
import io
import numpy as np
import face_recognition
from PIL import Image
import datetime
from routes import preprocess_image_for_face_detection

# Create a Blueprint for live attendance routes
live_attendance_bp = Blueprint('live_attendance', __name__)

def register_live_attendance_routes(app):
    """Register the live attendance routes with the Flask app"""
    # Register the blueprint with the Flask app
    app.register_blueprint(live_attendance_bp)
    app.logger.info("Live attendance routes registered successfully")

@live_attendance_bp.route('/api/admin/live-attendance', methods=['POST', 'OPTIONS'])
@jwt_required()
def process_live_attendance():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:8080'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Check if user is admin
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized. Only admin can use this feature'}), 403
    
    # Get image data from request
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        # Decode base64 image
        if ',' in data['image']:
            header, encoded = data['image'].split(',', 1)
            image_data = base64.b64decode(encoded)
        else:
            image_data = base64.b64decode(data['image'])
        
        # Process image with face_recognition
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_np = np.array(image)
        
        # Apply preprocessing to improve face detection
        preprocessed_image, _ = preprocess_image_for_face_detection(image_np)
        
        # Find all face locations in the image - supporting multiple faces
        face_locations = face_recognition.face_locations(preprocessed_image, model="hog")
        
        if len(face_locations) == 0:
            return jsonify({
                'success': True,
                'message': 'No faces detected in the image',
                'detected_faces': 0,
                'students': []
            }), 200

        # Get face encodings for all detected faces
        face_encodings = face_recognition.face_encodings(preprocessed_image, face_locations)
        
        # Find matching student profiles with face images
        student_profiles = list(StudentProfile.collection().find({
            'is_approved': True,
            'face_images.front': {'$exists': True}
        }))
        
        if not student_profiles:
            return jsonify({
                'success': True,
                'message': 'No registered students with face data found',
                'detected_faces': len(face_locations),
                'students': []
            }), 200

        # Process each detected face
        recognized_students = []
        marked_attendance = []
        
        # Extract all stored face encodings first to avoid repeated processing
        stored_encodings = []
        stored_profiles = []
        
        for profile in student_profiles:
            try:
                if 'face_images' in profile and 'front' in profile['face_images']:
                    stored_image_data = profile['face_images']['front']
                    
                    # Remove data URI prefix if present
                    if stored_image_data.startswith('data:image'):
                        stored_image_data = stored_image_data.split(',', 1)[1]
                    
                    # Decode and convert to image
                    image_bytes = base64.b64decode(stored_image_data)
                    stored_image = Image.open(io.BytesIO(image_bytes))
                    if stored_image.mode != 'RGB':
                        stored_image = stored_image.convert('RGB')
                    stored_image_np = np.array(stored_image)
                    
                    # Find face in stored image
                    stored_face_locations = face_recognition.face_locations(stored_image_np, model="hog")
                    if len(stored_face_locations) > 0:
                        stored_face_encoding = face_recognition.face_encodings(stored_image_np, stored_face_locations)[0]
                        stored_encodings.append(stored_face_encoding)
                        stored_profiles.append(profile)
            except Exception as e:
                current_app.logger.error(f"Error processing stored face: {str(e)}")
                continue
        
        # Process each detected face
        for i, face_encoding in enumerate(face_encodings):
            best_match_distance = 1.0
            best_match_profile = None
            best_match_index = -1
            
            # Compare with all stored encodings
            if stored_encodings:
                face_distances = face_recognition.face_distance(stored_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                best_match_distance = face_distances[best_match_index]
                
                # Only consider matches below the threshold
                if best_match_distance < 0.6:
                    best_match_profile = stored_profiles[best_match_index]
                
            # If a match is found, process it
            if best_match_profile:
                student = User.find_by_id(str(best_match_profile['user_id']))
                if student:
                    # Check if student already marked attendance for today
                    today = datetime.datetime.now().strftime('%Y-%m-%d')
                    now = datetime.datetime.now()
                    attendance_date = today
                    attendance_time = now.strftime('%H:%M:%S')
                    
                    existing_attendance = Attendance.collection().find_one({
                        'student_id': ObjectId(student['_id']),
                        'date': today
                    })
                    
                    attendance_info = {
                        'already_marked': existing_attendance is not None
                    }
                    
                    # If attendance not marked yet, mark it
                    if not existing_attendance:
                        result = Attendance.collection().insert_one({
                            'student_id': ObjectId(student['_id']),
                            'date': attendance_date,
                            'time': attendance_time,
                            'status': 'present',
                            'marked_by': ObjectId(user_id),
                            'marked_method': 'live_face_recognition',
                            'created_at': now,
                            'updated_at': now
                        })
                        attendance_info['_id'] = str(result.inserted_id)
                        attendance_info['marked_now'] = True
                        marked_attendance.append(student['_id'])
                    else:
                        attendance_info['_id'] = str(existing_attendance['_id'])
                        attendance_info['marked_now'] = False
                        attendance_info['marked_at'] = existing_attendance.get('time', '00:00:00')
                    
                    # Add recognized student with confidence score
                    confidence = round((1.0 - best_match_distance) * 100, 2)  # Convert to percentage
                    recognized_students.append({
                        'student': {
                            '_id': str(student['_id']),
                            'name': student['name'],
                            'email': student['email'],
                            'registration_number': best_match_profile.get('registration_number', 'Unknown'),
                            'course': best_match_profile.get('course', 'Unknown'),
                            'year_of_study': best_match_profile.get('year_of_study', 'Unknown'),
                            'profile_photo': best_match_profile.get('profile_photo', None)
                        },
                        'confidence': confidence,
                        'attendance': attendance_info,
                        'face_position': {
                            'top': face_locations[i][0],
                            'right': face_locations[i][1],
                            'bottom': face_locations[i][2],
                            'left': face_locations[i][3]
                        }
                    })
            
        # Return all recognized students and attendance records
        response_message = (
            f"Successfully recognized {len(recognized_students)} out of {len(face_locations)} detected faces. "
            f"Marked attendance for {len([s for s in recognized_students if s['attendance'].get('marked_now', False)])} students."
        )
        
        return jsonify({
            'success': True,
            'message': response_message,
            'detected_faces': len(face_locations),
            'recognized_students': len(recognized_students),
            'students': recognized_students
        }), 200
    
    except Exception as e:
        current_app.logger.error(f"Error in live attendance processing: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Processing failed: {str(e)}',
            'students': []
        }), 500
    
@live_attendance_bp.route('/api/admin/recent-live-attendance', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_recent_live_attendance():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:8080'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    # Check if user is admin
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized. Only admin can access attendance records'}), 403
    
    try:
        # Get current date
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        
        # Get attendance records for today, sorted by time (newest first)
        attendance_records = list(Attendance.collection().find({
            'date': today,
            'marked_method': 'live_face_recognition'
        }).sort('created_at', -1).limit(20))
        
        # Format the response
        result = []
        for record in attendance_records:
            # Get student details
            student = User.find_by_id(str(record['student_id']))
            if student:
                # Find student profile for additional details
                profile = StudentProfile.collection().find_one({'user_id': ObjectId(student['_id'])})
                
                result.append({
                    '_id': str(record['_id']),
                    'name': student['name'],
                    'email': student['email'],
                    'roll_number': profile.get('registration_number', 'Unknown') if profile else 'Unknown',
                    'profile_photo': profile.get('profile_photo', None) if profile else None,
                    'status': record.get('status', 'present'),
                    'time': record.get('time', '00:00:00'),
                    'timestamp': record.get('created_at', datetime.datetime.now()).isoformat() if isinstance(record.get('created_at'), datetime.datetime) else datetime.datetime.now().isoformat()
                })
        
        return jsonify({
            'records': result,
            'count': len(result),
            'date': today
        }), 200
            
    except Exception as e:
        current_app.logger.error(f"Error fetching recent attendance: {str(e)}")
        return jsonify({
            'error': f'Error fetching recent attendance: {str(e)}',
            'records': []
        }), 500

@live_attendance_bp.route('/api/admin/settings/live-attendance', methods=['GET', 'POST', 'OPTIONS'])
@jwt_required()
def handle_live_attendance_settings():
    """Handle GET and POST requests for live attendance settings"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response
    
    # Check if user is admin
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized. Only admin can manage settings'}), 403
    
    try:
        if request.method == 'GET':
            # Return the current settings - get directly from DB
            from pymongo import MongoClient
            client = MongoClient('mongodb://localhost:27017/')
            db = client['attendance_system']
            
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
                
            settings = {
                'isVisible': is_visible,
                'autoSchedule': auto_schedule
            }
            current_app.logger.info(f"GET settings directly from DB: {settings}")
            return jsonify(settings), 200
        
        elif request.method == 'POST':
            # Update settings from request data
            data = request.get_json()
            current_app.logger.info(f"Received settings update: {data}")
            
            if data is None:
                current_app.logger.error("Invalid JSON in request")
                return jsonify({'error': 'Invalid JSON'}), 400
            
            # Extract settings from request
            is_visible = data.get('isVisible')
            auto_schedule = data.get('autoSchedule')
            
            # Ensure is_visible is a proper boolean, not a string
            if is_visible is not None:
                try:
                    if not isinstance(is_visible, bool):
                        is_visible = str(is_visible).lower() == 'true'
                except:
                    is_visible = False
            
            # Ensure auto_schedule is a proper boolean, not a string
            if auto_schedule is not None:
                try:
                    if not isinstance(auto_schedule, bool):
                        auto_schedule = str(auto_schedule).lower() == 'true'
                except:
                    auto_schedule = True
            
            current_app.logger.info(f"Parsed settings after type conversion: isVisible={is_visible} (type: {type(is_visible)}), autoSchedule={auto_schedule} (type: {type(auto_schedule)})")
            
            # Update settings directly in MongoDB
            from pymongo import MongoClient
            client = MongoClient('mongodb://localhost:27017/')
            db = client['attendance_system']
            
            # IMPORTANT: First, remove any existing settings to avoid duplicates
            if is_visible is not None:
                db.settings.delete_many({'key': 'live_attendance_visible'})
                db.settings.insert_one({
                    'key': 'live_attendance_visible',
                    'value': is_visible,
                    'updated_at': datetime.datetime.now()
                })
                current_app.logger.info(f"Updated live_attendance_visible in DB to {is_visible}")
            
            if auto_schedule is not None:
                db.settings.delete_many({'key': 'live_attendance_auto_schedule'})
                db.settings.insert_one({
                    'key': 'live_attendance_auto_schedule',
                    'value': auto_schedule,
                    'updated_at': datetime.datetime.now()
                })
                current_app.logger.info(f"Updated live_attendance_auto_schedule in DB to {auto_schedule}")
            
            # Confirm current settings in DB
            visibility_setting = db.settings.find_one({'key': 'live_attendance_visible'})
            schedule_setting = db.settings.find_one({'key': 'live_attendance_auto_schedule'})
            
            current_app.logger.info(f"Current DB settings after update: visibility={visibility_setting}, schedule={schedule_setting}")
            
            # Create response with updated settings
            updated_settings = {
                'isVisible': visibility_setting.get('value') if visibility_setting else is_visible,
                'autoSchedule': schedule_setting.get('value') if schedule_setting else auto_schedule
            }
            current_app.logger.info(f"Updated settings response: {updated_settings}")
            
            return jsonify(updated_settings), 200
    
    except Exception as e:
        current_app.logger.error(f"Error handling live attendance settings: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

@live_attendance_bp.route('/api/admin/settings/live-attendance-schedule', methods=['POST', 'OPTIONS'])
@jwt_required()
def update_auto_schedule():
    """Handle POST requests for live attendance auto schedule"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:8080'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Check if user is admin
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized. Only admin can manage settings'}), 403
    
    try:
        # Update auto schedule from request data
        data = request.get_json()
        if data is None:
            return jsonify({'error': 'Invalid JSON'}), 400
        
        auto_schedule = data.get('autoSchedule')
        if auto_schedule is None:
            return jsonify({'error': 'autoSchedule value is required'}), 400
        
        Settings.update_setting('live_attendance_auto_schedule', auto_schedule)
        
        return jsonify({
            'success': True,
            'autoSchedule': auto_schedule
        }), 200
    
    except Exception as e:
        current_app.logger.error(f"Error updating auto schedule: {str(e)}")
        return jsonify({'error': f'Failed to update auto schedule: {str(e)}'}), 500

@live_attendance_bp.route('/api/settings/live-attendance-status', methods=['GET', 'OPTIONS'])
def get_live_attendance_status():
    """Public endpoint to check if live attendance is currently enabled"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Pragma,Expires')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    
    try:
        current_app.logger.info("Getting live attendance status")
        
        # Get settings directly from the database to avoid any caching issues
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['attendance_system']
        
        # Get settings from MongoDB directly
        visibility_setting = db.settings.find_one({'key': 'live_attendance_visible'})
        schedule_setting = db.settings.find_one({'key': 'live_attendance_auto_schedule'})
        
        settings_list = list(db.settings.find())
        current_app.logger.info(f"Raw settings from database: {settings_list}")
        
        # Get visibility value (with a default of False if not found)
        is_visible = visibility_setting.get('value', False) if visibility_setting else False
        current_app.logger.info(f"Raw DB visibility setting: {is_visible} (type: {type(is_visible)})")
        
        # Ensure it's a boolean
        if not isinstance(is_visible, bool):
            try:
                is_visible = str(is_visible).lower() == 'true'
            except:
                is_visible = False
        
        current_app.logger.info(f"Processed visibility setting: {is_visible} (type: {type(is_visible)})")
        
        # Get auto schedule value (with a default of True if not found)
        auto_schedule = schedule_setting.get('value', True) if schedule_setting else True
        
        # Ensure it's a boolean
        if not isinstance(auto_schedule, bool):
            try:
                auto_schedule = str(auto_schedule).lower() == 'true'
            except:
                auto_schedule = True
        
        current_app.logger.info(f"Processed settings: visibility={is_visible}, auto_schedule={auto_schedule}")
        
        # IMPORTANT: Start with the actual visibility setting
        final_visibility = is_visible
        
        # FIXED: Only apply auto-schedule logic if visibility is False
        # This ensures manually enabled visibility isn't overridden by schedule
        if auto_schedule and not is_visible:
            # Check if current time is within scheduled hours (7:30-10:00 AM)
            now = datetime.datetime.now()
            hour = now.hour
            minute = now.minute
            current_time_in_minutes = hour * 60 + minute
            start_time_in_minutes = 7 * 60 + 30  # 7:30 AM
            end_time_in_minutes = 10 * 60        # 10:00 AM
            
            is_within_schedule = current_time_in_minutes >= start_time_in_minutes and \
                                current_time_in_minutes <= end_time_in_minutes
            
            current_app.logger.info(f"Current time: {hour}:{minute}, within schedule: {is_within_schedule}")
            
            # Only enable visibility if we're within schedule hours
            if is_within_schedule:
                final_visibility = True
                current_app.logger.info(f"Auto schedule active and within schedule hours: final visibility = True")
            else:
                current_app.logger.info(f"Outside schedule hours: keeping original visibility = {is_visible}")
        else:
            current_app.logger.info(f"Auto schedule not affecting manual setting: final visibility = {is_visible}")
        
        result = {
            'isVisible': final_visibility,
            'autoSchedule': auto_schedule
        }
        current_app.logger.info(f"Final status response: {result}")
        return jsonify(result), 200
    
    except Exception as e:
        current_app.logger.error(f"Error getting live attendance status: {str(e)}")
        
        # Return a default response even on error - important: return the default as true for testing
        return jsonify({
            'isVisible': True,  # Default to True if there's an error
            'autoSchedule': True,
            'error': str(e)
        }), 200  # Return 200 even for errors to prevent frontend issues

@live_attendance_bp.route('/api/public/mark-attendance', methods=['POST', 'OPTIONS'])
def public_mark_attendance():
    """Public endpoint for marking attendance from the public LiveAttendance page"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
    
    try:
        data = request.get_json()
        
        # Validate request data
        if not data or 'student_id' not in data:
            return jsonify({'error': 'Missing student ID'}), 400
        
        student_id = data['student_id']
        current_app.logger.info(f"Received public attendance request for student_id: {student_id}")
        
        # Handle various formats of ObjectId that might come from frontend
        try:
            # If it's a dict with $oid key (MongoDB extended JSON format)
            if isinstance(student_id, dict) and '$oid' in student_id:
                student_id = student_id['$oid']
                current_app.logger.info(f"Extracted ObjectId from $oid format: {student_id}")
            
            # If it's a dict or string that looks like JSON, try to parse it
            if isinstance(student_id, str) and (student_id.startswith('{') or student_id.startswith('\"')):
                try:
                    parsed = json.loads(student_id)
                    if isinstance(parsed, dict) and '$oid' in parsed:
                        student_id = parsed['$oid']
                        current_app.logger.info(f"Extracted ObjectId from JSON string: {student_id}")
                except (json.JSONDecodeError, TypeError):
                    # Not valid JSON, keep as is
                    pass
            
            # Convert to string if it's not already
            student_id = str(student_id)
            current_app.logger.info(f"Final student_id after normalization: {student_id}")
            
            # Now convert to ObjectId for MongoDB query
            from bson.objectid import ObjectId
            student_object_id = ObjectId(student_id)
            current_app.logger.info(f"Converted to ObjectId: {student_object_id}")
        except Exception as e:
            current_app.logger.error(f"Error processing student ID {student_id}: {str(e)}")
            return jsonify({'error': f'Invalid student ID format: {str(e)}'}), 400
        
        # Get current date and time
        now = datetime.datetime.now()
        attendance_date = data.get('date') or now.strftime('%Y-%m-%d')
        attendance_time = now.strftime('%H:%M:%S')
        status = data.get('status', 'present')
        marked_method = data.get('method', 'face_recognition')
        
        # Check if student exists
        student = User.find_by_id(student_id)
        if not student:
            current_app.logger.error(f"Student with ID {student_id} not found")
            return jsonify({'error': 'Student not found'}), 404
        
        current_app.logger.info(f"Marking attendance for student: {student['name']} (ID: {student_id}), date: {attendance_date}")
        
        # Check if attendance already exists for this date
        existing_attendance = Attendance.collection().find_one({
            'student_id': ObjectId(student_id),
            'date': attendance_date
        })
        
        if existing_attendance:
            current_app.logger.info(f"Attendance already exists for student {student['name']} on {attendance_date}")
            # Return success but indicate already marked
            return jsonify({
                'message': 'Attendance already marked for today',
                'attendance': {
                    '_id': str(existing_attendance['_id']),
                    'student_id': student_id,
                    'date': attendance_date,
                    'time': existing_attendance.get('time', '00:00:00'),
                    'status': existing_attendance.get('status', 'present')
                },
                'already_marked': True
            }), 200
        else:
            # Create new attendance record with timestamp
            result = Attendance.collection().insert_one({
                'student_id': ObjectId(student_id),
                'date': attendance_date,
                'time': attendance_time,
                'status': status,
                'marked_by': None,  # No admin marker for public endpoint
                'marked_method': marked_method,
                'created_at': now,
                'updated_at': now
            })
            
            current_app.logger.info(f"New attendance record created for student {student['name']} with ID: {str(result.inserted_id)}")
            
            # Get student profile for additional info
            profile = StudentProfile.collection().find_one({'user_id': ObjectId(student_id)})
            course_info = profile.get('course', 'Unknown') if profile else 'Unknown'
            
            return jsonify({
                'message': 'Attendance marked successfully',
                'attendance': {
                    '_id': str(result.inserted_id),
                    'student_id': student_id,
                    'student_name': student['name'],
                    'student_email': student['email'],
                    'course': course_info,
                    'date': attendance_date,
                    'time': attendance_time,
                    'status': status
                },
                'already_marked': False
            }), 201
    except Exception as e:
        current_app.logger.error(f"Error in public mark attendance: {str(e)}")
        return jsonify({
            'error': f'Error marking attendance: {str(e)}',
            'student_id': str(student_id) if 'student_id' in locals() else 'unknown'
        }), 500
