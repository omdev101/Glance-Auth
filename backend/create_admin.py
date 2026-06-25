import bcrypt
from pymongo import MongoClient
import datetime
import os
from dotenv import load_dotenv

def create_admin():
    load_dotenv()
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/attendance_system')
    client = MongoClient(mongo_uri)
    db = client[os.getenv('MONGO_DBNAME', 'attendance_system')]
    
    email = 'glanceaudit@builtbyom.in'
    password = 'glanceauditadmin@123'
    
    # Check if admin already exists
    if db.users.find_one({'email': email}):
        print(f"Admin {email} already exists!")
        return
        
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = {
        'name': 'Admin User',
        'email': email,
        'password': hashed.decode('utf-8'),
        'role': 'admin',
        'is_verified': True, # Bypass email verification for the admin
        'created_at': datetime.datetime.now(),
        'updated_at': datetime.datetime.now()
    }
    
    db.users.insert_one(user)
    print(f"Successfully created admin account!\nEmail: {email}\nPassword: {password}")

if __name__ == '__main__':
    create_admin()
