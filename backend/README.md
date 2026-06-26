# Glance Auth - Backend

This is the backend for the online face-based attendance system. It uses Flask as the web framework and MongoDB as the database.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- MongoDB installed and running
- pip (Python package installer)

### Environment Setup
1. Create a `.env` file in the root of the backend directory with the following contents:
```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-super-secret-key
MONGODB_URI=mongodb://localhost:27017/attendance_system
JWT_SECRET_KEY=another-super-secret-key
CORS_ORIGINS=http://localhost:5173

# Email configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com
```

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

### Running the Backend
```bash
flask run
```
or
```bash
python app.py
```

The server will start on http://localhost:5000

### Initialize Database
To create an initial admin user:
```bash
python init_db.py
```

This will create an admin user with:
- Email: admin@attendance.com
- Password: admin123

## API Endpoints

### Authentication
- POST `/auth/register` - Register a new student
- POST `/auth/verify-otp` - Verify email with OTP
- POST `/auth/resend-otp` - Resend verification OTP
- POST `/auth/login` - Login and get access token
- GET `/auth/profile` - Get current user profile

### Students
- GET `/student/all` - Get all students (admin only)

### Attendance
- POST `/attendance/mark` - Mark attendance
- GET `/attendance/student` - Get student's attendance
- GET `/attendance/reports` - Get attendance reports (admin only)

### Face Recognition
- POST `/face/register` - Register face data
- POST `/face/verify` - Verify face

## Project Structure
- `app.py` - Main application file
- `models.py` - Database models
- `routes.py` - API routes
- `requirements.txt` - Python dependencies
- `init_db.py` - Database initialization script 