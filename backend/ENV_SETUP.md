# Environment Setup Instructions

This document provides instructions for setting up the environment variables required for the Face Attendance System.

## Creating the .env File

Create a file named `.env` in the `backend/` directory with the following contents:

```
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/attendance_system

# Security Keys (replace with your own secure random strings)
SECRET_KEY=your_secure_secret_key_here
JWT_SECRET_KEY=your_secure_jwt_key_here
JWT_ACCESS_TOKEN_EXPIRES=86400

# Environment Settings
FLASK_ENV=development
DEBUG=True
PORT=5000

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:8080

# Email Configuration (Gmail example)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com

# Face Recognition Settings
FACE_RECOGNITION_TOLERANCE=0.6
FACE_DETECTION_MODEL=hog
```

## Email Setup

To set up email for OTP verification:

1. Create or use an existing Gmail account
2. Enable 2-Step Verification on your Google account
3. Generate an App Password:
   - Go to your Google Account > Security
   - Under "Signing in to Google," select "App passwords"
   - Select "Mail" as the app and "Other" as the device
   - Enter "Face Attendance System" as the name
   - Click "Generate"
4. Copy the 16-character password that appears
5. Paste this password as the value for `MAIL_PASSWORD` in your `.env` file
6. Use your Gmail address for `MAIL_USERNAME` and `MAIL_DEFAULT_SENDER`

## MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas
2. For local installation:
   - Make sure MongoDB is running on the default port (27017)
   - The application will automatically create the `attendance_system` database
3. For MongoDB Atlas:
   - Create a cluster in MongoDB Atlas
   - Get your connection string
   - Update the `MONGODB_URI` in your `.env` file with the connection string:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance_system
     ```

## Security Keys

Replace the placeholder security keys with strong random strings:

1. Generate secure random keys using Python:
   ```python
   import secrets
   print(secrets.token_hex(32))
   ```
2. Use different random strings for `SECRET_KEY` and `JWT_SECRET_KEY`

## CORS Configuration

If your frontend is running on a different port or domain, update the `CORS_ORIGINS` variable accordingly. Separate multiple origins with commas:

```
CORS_ORIGINS=http://localhost:5173,http://localhost:8080,https://your-production-frontend.com
```

## Running in Production

For production deployment:

1. Set `FLASK_ENV=production`
2. Set `DEBUG=False` 
3. Use more secure settings for all security-related variables
4. Consider using environment variables from your hosting platform rather than a `.env` file 