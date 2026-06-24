import os
from flask import Flask, request, make_response, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from dotenv import load_dotenv
from pymongo import MongoClient
import logging
import secrets
import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

# Generate stronger fallback secrets when not provided in environment
fallback_secret_key = secrets.token_hex(32) 
fallback_jwt_secret = secrets.token_hex(32)

# Configure app with more secure defaults
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', fallback_secret_key)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', fallback_jwt_secret)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))  # 24 hours

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME'))

# Add MongoDB configuration - use standard format to avoid dnspython requirement
app.config['MONGO_URI'] = 'mongodb://localhost:27017/'
app.config['MONGO_DBNAME'] = 'attendance_system'

# Initialize extensions
jwt = JWTManager(app)
mail = Mail(app)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:8080').split(',')
CORS(app, origins=cors_origins, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"])

# Add request logging middleware
@app.before_request
def log_request_info():
    app.logger.debug('Headers: %s', request.headers)
    app.logger.debug('Body: %s', request.get_data())
    app.logger.debug('URL: %s %s', request.method, request.url)

# MongoDB connection - simplified to avoid requiring dnspython
mongo_uri = app.config['MONGO_URI']
client = MongoClient(mongo_uri)
db = client[app.config['MONGO_DBNAME']]

# Import routes after app initialization to avoid circular imports
from routes import register_routes
from live_attendance import register_live_attendance_routes

# Add a simple health check endpoint
@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Pragma,Expires')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    
    return jsonify({"status": "ok", "timestamp": datetime.datetime.now().isoformat()}), 200

# Register all routes
register_routes(app)
register_live_attendance_routes(app)

if __name__ == '__main__':
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true' or os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))