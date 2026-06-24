from flask import request, jsonify, current_app, make_response
from flask_jwt_extended import (
    create_access_token, 
    jwt_required, 
    get_jwt_identity
)
from bson.objectid import ObjectId
from flask_mail import Message
from models import User, Attendance, FaceData, OTP, StudentProfile
import json
import base64
import os
import numpy as np

# Add this import and initialization for MongoDB
from flask import current_app
from pymongo import MongoClient

def get_db():
    # Adjust the connection string as needed for your environment
    client = MongoClient(current_app.config.get('MONGO_URI', 'mongodb://localhost:27017/'))
    return client['attendance_system']  # Use your actual database name

# Instead of initializing db at the module level, we'll access it within functions when needed

# Define send_verification_email function
def send_verification_email(email, otp):
    """
    Sends a verification email with the OTP to the specified email address.
    Returns True if sent successfully, False otherwise.
    """
    try:
        # You may need to adjust this to use your Flask-Mail setup
        msg = Message(
            subject="Your Verification Code",
            recipients=[email],
            body=f"Your verification code is: {otp}"
        )
        mail = current_app.extensions.get('mail')
        if mail is None:
            current_app.logger.error("Flask-Mail is not configured.")
            return False
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send verification email: {str(e)}")
        return False
        
from PIL import Image, ImageEnhance
import io
import cv2
import face_recognition


from bson import ObjectId, json_util
import uuid
import datetime
import jwt  # Add this import for PyJWT
import bcrypt  # Add this import for password hashing
import time  # Add this import for timing

# Custom JSON encoder to handle MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return json_util.default(obj)

# Improved debugging function to save problematic images
def save_debug_image(image_data, prefix="debug"):
    """Save an image for debugging purposes"""
    try:
        # Create debug directory if it doesn't exist
        debug_dir = os.path.join(os.getcwd(), 'debug_images')
        if not os.path.exists(debug_dir):
            os.makedirs(debug_dir)
            
        # Generate a unique filename
        filename = f"{prefix}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(debug_dir, filename)
        
        # Save the image
        with open(filepath, 'wb') as f:
            f.write(image_data)
            
        current_app.logger.info(f"Debug image saved to {filepath}")
        return filepath
    except Exception as e:
        current_app.logger.error(f"Failed to save debug image: {str(e)}")
        return None

def enhance_image_quality(image_np):
    """Enhance image quality for better face detection"""
    try:
        # Convert numpy array to PIL Image
        pil_image = Image.fromarray(image_np)
        
        # Enhance contrast and brightness
        enhancer = ImageEnhance.Contrast(pil_image)
        enhanced = enhancer.enhance(1.2)
        
        enhancer = ImageEnhance.Brightness(enhanced)
        enhanced = enhancer.enhance(1.1)
        
        # Convert back to numpy array
        return np.array(enhanced)
    except Exception as e:
        current_app.logger.error(f"Error enhancing image: {str(e)}")
        return image_np

def preprocess_image_for_face_detection(image_np, is_live_analysis=False):
    """Apply comprehensive preprocessing to improve face detection"""
    try:
        # Check if image is too large and resize if necessary
        height, width = image_np.shape[:2]
        max_dimension = 640  # Maximum dimension for processing
        
        if width > max_dimension or height > max_dimension:
            # Calculate new dimensions
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))
                
            # Resize image
            image_np = cv2.resize(image_np, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        # For live analysis, use a very simplified preprocessing pipeline
        if is_live_analysis:
            # Convert to grayscale
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            
            # Simple histogram equalization
            equalized = cv2.equalizeHist(gray)
            
            # Convert back to RGB
            equalized_rgb = cv2.cvtColor(equalized, cv2.COLOR_GRAY2RGB)
            
            # Free memory
            gray = None
            equalized = None
            
            return equalized_rgb, True
        
        # For non-live analysis, use more comprehensive preprocessing
        # First, enhance the image quality
        enhanced_image = enhance_image_quality(image_np)
        
        # Convert to grayscale for histogram equalization
        gray = cv2.cvtColor(enhanced_image, cv2.COLOR_RGB2GRAY)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        equalized = clahe.apply(gray)
        
        # Apply bilateral filter to reduce noise while keeping edges sharp
        filtered = cv2.bilateralFilter(equalized, 9, 75, 75)  # Reduced d parameter
        
        # Convert back to RGB
        equalized_rgb = cv2.cvtColor(filtered, cv2.COLOR_GRAY2RGB)
        
        # Free memory
        gray = None
        equalized = None
        filtered = None
        enhanced_image = None
        
        return equalized_rgb, True
    except Exception as e:
        current_app.logger.error(f"Error preprocessing image: {str(e)}")
        return image_np, False

def detect_face_orientation(face_landmarks):
    """
    Detect if a face is front-facing
    Returns: 'front' or 'unknown'
    """
    try:
        # Get key facial landmarks
        nose_tip = face_landmarks['nose_tip'][2]  # Center of nose tip
        left_eye = face_landmarks['left_eye'][0]   # Left corner of left eye
        right_eye = face_landmarks['right_eye'][3] # Right corner of right eye
        
        # Calculate face center
        face_center_x = (left_eye[0] + right_eye[0]) / 2
        
        # Calculate nose position relative to eye center
        nose_offset = nose_tip[0] - face_center_x
        
        # Calculate eye distance for normalization
        eye_distance = abs(right_eye[0] - left_eye[0])
        
        if eye_distance == 0:
            return 'unknown'
        
        # Normalize nose offset
        normalized_offset = nose_offset / eye_distance
        
        # Determine if face is front-facing (using a more lenient threshold)
        if abs(normalized_offset) < 0.2:  # Increased threshold for front detection
            return 'front'
        else:
            return 'unknown'
            
    except Exception as e:
        current_app.logger.error(f"Face orientation detection error: {str(e)}")
        return 'unknown'

def validate_face_image(base64_image, is_live_analysis=False, expected_orientation=None):
    """
    Validate face image with improved error handling, live analysis support, and orientation detection
    """
    try:
        # Check if image data is provided
        if not base64_image or len(base64_image) < 100:
            return False, "No valid image data provided", None
        
        # Decode base64 image with better error handling
        try:
            # Handle data URI scheme prefixes
            if base64_image.startswith('data:image'):
                if ',' in base64_image:
                    header, encoded = base64_image.split(',', 1)
                    image_data = base64.b64decode(encoded)
                else:
                    return False, "Invalid data URI format", None
            else:
                image_data = base64.b64decode(base64_image)
            
            if not is_live_analysis:
                current_app.logger.info(f"Base64 image decoded, size: {len(image_data)} bytes")
            
            # Validate image size - strict limits
            if len(image_data) < 1000:  # At least 1KB
                return False, "Image file is too small", None
                
            # Set a strict upper limit to prevent memory issues
            if len(image_data) > 500000:  # 500KB max
                return False, "Image file is too large, please use a smaller image", None
            
        except Exception as e:
            if not is_live_analysis:
                current_app.logger.error(f"Base64 decoding error: {str(e)}")
            return False, "Invalid base64 image format", None
        
        # Open and verify the image
        try:
            # Open with PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Check minimum image dimensions
            if image.size[0] < 100 or image.size[1] < 100:
                return False, "Image resolution is too low. Minimum 100x100 pixels required", None
                
            # Check maximum image dimensions to prevent memory issues
            if image.size[0] > 1280 or image.size[1] > 720:
                # Resize the image instead of rejecting
                try:
                    ratio = min(1280/image.size[0], 720/image.size[1])
                    new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                    image = image.resize(new_size, Image.LANCZOS)
                except Exception as resize_err:
                    current_app.logger.error(f"Image resize error: {str(resize_err)}")
                    return False, "Image dimensions are too large", None
            
            # Ensure image is in correct format for face_recognition
            if image.mode == 'RGBA':
                # Convert RGBA to RGB with white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array for face_recognition
            image_np = np.array(image)
            
        except Exception as e:
            if not is_live_analysis:
                current_app.logger.error(f"Image processing error: {str(e)}")
            return False, f"Could not process the image: {str(e)}", None
        
        # Apply preprocessing to improve face detection
        preprocessed_image, was_preprocessed = preprocess_image_for_face_detection(image_np, is_live_analysis)
        
        # Try face detection with multiple approaches
        face_locations = []
        detection_method = "none"
        
        try:
            # For live analysis, use simplified approach to improve performance
            if is_live_analysis:
                # Only try HOG on preprocessed image - fastest approach
                face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=1)
                detection_method = "hog_preprocessed"
                
                # If no faces found, try with original image but don't do additional processing
                if len(face_locations) == 0:
                    face_locations = face_recognition.face_locations(image_np, model="hog", number_of_times_to_upsample=1)
                    detection_method = "hog_original"
            else:
                # For non-live analysis, use more thorough approach
                # Method 1: Try HOG model with preprocessed image
                face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=1)
                if len(face_locations) > 0:
                    detection_method = "hog_preprocessed"
                    current_app.logger.info(f"Face detection successful with HOG (preprocessed): {len(face_locations)} faces")
                else:
                    # Method 2: Try HOG model with original image
                    face_locations = face_recognition.face_locations(image_np, model="hog", number_of_times_to_upsample=1)
                    if len(face_locations) > 0:
                        detection_method = "hog_original"
                        current_app.logger.info(f"Face detection successful with HOG (original): {len(face_locations)} faces")
                    else:
                        # Skip CNN model for better stability
                        pass
                        
        except Exception as e:
            if not is_live_analysis:
                current_app.logger.error(f"Face detection error: {str(e)}")
                save_debug_image(image_data, "face_detection_error")
            return False, f"Face detection failed: {str(e)}", None
        
        # Analyze detection results
        if len(face_locations) == 0:
            return False, "No face detected. Please ensure your face is visible and well-lit", None
        elif len(face_locations) > 1:
            if is_live_analysis:
                return False, "Multiple faces detected. Please ensure only one person is in frame", None
            else:
                return False, "Multiple faces detected. Please provide an image with only one face", None
        
        # Analyze face quality
        top, right, bottom, left = face_locations[0]
        face_width = right - left
        face_height = bottom - top
        image_width, image_height = image_np.shape[1], image_np.shape[0]
        
        # Calculate face size relative to image
        face_width_ratio = face_width / image_width
        face_height_ratio = face_height / image_height
        
        # For live analysis, be much more lenient with face size requirements
        min_face_ratio = 0.04 if is_live_analysis else 0.08
        
        if face_width_ratio < min_face_ratio or face_height_ratio < min_face_ratio:
            return False, "Face is too small in the image. Please move closer to the camera", None
        
        # Check if face is too large (likely too close)
        max_face_ratio = 0.95 if is_live_analysis else 0.7
        if face_width_ratio > max_face_ratio or face_height_ratio > max_face_ratio:
            return False, "Face is too close to camera. Please move back slightly", None
        
        # Detect face orientation if landmarks are needed and not in live analysis mode
        detected_orientation = None
        if expected_orientation and not is_live_analysis:
            try:
                # Use the same image that was used for successful detection
                encoding_image = preprocessed_image if detection_method.endswith('_preprocessed') else image_np
                face_landmarks = face_recognition.face_landmarks(encoding_image, [face_locations[0]])
                
                if len(face_landmarks) > 0:
                    detected_orientation = detect_face_orientation(face_landmarks[0])
                    
                    # Check if orientation matches expected (only for strict validation, not live analysis)
                    if detected_orientation != expected_orientation and detected_orientation != 'unknown':
                        orientation_messages = {
                            'front': 'Please face the camera directly'
                        }
                        expected_msg = orientation_messages.get(expected_orientation, f'Please position for {expected_orientation} view')
                        return False, f"Wrong face orientation detected. {expected_msg}", detected_orientation
                        
            except Exception as e:
                if not is_live_analysis:
                    current_app.logger.error(f"Face landmarks detection error: {str(e)}")
        
        # For live analysis, skip face encoding generation to improve performance
        if is_live_analysis:
            success_message = "Face validation successful"
            if detected_orientation:
                success_message += f" ({detected_orientation} orientation detected)"
            return True, success_message, detected_orientation
        
        # For non-live analysis, generate face encoding to ensure face quality
        try:
            # Use the same image that was used for successful detection
            encoding_image = preprocessed_image if detection_method.endswith('_preprocessed') else image_np
            face_encoding = face_recognition.face_encodings(encoding_image, [face_locations[0]], num_jitters=1)
            
            if len(face_encoding) == 0:
                return False, "Could not generate face encoding. Please provide a clearer photo with better lighting", detected_orientation
            
            current_app.logger.info(f"Face encoding generated successfully using {detection_method}")
            
        except Exception as e:
            current_app.logger.error(f"Face encoding error: {str(e)}")
            return False, f"Face encoding failed: {str(e)}", detected_orientation
        
        # Additional quality checks for non-live analysis
        face_aspect_ratio = face_width / face_height
        if face_aspect_ratio < 0.6 or face_aspect_ratio > 1.4:
            return False, "Face appears to be at an extreme angle. Please face the camera more directly", detected_orientation
        
        success_message = "Face validation successful"
        if detected_orientation:
            success_message += f" ({detected_orientation} orientation detected)"
        else:
            success_message += f" (detected using {detection_method})"
            
        # Explicitly trigger garbage collection to free memory
        import gc
        gc.collect()
        
        return True, success_message, detected_orientation
        
    except Exception as e:
        if not is_live_analysis:
            current_app.logger.error(f"Face validation error: {str(e)}")
            
        # Explicitly trigger garbage collection to free memory
        import gc
        gc.collect()
        
        return False, f"Error processing image: {str(e)}", None

def register_routes(app):
    # Helper function for serializing MongoDB responses
    def mongo_to_json(data):
        return json.loads(json_util.dumps(data))
    
    # Endpoint for real-time face analysis
    @app.route('/api/analyze-face', methods=['POST', 'OPTIONS'])
    def analyze_face():
        if request.method == 'OPTIONS':
            # Handle CORS preflight request
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response
            
        try:
            # Start timing the request
            start_time = time.time()
            
            # Get image data from request
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data provided'}), 400
            
            # Determine if this is a live analysis request
            is_live = data.get('is_live_analysis', True)
            expected_orientation = data.get('expected_orientation', None)
            
            # Set a strict timeout for the entire operation
            timeout_seconds = 5  # 5 seconds timeout for live analysis
            end_time = start_time + timeout_seconds
            
            # Check if the image data is too large (could cause timeout/crash)
            # More strict size limit - 100KB instead of 150KB
            if len(data['image']) > 100000:  # ~100KB limit for live analysis
                # If image is too large, resize it on the server
                try:
                    # Extract the base64 part
                    if ',' in data['image']:
                        header, encoded = data['image'].split(',', 1)
                    else:
                        encoded = data['image']
                        header = 'data:image/jpeg;base64'
                    
                    # Decode, resize, and re-encode
                    image_data = base64.b64decode(encoded)
                    img = Image.open(io.BytesIO(image_data))
                    
                    # Calculate new dimensions (max 480x360 for better performance)
                    width, height = img.size
                    if width > 480 or height > 360:
                        ratio = min(480/width, 360/height)
                        new_size = (int(width * ratio), int(height * ratio))
                        img = img.resize(new_size, Image.LANCZOS)
                    
                    # Re-encode with lower quality
                    buffer = io.BytesIO()
                    img.save(buffer, format='JPEG', quality=80)
                    resized_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                    data['image'] = f"{header},{resized_b64}"
                    
                    # Free memory explicitly
                    buffer.close()
                    img = None
                    
                except Exception as e:
                    # If resize fails, continue with original image
                    current_app.logger.warning(f"Image resize failed: {str(e)}")
            
            # For live analysis, always skip orientation detection to improve performance
            if is_live:
                skip_orientation = True
                expected_orientation = None
            else:
                skip_orientation = data.get('skip_orientation', False)
            
            # Check if we're about to timeout
            if time.time() > end_time:
                return jsonify({
                    'is_valid': False,
                    'message': 'Analysis timeout - image processing took too long',
                    'timestamp': datetime.datetime.now().isoformat(),
                    'detected_orientation': None,
                    'processing_time_ms': int((time.time() - start_time) * 1000)
                }), 200
            
            # Validate the face image with orientation detection
            is_valid, message, detected_orientation = validate_face_image(
                data['image'], 
                is_live_analysis=is_live,
                expected_orientation=expected_orientation
            )
            
            if not is_live:
                current_app.logger.info(f"Face analysis result: {is_valid}, message: {message}, is_live: {is_live}, orientation: {detected_orientation}")
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Return the validation result with additional metadata for live analysis
            response_data = {
                'is_valid': is_valid,
                'message': message,
                'timestamp': datetime.datetime.now().isoformat(),
                'detected_orientation': detected_orientation,
                'processing_time_ms': int(processing_time * 1000)
            }
            
            # Add confidence level and quality score for live analysis
            if is_live:
                response_data['confidence'] = 'high' if is_valid else 'low'
                
                # Add orientation match status
                if expected_orientation and detected_orientation:
                    response_data['orientation_match'] = detected_orientation == expected_orientation
                    response_data['expected_orientation'] = expected_orientation
            
            # Explicitly trigger garbage collection to free memory
            import gc
            gc.collect()
            
            return jsonify(response_data), 200
            
        except Exception as e:
            current_app.logger.error(f"Error analyzing face: {str(e)}")
            
            # Explicitly trigger garbage collection to free memory
            import gc
            gc.collect()
            
            return jsonify({
                'error': f'Error analyzing face: {str(e)}',
                'is_valid': False,
                'message': 'Analysis failed due to server error',
                'detected_orientation': None
            }), 500
    
    # Endpoint for final face validation (when capturing/saving)
    @app.route('/api/validate-face-final', methods=['POST', 'OPTIONS'])
    def validate_face_final():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response
            
        try:
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data provided'}), 400
            
            expected_orientation = data.get('expected_orientation', None)
            
            # Use more strict validation for final capture
            is_valid, message, detected_orientation = validate_face_image(
                data['image'], 
                is_live_analysis=False,
                expected_orientation=expected_orientation
            )
            
            current_app.logger.info(f"Final face validation result: {is_valid}, message: {message}, orientation: {detected_orientation}")
            
            return jsonify({
                'is_valid': is_valid,
                'message': message,
                'detected_orientation': detected_orientation,
                'timestamp': datetime.datetime.now().isoformat()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error in final face validation: {str(e)}")
            return jsonify({
                'error': f'Validation error: {str(e)}',
                'is_valid': False,
                'message': 'Final validation failed',
                'detected_orientation': None
            }), 500
    
    # CORS preflight response
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:8080'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    # Auth routes
    @app.route('/auth/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            
            app.logger.debug('Registration request data: %s', data)
            
            # Check if required fields are present
            if not all(k in data for k in ('name', 'email', 'password')):
                app.logger.error('Missing required fields in registration request')
                return jsonify({'error': 'Missing required fields'}), 400
            
            # Get database connection
            db = get_db()
            app.logger.debug('Database connection established')
            
            # Check if user already exists - use direct MongoDB query to ensure correct database
            existing_user = db.users.find_one({'email': data['email']})
            if existing_user:
                app.logger.debug('User with email %s already exists', data['email'])
                return jsonify({'error': 'User already exists'}), 409
            
            # Create user (default role is 'student')
            role = data.get('role', 'student')
            if role not in ['student', 'admin']:
                role = 'student'  # Default to student if invalid role
                
            app.logger.debug('Creating user with role: %s', role)
                
            # Create the user_data dictionary explicitly to avoid any variable name confusion
            user_data = {
                'name': data['name'],
                'email': data['email'],
                'phone_number': data.get('phone_number'),
                'role': role,
                'is_verified': False  # Adding this explicitly for clarity
            }
            
            # Use direct MongoDB insert for user creation
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
            user_data['password'] = hashed_password.decode('utf-8')
            user_data['created_at'] = datetime.datetime.now()
            user_data['updated_at'] = datetime.datetime.now()
            
            app.logger.debug('Inserting user into database')
            # Make sure we're using user_data, not user
            result = db.users.insert_one(user_data)
            user_id = result.inserted_id
            app.logger.debug('User created with ID: %s', user_id)
            
            try:
                # Generate OTP for email verification
                app.logger.debug('Generating OTP for email: %s', data['email'])
                otp = OTP.generate(data['email'])
                
                # Send verification email
                app.logger.debug('Sending verification email')
                send_verification_email(data['email'], otp)
            except Exception as e:
                app.logger.error('Failed to send verification email: %s', str(e))
                # Continue anyway - don't fail the registration if email fails
                
            # Clean user data for response
            response_data = {
                '_id': str(user_id),
                'name': user_data['name'],
                'email': user_data['email'],
                'role': user_data['role'],
                'is_verified': False
            }
            
            app.logger.debug('Registration successful for email: %s', data['email'])
            return jsonify({
                'status': 'success',
                'message': 'Registration initiated. Please verify your email.',
                'user': response_data,
                'require_verification': True
            }), 201
        except Exception as e:
            app.logger.error('Registration failed with error: %s', str(e))
            return jsonify({'error': f'Registration failed: {str(e)}'}), 500

    @app.route('/auth/verify-otp', methods=['POST'])
    def verify_otp():
        data = request.get_json()
        
        if not all(k in data for k in ('email', 'otp')):
            return jsonify({'error': 'Missing email or OTP'}), 400
        
        # Verify OTP
        if not OTP.verify(data['email'], data['otp']):
            return jsonify({'error': 'Invalid or expired OTP'}), 400
        
        # Get the user
        user = User.find_by_email(data['email'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user as verified
        db = get_db()
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'is_verified': True, 'updated_at': datetime.datetime.now()}}
        )
        
        # Create access token
        access_token = create_access_token(identity=str(user['_id']))
        
        # Remove password from response
        user_copy = dict(user)
        user_copy.pop('password', None)
        
        # Determine redirect URL based on user role
        redirect_url = '/admin/dashboard' if user['role'] == 'admin' else '/student/dashboard'
        
        return jsonify({
            'message': 'Email verified successfully',
            'status': 'verification_successful',
            'access_token': access_token,
            'user': mongo_to_json(user_copy),
            'redirect': redirect_url
        }), 200

    @app.route('/auth/resend-otp', methods=['POST'])
    def resend_otp():
        data = request.get_json()
        
        if 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        # Check if user exists
        user = User.find_by_email(data['email'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate new OTP
        otp = OTP.generate(data['email'])
        
        # Send verification email
        if not send_verification_email(data['email'], otp):
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        return jsonify({
            'message': 'Verification code sent successfully'
        }), 200

    @app.route('/auth/login', methods=['POST'])
    def login():
        data = request.get_json()
        
        # Check if required fields are present
        if not all(k in data for k in ('email', 'password')):
            return jsonify({'error': 'Missing email or password'}), 400
        
        # Find user by email
        user = User.find_by_email(data['email'])
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        if not User.verify_password(user['password'], data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if email is verified
        if not user.get('is_verified', False):
            # Generate new OTP
            otp = OTP.generate(data['email'])
            
            # Send verification email
            send_verification_email(data['email'], otp)
            
            # Return special status code for unverified emails
            # This allows the frontend to show the OTP verification form
            return jsonify({
                'status': 'unverified_email',
                'message': 'Email not verified. A verification code has been sent.',
                'email': data['email'],
                'require_verification': True
            }), 200  # Changed from 403 to 200 with special status
        
        # Create access token
        access_token = create_access_token(identity=str(user['_id']))
        
        # Remove password from response
        user.pop('password', None)
        
        # Determine redirect URL based on user role
        redirect_url = '/admin/dashboard' if user['role'] == 'admin' else '/student/dashboard'
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': mongo_to_json(user),
            'redirect': redirect_url
        }), 200

    @app.route('/auth/profile', methods=['GET'])
    @jwt_required()
    def get_profile():
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove password from response
        user.pop('password', None)
        
        return jsonify(mongo_to_json(user)), 200

    @app.route('/auth/forgot-password', methods=['POST'])
    def forgot_password():
        data = request.get_json()
        
        if 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        # Check if user exists
        user = User.find_by_email(data['email'])
        if not user:
            return jsonify({'error': 'No account found with this email address'}), 404
        
        # Generate OTP for password reset
        otp = OTP.generate(data['email'])
        
        # Send verification email
        if not send_verification_email(data['email'], otp):
            return jsonify({'error': 'Failed to send verification email'}), 500
            
        # Store the password reset request
        db = get_db()
        db.password_resets.update_one(
            {'email': data['email']},
            {'$set': {
                'otp': otp,
                'created_at': datetime.datetime.now(),
                'expires_at': datetime.datetime.now() + datetime.timedelta(minutes=15)
            }},
            upsert=True
        )
        
        return jsonify({
            'message': 'Password reset OTP sent successfully',
            'email': data['email']
        }), 200

    @app.route('/auth/verify-reset-otp', methods=['POST'])
    def verify_reset_otp():
        data = request.get_json()
        
        if not all(k in data for k in ('email', 'otp')):
            return jsonify({'error': 'Missing email or OTP'}), 400
        
        # Verify OTP
        if not OTP.verify(data['email'], data['otp']):
            return jsonify({'error': 'Invalid or expired OTP'}), 400
        
        # Check if the user exists
        user = User.find_by_email(data['email'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate a temporary token for password reset
        reset_token = str(uuid.uuid4())
        
        # Store the reset token in database
        db = get_db()
        db.password_resets.update_one(
            {'email': data['email']},
            {'$set': {
                'reset_token': reset_token,
                'token_created_at': datetime.datetime.now(),
                'token_expires_at': datetime.datetime.now() + datetime.timedelta(hours=1)
            }}
        )
        
        return jsonify({
            'message': 'OTP verified successfully',
            'reset_token': reset_token
        }), 200
        
    @app.route('/auth/reset-password', methods=['POST'])
    def reset_password():
        data = request.get_json()
        
        if not all(k in data for k in ('token', 'password')):
            return jsonify({'error': 'Missing token or password'}), 400
        
        # Find the password reset request
        db = get_db()
        reset_request = db.password_resets.find_one({
            'reset_token': data['token'],
            'token_expires_at': {'$gt': datetime.datetime.now()}
        })
        
        if not reset_request:
            return jsonify({'error': 'Invalid or expired token'}), 400
        
        # Get the user associated with this reset request
        user = User.find_by_email(reset_request['email'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Hash the new password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Update the user's password
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'password': hashed_password.decode('utf-8'),
                'updated_at': datetime.datetime.now()
            }}
        )
        
        # Delete the password reset request
        db.password_resets.delete_one({'reset_token': data['token']})
        
        return jsonify({
            'message': 'Password has been reset successfully'
        }), 200

    # Student routes
    @app.route('/student/all', methods=['GET'])
    @jwt_required()
    def get_all_students():
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403
            
            # Get all students (users with role 'student')
            students = User.get_all_students()
            
            # Remove passwords from response
            for student in students:
                student.pop('password', None)
            
            # Create a dictionary to map user_id to student data for easier merging
            students_dict = {str(student['_id']): student for student in students}
            
            # Get all student profiles from student_profiles collection
            db = get_db()
            profiles = list(db.student_profiles.find())
            
            # Merge profile data with student data
            for profile in profiles:
                # Convert ObjectId to string for key matching
                student_id = str(profile['user_id'])
                
                # If we have this student in our dictionary, add profile data
                if student_id in students_dict:
                    # Add profile fields to student data
                    students_dict[student_id]['profile_id'] = str(profile['_id'])
                    students_dict[student_id]['has_profile'] = True
                    students_dict[student_id]['college_name'] = profile.get('college_name')
                    students_dict[student_id]['course'] = profile.get('course')
                    students_dict[student_id]['year_of_study'] = profile.get('year_of_study')
                    students_dict[student_id]['registration_number'] = profile.get('registration_number')
                    students_dict[student_id]['profile_photo'] = profile.get('profile_photo')
                    students_dict[student_id]['is_approved'] = profile.get('is_approved', False)
                    
                    # Check if face data exists and is complete
                    has_face_data = False
                    if 'face_images' in profile and isinstance(profile['face_images'], dict):
                        has_face_data = 'front' in profile['face_images'] and profile['face_images']['front']
                    
                    students_dict[student_id]['has_face_data'] = has_face_data
            
            # For students without profiles, add default values
            for student_id, student in students_dict.items():
                if 'has_profile' not in student:
                    student['has_profile'] = False
                    student['has_face_data'] = False
                    student['is_approved'] = False
            
            # Return the list of merged student data
            return jsonify(mongo_to_json(list(students_dict.values()))), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching all students: {str(e)}")
            return jsonify({'error': f'Error fetching student data: {str(e)}'}), 500

    # Attendance routes
    @app.route('/attendance/mark', methods=['POST'])
    @jwt_required()
    def mark_attendance():
        user_id = get_jwt_identity()
        status = request.json.get('status', 'present')
        
        attendance_id = Attendance.mark_attendance(user_id, status)
        
        return jsonify({
            'message': 'Attendance marked successfully',
            'attendance_id': str(attendance_id)
        }), 201

    @app.route('/student/attendance', methods=['GET'])
    @jwt_required()
    def get_student_attendance():
        try:
            user_id = get_jwt_identity()
            
            # Check if this is a request for monthly attendance
            month = request.args.get('month')
            year = request.args.get('year')
            
            # If month and year are provided, return monthly attendance with calendar
            if month or year:
                # Default to current month/year if not provided
                current_date = datetime.datetime.now()
                month = int(month) if month else current_date.month
                year = int(year) if year else current_date.year
                
                # Generate date range for the specified month
                import calendar
                _, last_day = calendar.monthrange(year, month)
                month_str = str(month).zfill(2)
                
                start_date = f"{year}-{month_str}-01"
                end_date = f"{year}-{month_str}-{last_day}"
                
                # Query the attendance collection for the student's records in that month
                attendance_records = list(Attendance.collection().find({
                    'student_id': ObjectId(user_id),
                    'date': {'$gte': start_date, '$lte': end_date}
                }).sort('date', 1))
                
                # Format the records
                formatted_records = []
                for record in attendance_records:
                    record['_id'] = str(record['_id'])
                    record['student_id'] = str(record['student_id'])
                    
                    # Format timestamps
                    if 'created_at' in record and isinstance(record['created_at'], datetime.datetime):
                        record['time'] = record['created_at'].strftime('%H:%M:%S')
                        record['created_at'] = record['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    if 'updated_at' in record and isinstance(record['updated_at'], datetime.datetime):
                        record['updated_at'] = record['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    formatted_records.append(record)
                
                # Get student info
                student = User.find_by_id(user_id)
                student_name = student['name'] if student else 'Unknown Student'
                
                # Create calendar days with attendance status


                # Generate calendar data for the month



                # Generate calendar data for the month

                calendar_days = []

                current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')

                end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')

                today_date = datetime.datetime.now().date()

                

                records_list = locals().get('formatted_records', locals().get('attendance_records', []))

                attendance_by_date = {record.get('date', ''): record for record in records_list if 'date' in record}

                

                # Registration date logic

                registration_date = student.get('created_at') if student else datetime.date.min

                if isinstance(registration_date, str):

                    try:

                        import dateutil.parser

                        registration_date = dateutil.parser.parse(registration_date).date()

                    except:

                        registration_date = datetime.date.min

                elif isinstance(registration_date, datetime.datetime):

                    registration_date = registration_date.date()

                else:

                    registration_date = datetime.date.min

                    

                working_days_count = 0

                present_count = 0

                late_count = 0

                absent_count = 0

                holiday_count = 0

                

                db = get_db()

                holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})

                holiday_dates = {h['date']: h['name'] for h in holidays_cursor}

                

                off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})

                off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

                

                while current_date <= end_date_obj:

                    date_str = current_date.strftime('%Y-%m-%d')

                    is_past_or_today = current_date.date() <= today_date

                    is_before_registration = current_date.date() < registration_date

                    weekday = current_date.weekday()

                    

                    is_holiday = date_str in holiday_dates

                    is_off_day = weekday in off_weekdays

                    

                    status = 'unknown'

                    has_records = date_str in attendance_by_date

                    

                    if is_before_registration:
                        status = 'not_enrolled'
                    elif has_records:
                        status = attendance_by_date[date_str]
                        if status == 'present':
                            present_count += 1
                        elif status == 'late':
                            late_count += 1
                        elif status == 'absent':
                            absent_count += 1
                        working_days_count += 1
                    elif is_holiday or is_off_day:
                        if is_past_or_today or is_holiday:
                            status = 'holiday'
                            holiday_count += 1
                    elif is_past_or_today:
                        status = 'absent'
                        absent_count += 1
                        working_days_count += 1

                        

                    calendar_days.append({

                        'date': date_str,

                        'day': current_date.day,

                        'weekday': current_date.strftime('%a'),

                        'status': status,

                        'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)

                    })

                    current_date += datetime.timedelta(days=1)

                    

                total_records = working_days_count

                attendance_percentage = 0

                if working_days_count > 0:

                    attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)


                response_data = {
                    'records': formatted_records,
                    'statistics': {
                        'total_days': total_records,
                        'present': present_count,
                        'absent': absent_count,
                        'late': late_count,
                        'holidays': holiday_count,
                        'percentage': attendance_percentage
                    }
                }
                
                # Use mongo_to_json helper to ensure all MongoDB objects are properly serialized
                return jsonify(mongo_to_json(response_data)), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student attendance: {str(e)}")
            return jsonify({'error': f'Error fetching attendance records: {str(e)}'}), 500

    @app.route('/attendance/reports', methods=['GET'])
    @jwt_required()
    def get_attendance_reports():
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        all_attendance = Attendance.get_all_attendance()
        
        return jsonify(mongo_to_json(all_attendance)), 200

    # Face recognition routes
    @app.route('/api/attendance/recognize-face', methods=['POST', 'OPTIONS'])
    @jwt_required()
    def recognize_face_for_attendance():
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
        
        if user['role'] != 'admin':
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
            
            # Find face locations in the image
            face_locations = face_recognition.face_locations(image_np, model="hog")
            
            if len(face_locations) == 0:
                return jsonify({
                    'recognized': False,
                    'message': 'No face detected in the image'
                }), 200

            if len(face_locations) > 1:
                return jsonify({
                    'recognized': False,
                    'message': 'Multiple faces detected. Please ensure only one student is in the frame'
                }), 200
    
            # Get the face encoding
            face_encoding = face_recognition.face_encodings(image_np, face_locations)[0]
            
            # Find matching student profiles with face images
            student_profiles = list(StudentProfile.collection().find({
                'is_approved': True,
                'face_images.front': {'$exists': True}
            }))
            
            if not student_profiles:
                return jsonify({
                    'recognized': False,
                    'message': 'No registered students with face data found'
                }), 200
    
            # Compare face encoding with stored face images of all registered students
            best_match = None
            best_match_distance = 1.0  # Lower is better, threshold is typically 0.6
            best_match_profile = None
            
            for profile in student_profiles:
                try:
                    # Get the stored face images for comparison
                    if 'face_images' in profile and 'front' in profile['face_images']:
                        # Convert stored base64 image to face encoding
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
                            
                            # Compare with current face encoding
                            distance = face_recognition.face_distance([stored_face_encoding], face_encoding)[0]
                            
                            # Update best match if this one is better
                            if distance < best_match_distance:
                                best_match_distance = distance
                                best_match_profile = profile
                except Exception as e:
                    current_app.logger.error(f"Error comparing face: {str(e)}")
                    continue
            
            # Check if we found a good match (threshold typically 0.6, but can be adjusted)
            match_threshold = 0.6
            if best_match_profile and best_match_distance < match_threshold:
                # Get student details
                student = User.find_by_id(best_match_profile['user_id'])
                if not student:
                    return jsonify({
                        'is_recognized': False,
                        'message': 'Error finding student data'
                    }), 500
                
                # Check if attendance already marked for today
                attendance_date = data.get('date') or datetime.datetime.now().strftime('%Y-%m-%d')
                existing_attendance = StudentProfile.collection().find_one({
                    'student_id': ObjectId(best_match_profile['user_id']),
                    'date': attendance_date
                })
                
                student.pop('password', None)
                
                return jsonify({
                    'recognized': True,
                    'student': {
                        '_id': str(student['_id']),
                        'name': student['name'],
                        'email': student['email'],
                        'registration_number': best_match_profile.get('registration_number', 'Unknown'),
                        'profile_photo': best_match_profile.get('profile_photo', None)
                    },
                    'already_marked': existing_attendance is not None
                }), 200
            else:
                return jsonify({
                    'recognized': False,
                    'message': 'No matching student found in database',
                    'confidence': 1.0 - best_match_distance if best_match_profile else 0.0
                }), 200
            
        except Exception as e:
            current_app.logger.error(f"Face recognition error: {str(e)}")
            return jsonify({
                'recognized': False,
                'message': f'Error processing image: {str(e)}'
            }), 500
    
    @app.route('/api/attendance/mark', methods=['POST'])
    @jwt_required()
    def mark_student_attendance():
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized. Only admin can mark attendance'}), 403
        
        data = request.get_json()
        
        # Validate request data
        if not data or 'student_id' not in data:
            return jsonify({'error': 'Missing student ID'}), 400
        
        student_id = data['student_id']
        date = data.get('date') or datetime.datetime.now().strftime('%Y-%m-%d')
        status = data.get('status', 'present')
        
        # Check if student exists
        student = User.find_by_id(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if attendance already exists for this date
        existing_attendance = Attendance.collection().find_one({
            'student_id': ObjectId(student_id),
            'date': date
        })
        
        if existing_attendance:
            # Update existing attendance
            Attendance.collection().update_one(
                {'_id': existing_attendance['_id']},
                {
                    '$set': {
                        'status': status,
                        'marked_by': ObjectId(user_id),
                        'updated_at': datetime.datetime.now()
                    }
                }
            )
            
            return jsonify({
                'message': 'Attendance updated successfully',
                'attendance': {
                    '_id': str(existing_attendance['_id']),
                    'student_id': student_id,
                    'date': date,
                    'status': status
                }
            }), 200
        else:
            # Create new attendance record
            result = Attendance.collection().insert_one({
                'student_id': ObjectId(student_id),
                'date': date,
                'status': status,
                'marked_by': ObjectId(user_id),
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            })
            
            return jsonify({
                'message': 'Attendance marked successfully',
                'attendance': {
                    '_id': str(result.inserted_id),
                    'student_id': student_id,
                    'date': date,
                    'status': status
                }
            }), 201
    
    @app.route('/api/admin/attendance/logs', methods=['GET'])
    @jwt_required()
    def get_attendance_logs():
        try:
            # Log information about the request
            current_app.logger.debug(f"Request to fetch attendance logs")
            current_app.logger.debug(f"Request args: {request.args}")
            
            # Extract query parameters
            date = request.args.get('date')
            student_id = request.args.get('student_id')
            course_id = request.args.get('course_id')
            
            current_app.logger.debug(f"Filters - date: {date}, student_id: {student_id}, course_id: {course_id}")
            
            # Build query filter
            query = {}
            if date:
                query['date'] = date
            
            # Only add ObjectId filters if they are valid
            if student_id:
                try:
                    # Ensure student_id is not 'None' as a string
                    if student_id != 'None' and student_id.strip():
                        query['student_id'] = ObjectId(student_id)
                except Exception as e:
                    current_app.logger.error(f"Invalid student_id: {student_id}, Error: {str(e)}")
                    # Skip this filter if invalid
            
            if course_id:
                try:
                    # Ensure course_id is not 'None' as a string
                    if course_id != 'None' and course_id.strip():
                        query['course_id'] = ObjectId(course_id)
                except Exception as e:
                    current_app.logger.error(f"Invalid course_id: {course_id}, Error: {str(e)}")
                    # Skip this filter if invalid
            
            current_app.logger.debug(f"MongoDB query: {query}")
            
            # Get attendance records from database
            attendance_records = list(Attendance.collection().find(query).sort('date', -1))
            current_app.logger.debug(f"Found {len(attendance_records)} attendance records")
            
            # Format records for response
            formatted_records = []
            
            for record in attendance_records:
                try:
                    formatted_record = {
                        '_id': str(record['_id']),
                        'date': record.get('date', ''),
                        'status': record.get('status', 'unknown')
                    }
                    
                    # Add student details if available
                    if 'student_id' in record:
                        try:
                            student_id_str = str(record['student_id'])
                            formatted_record['student_id'] = student_id_str
                            
                            # Get student details
                            student = User.find_by_id(student_id_str)
                            if student:
                                # Get student profile for photo
                                try:
                                    profile = StudentProfile.collection().find_one({'user_id': ObjectId(student_id_str)})
                                except Exception as e:
                                    current_app.logger.error(f"Error finding student profile: {str(e)}")
                                    profile = None
                                
                                formatted_record['student'] = {
                                    '_id': str(student['_id']),
                                    'name': student.get('name', 'Unknown'),
                                    'email': student.get('email', ''),
                                    'profile_photo': profile.get('profile_photo') if profile else None,
                                    'course': profile.get('course', 'Unknown') if profile else 'Unknown'
                                }
                                formatted_record['course_name'] = profile.get('course', 'Unknown') if profile else 'Unknown'
                            else:
                                # Provide placeholder if student not found
                                formatted_record['student'] = {
                                    '_id': student_id_str,
                                    'name': 'Unknown Student',
                                    'email': '',
                                    'profile_photo': None
                                }
                        except Exception as e:
                            current_app.logger.error(f"Error processing student data: {str(e)}")
                            # Continue with basic record data
                    
                    # Format timestamps
                    if 'created_at' in record and isinstance(record['created_at'], datetime.datetime):
                        formatted_record['time'] = record['created_at'].strftime('%H:%M:%S')
                        formatted_record['created_at'] = record['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    if 'updated_at' in record and isinstance(record['updated_at'], datetime.datetime):
                        formatted_record['updated_at'] = record['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Add marked_by details if available
                    if 'marked_by' in record and record['marked_by']:
                        try:
                            marker_id = str(record['marked_by'])
                            formatted_record['marked_by'] = marker_id
                            
                            marker = User.find_by_id(marker_id)
                            if marker:
                                formatted_record['marked_by_user'] = {
                                    '_id': str(marker['_id']),
                                    'name': marker.get('name', 'Unknown User')
                                }
                        except Exception as e:
                            current_app.logger.error(f"Error processing marker data: {str(e)}")
                    
                    # Add course details if available
                    if 'course_id' in record and record['course_id']:
                        try:
                            course_id_str = str(record['course_id'])
                            formatted_record['course_id'] = course_id_str
                            
                            # Instead of looking up courses, just include the ID
                            # We'll fetch course info from the Student Profile instead
                            # This is safer than assuming a courses collection exists
                            formatted_record['course_name'] = 'Unknown Course'
                            
                            # Try to get course name from student profile if available
                            if 'student' in formatted_record and formatted_record['student']['_id']:
                                try:
                                    student_id = formatted_record['student']['_id']
                                    profile = StudentProfile.collection().find_one({'user_id': ObjectId(student_id)})
                                    if profile and 'course' in profile:
                                        formatted_record['course_name'] = profile['course']
                                except Exception as e:
                                    current_app.logger.error(f"Error getting course from profile: {str(e)}")
                        except Exception as e:
                            current_app.logger.error(f"Error processing course data: {str(e)}")
                    
                    formatted_records.append(formatted_record)
                    
                except Exception as e:
                    current_app.logger.error(f"Error formatting attendance record: {str(e)}")
                    # Skip this record if there's an error
            
            # Return the formatted records
            return jsonify({
                'success': True, 
                'records': formatted_records
            })
        
        except Exception as e:
            error_msg = str(e)
            current_app.logger.error(f"Error fetching attendance logs: {error_msg}")
            return jsonify({
                'success': False, 
                'message': 'Failed to fetch attendance logs',
                'error': error_msg
            }), 500
    
    # This endpoint has been moved to a more structured location below and renamed
    # to get_student_details_plural

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Server error'}), 500

    # Setup CORS headers
    def setup_cors(app):
        @app.after_request
        def after_request(response):
            # Handle CORS headers for all responses
            origin = request.headers.get('Origin', 'http://localhost:8080')
            # Use set instead of add to prevent duplicates
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Cache-Control,Pragma,Expires'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response 

    setup_cors(app)
    
    # Student profile routes
    @app.route('/student/profile', methods=['GET'])
    @jwt_required()
    def get_student_profile():
        try:
            # Get the current user's ID
            user_id = get_jwt_identity()
            
            # Get the user data
            user = User.find_by_id(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
                
            # Remove password from response
            user.pop('password', None)
            
            # Get the student profile if it exists
            profile = StudentProfile.collection().find_one({'user_id': ObjectId(user_id)})
            
            # Return the response
            return jsonify({
                'user': mongo_to_json(user),
                'profile': mongo_to_json(profile) if profile else None,
                'has_profile': profile is not None,
                'is_approved': profile.get('is_approved', False) if profile else False
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student profile: {str(e)}")
            return jsonify({'error': f'Error fetching student profile: {str(e)}'}), 500
    
    @app.route('/student/profile', methods=['POST'])
    @jwt_required()
    def create_student_profile():
        try:
            # Get the current user's ID
            user_id = get_jwt_identity()
            
            # Get the request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
                
            # Validate required fields
            required_fields = ['college_name', 'course', 'year_of_study', 'registration_number']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Create the profile
            profile_data = {
                'user_id': ObjectId(user_id),
                'college_name': data['college_name'],
                'course': data['course'],
                'year_of_study': data['year_of_study'],
                'registration_number': data['registration_number'],
                'is_approved': False,  # Default to not approved
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            
            # Add optional fields if present
            if 'profile_photo' in data:
                profile_data['profile_photo'] = data['profile_photo']
                
            if 'face_images' in data:
                profile_data['face_images'] = data['face_images']
            
            # Insert into database
            result = StudentProfile.collection().insert_one(profile_data)
            
            # Return the created profile
            return jsonify({
                'message': 'Profile created successfully. Pending admin approval.',
                'profile_id': str(result.inserted_id)
            }), 201
            
        except Exception as e:
            current_app.logger.error(f"Error creating student profile: {str(e)}")
            return jsonify({'error': f'Error creating student profile: {str(e)}'}), 500
    
    @app.route('/student/profile', methods=['PUT'])
    @jwt_required()
    def update_student_profile():
        try:
            # Get the current user's ID
            user_id = get_jwt_identity()
            
            # Get the request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
                
            # Get the existing profile
            profile = StudentProfile.collection().find_one({'user_id': ObjectId(user_id)})
            if not profile:
                return jsonify({'error': 'Profile not found. Please create a profile first.'}), 404
            
            # Prepare update data
            update_data = {
                'updated_at': datetime.datetime.now(),
                'is_approved': False  # Reset approval status when profile is updated
            }
            
            # Add fields to update if present
            fields_to_update = ['college_name', 'course', 'year_of_study', 'registration_number', 'profile_photo', 'face_images']
            for field in fields_to_update:
                if field in data:
                    update_data[field] = data[field]
            
            # Update the profile
            StudentProfile.collection().update_one(
                {'_id': profile['_id']},
                {'$set': update_data}
            )
            
            return jsonify({
                'message': 'Profile updated successfully. Pending admin approval.'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating student profile: {str(e)}")
            return jsonify({'error': f'Error updating student profile: {str(e)}'}), 500
    
    # Admin routes for student profiles without the /admin prefix
    @app.route('/admin/student-profiles', methods=['GET'])
    @jwt_required()
    def get_admin_student_profiles_without_prefix():
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access this resource'}), 403
            
            # Get approved filter from query params
            approved = request.args.get('approved')
            query = {}
            
            # If approved filter is provided
            if approved is not None:
                is_approved = approved.lower() == 'true'
                query['is_approved'] = is_approved
            
            # Get all student profiles
            profiles = list(StudentProfile.collection().find(query))
            
            # Format response
            result = []
            for profile in profiles:
                # Convert ObjectId to string
                profile['_id'] = str(profile['_id'])
                profile['user_id'] = str(profile['user_id'])
                
                # Get user info
                user = User.find_by_id(profile['user_id'])
                if user:
                    user.pop('password', None)
                    user['_id'] = str(user['_id'])
                
                # Format timestamps
                if 'created_at' in profile:
                    profile['created_at'] = profile['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if 'updated_at' in profile:
                    profile['updated_at'] = profile['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                result.append({
                    'profile': profile,
                    'user': user
                })
            
            return jsonify(result), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student profiles: {str(e)}")
            return jsonify({'error': f'Error fetching student profiles: {str(e)}'}), 500
    
    @app.route('/admin/student-profiles/<profile_id>/approve', methods=['PUT'])
    @jwt_required()
    def approve_student_profile_without_prefix(profile_id):
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can approve profiles'}), 403
            
            # Find the profile
            profile = StudentProfile.collection().find_one({'_id': ObjectId(profile_id)})
            if not profile:
                return jsonify({'error': 'Profile not found'}), 404
            
            # Update the profile
            StudentProfile.collection().update_one(
                {'_id': ObjectId(profile_id)},
                {'$set': {
                    'is_approved': True,
                    'updated_at': datetime.datetime.now()
                }}
            )
            
            return jsonify({
                'message': 'Profile approved successfully',
                'profile_id': profile_id
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error approving student profile: {str(e)}")
            return jsonify({'error': f'Error approving student profile: {str(e)}'}), 500
        
    @app.route('/admin/student-profiles/<profile_id>/reject', methods=['PUT'])
    @jwt_required()
    def reject_student_profile_without_prefix(profile_id):
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can reject profiles'}), 403
                
            # Find the profile
            profile = StudentProfile.collection().find_one({'_id': ObjectId(profile_id)})
            if not profile:
                return jsonify({'error': 'Profile not found'}), 404
                
            # Update the profile
            StudentProfile.collection().update_one(
                {'_id': ObjectId(profile_id)},
                {'$set': {
                    'is_approved': False,
                    'updated_at': datetime.datetime.now()
                }}
            )
            
            return jsonify({
                'message': 'Profile rejected successfully',
                'profile_id': profile_id
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error rejecting student profile: {str(e)}")
            return jsonify({'error': f'Error rejecting student profile: {str(e)}'}), 500
    
    # Admin route to create student account
    @app.route('/api/admin/create-student', methods=['POST', 'OPTIONS'])
    @jwt_required()  # Add JWT required decorator to use the Flask-JWT-Extended authentication
    def admin_create_student():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response
            
        try:
            # Get the current user from JWT token
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            # Check if user is admin
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Validate required fields
            required_fields = ['first_name', 'last_name', 'email', 'phone_number', 'password', 
                             'college_name', 'course', 'year_of_study', 'registration_number',
                             'profile_photo', 'face_images']
            
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
            
            # Validate face images - only require front face now
            face_images = data.get('face_images', {})
            if 'front' not in face_images or not face_images['front']:
                return jsonify({'error': 'Front face image is required'}), 400
            
            # Check if email already exists
            # Get db connection within function context
            db = get_db()
            existing_user = db.users.find_one({'email': data['email']})
            if existing_user:
                return jsonify({'error': 'Email already exists'}), 400
            
            # Validate front face image
            is_valid, message, detected_orientation = validate_face_image(
                face_images['front'], 
                is_live_analysis=False,
                expected_orientation='front'
            )
            if not is_valid:
                return jsonify({
                    'error': 'Face validation failed',
                    'field': 'face_images',
                    'validation_results': {'front': message}
                }), 400
            
            # Validate profile photo
            is_valid, message, _ = validate_face_image(data['profile_photo'], is_live_analysis=False)
            if not is_valid:
                return jsonify({
                    'error': 'Profile photo validation failed',
                    'field': 'profile_photo',
                    'message': message
                }), 400
            
            # Hash password
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
            
            # Create user account with proper name field
            user_data = {
                'name': f"{data['first_name']} {data['last_name']}",  # Combine first and last name
                'email': data['email'],
                'phone_number': data['phone_number'],
                'password': hashed_password,
                'role': 'student',
                'is_verified': True,  # Admin-created accounts are pre-verified
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            
            # Make sure we have a db connection
            db = get_db()
            user_result = db.users.insert_one(user_data)
            user_id = user_result.inserted_id
            
            # Create student profile
            profile_data = {
                'user_id': user_id,
                'college_name': data['college_name'],
                'course': data['course'],
                'year_of_study': data['year_of_study'],
                'registration_number': data['registration_number'],
                'profile_photo': data['profile_photo'],
                'face_images': face_images,
                'is_approved': True,  # Admin-created profiles are pre-approved
                'created_by': 'admin',
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            
            db = get_db()
            db.student_profiles.insert_one(profile_data)
            
            current_app.logger.info(f"Admin created student account: {data['email']}")
            
            return jsonify({
                'message': 'Student account created successfully',
                'user_id': str(user_id),
                'email': data['email']
            }), 201
            
        except Exception as e:
            current_app.logger.error(f"Error creating student account: {str(e)}")
            return jsonify({'error': f'Error creating student account: {str(e)}'}), 500

    # New API endpoints for admin live attendance feature
    @app.route('/api/admin/recognize-student', methods=['POST'])
    @jwt_required()
    def admin_recognize_student():
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized. Only admin can use this feature'}), 403
        
        # Get image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        current_app.logger.info(f"Student recognition request received from admin: {user_id}")
        
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
            preprocessed_image, was_preprocessed = preprocess_image_for_face_detection(image_np)
            
            # First try face detection on preprocessed image with more sensitivity for webcam images
            face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=1)
            detection_method = "preprocessed"
            
            # If no faces found, try with original image
            if len(face_locations) == 0:
                face_locations = face_recognition.face_locations(image_np, model="hog", number_of_times_to_upsample=1)
                detection_method = "original"
                
                # If still no faces, try with more aggressive upsampling
                if len(face_locations) == 0:
                    face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=2)
                    detection_method = "preprocessed_upsample2"
            
            # If still no faces detected
            if len(face_locations) == 0:
                current_app.logger.warning("No faces detected in image for recognition")
                return jsonify({
                    'recognized': False,
                    'message': 'No face detected in the image. Please ensure face is clearly visible and well-lit.',
                    'confidence': 0
                }), 200

            if len(face_locations) > 1:
                current_app.logger.warning(f"Multiple faces ({len(face_locations)}) detected in image")
                return jsonify({
                    'recognized': False,
                    'message': 'Multiple faces detected. Please ensure only one student is in frame',
                    'confidence': 0
                }), 200
    
            # Get the face encoding using the same image used for detection
            # Use 2 jitters for better encoding quality from webcam images
            encoding_image = preprocessed_image if detection_method.startswith("preprocessed") else image_np
            face_encoding = face_recognition.face_encodings(encoding_image, face_locations, num_jitters=2)[0]
            
            current_app.logger.info(f"Face detected using {detection_method} method, proceeding with recognition")
            
            # Find matching student profiles with face images
            student_profiles = list(StudentProfile.collection().find({
                'is_approved': True,
                'face_images.front': {'$exists': True}
            }))
            
            current_app.logger.info(f"Found {len(student_profiles)} student profiles with face images")
            
            if not student_profiles:
                return jsonify({
                    'recognized': False,
                    'message': 'No registered students with face data found',
                    'confidence': 0
                }), 200
    
            # Compare face encoding with stored face images of all registered students
            best_match = None
            best_match_distance = 1.0  # Lower is better, threshold is typically 0.6
            best_match_profile = None
            
            current_app.logger.info(f"Comparing detected face with {len(student_profiles)} student profiles using front face images")
            
            # Store all encodings from all students for batch comparison
            all_stored_encodings = []
            all_profile_refs = []
            
            # Collect face encodings from front orientation only
            for profile in student_profiles:
                try:
                    if 'face_images' in profile and 'front' in profile['face_images'] and profile['face_images']['front']:
                        # Get image data for front orientation
                        stored_image_data = profile['face_images']['front']
                        
                        # Remove data URI prefix if present
                        if stored_image_data.startswith('data:image'):
                            stored_image_data = stored_image_data.split(',', 1)[1]
                        
                        # Decode and convert to image
                        try:
                            image_bytes = base64.b64decode(stored_image_data)
                            stored_image = Image.open(io.BytesIO(image_bytes))
                            if stored_image.mode != 'RGB':
                                stored_image = stored_image.convert('RGB')
                            stored_image_np = np.array(stored_image)
                            
                            # Apply preprocessing to stored image for better matching
                            stored_preprocessed, _ = preprocess_image_for_face_detection(stored_image_np)
                            
                            # Find face in stored image
                            stored_face_locations = face_recognition.face_locations(stored_preprocessed, model="hog")
                            if len(stored_face_locations) > 0:
                                # Use higher quality encoding for database stored images
                                stored_face_encoding = face_recognition.face_encodings(stored_preprocessed, stored_face_locations, num_jitters=1)[0]
                                
                                # Store encoding with reference to profile
                                all_stored_encodings.append(stored_face_encoding)
                                all_profile_refs.append({
                                    'profile': profile
                                })
                        except Exception as e:
                            current_app.logger.error(f"Error processing front face for profile {profile.get('_id')}: {str(e)}")
                            continue
                except Exception as e:
                    current_app.logger.error(f"Error processing profile {profile.get('_id')}: {str(e)}")
                    continue
            
            # Second pass: Batch compare against all encodings at once
            if all_stored_encodings:
                # Calculate distances to all stored encodings at once
                face_distances = face_recognition.face_distance(all_stored_encodings, face_encoding)
                
                # Get best match
                best_match_index = np.argmin(face_distances)
                best_match_distance = face_distances[best_match_index]
                best_match_profile = all_profile_refs[best_match_index]['profile']
                
                # Log matching details for debugging
                current_app.logger.info(f"Best match distance: {best_match_distance}, profile: {best_match_profile.get('_id', 'unknown')}")
                
                # Log the top 3 closest matches for debugging
                if len(face_distances) > 1:
                    sorted_indices = np.argsort(face_distances)
                    top_matches = []
                    for i in sorted_indices[:min(3, len(sorted_indices))]:
                        top_matches.append({
                            'distance': face_distances[i],
                            'profile_id': str(all_profile_refs[i]['profile'].get('_id'))
                        })
                    current_app.logger.info(f"Top 3 matches: {top_matches}")
            
            # Use a more relaxed threshold for webcam recognition
            match_threshold = 0.6  # Changed from 0.65 to 0.6 for stricter matching
            if best_match_profile and best_match_distance < match_threshold:
                # Get student details
                student = User.find_by_id(str(best_match_profile['user_id']))
                if not student:
                    current_app.logger.error(f"Could not find user with ID: {best_match_profile['user_id']}")
                    return jsonify({
                        'recognized': False,
                        'message': 'Error finding student data',
                        'confidence': 0
                    }), 500
                
                # Check if attendance already marked for today
                attendance_date = datetime.datetime.now().strftime('%Y-%m-%d')
                existing_attendance = Attendance.collection().find_one({
                    'student_id': ObjectId(best_match_profile['user_id']),
                    'date': attendance_date
                })
                
                # Make sure student ID is properly serialized for the response
                student_id = str(student['_id'])
                
                # Remove sensitive data
                if 'password' in student:
                    student.pop('password', None)
                
                # Calculate confidence percentage
                confidence_percentage = round((1.0 - best_match_distance) * 100, 1)
                current_app.logger.info(f"Student recognized: {student.get('name')} with confidence {confidence_percentage}%")
                current_app.logger.info(f"Student ObjectId: {student_id}, returning this ID for attendance marking")
                current_app.logger.info(f"Recognition passed threshold check: {best_match_distance < match_threshold} (distance: {best_match_distance}, threshold: {match_threshold})")
                
                # Ensure we have a properly serialized student response
                student_response = {
                    '_id': student_id,  # Ensure this is a string
                    'name': student.get('name', 'Unknown'),
                    'email': student.get('email', ''),
                    'registration_number': best_match_profile.get('registration_number', '')
                }
                
                # Add course and year information if available
                if 'course' in best_match_profile:
                    student_response['course'] = best_match_profile['course']
                if 'year_of_study' in best_match_profile:
                    student_response['year_of_study'] = best_match_profile['year_of_study']
                
                # Log the full response for debugging
                current_app.logger.info(f"Returning recognition response: {student_response}, already_marked: {existing_attendance is not None}")
                
                return jsonify({
                    'recognized': True,
                    'message': f'Student recognized: {student.get("name")}',
                    'student': student_response,
                    'confidence': confidence_percentage,
                    'already_marked': existing_attendance is not None
                }), 200
            else:
                # Report the best match confidence even if not recognized
                confidence = round((1.0 - best_match_distance) * 100, 1) if best_match_profile else 0.0
                
                # Provide different messages based on confidence level
                message = 'Face detected but not registered in the system'
                if confidence > 50:
                    message = 'Face similar to a registered student but not matching with enough confidence'
                elif confidence > 30:
                    message = 'Face slightly resembles a registered student but not enough for recognition'
                
                current_app.logger.info(f"No matching student found. Best match confidence: {confidence}%")
                current_app.logger.info(f"Recognition failed threshold check: distance {best_match_distance} > threshold {match_threshold}")
                
                return jsonify({
                    'recognized': False,
                    'message': message,
                    'confidence': confidence,
                    'face_detected': True
                }), 200
            
        except Exception as e:
            current_app.logger.error(f"Face recognition error: {str(e)}")
            # Try to save the problematic image for debugging
            try:
                save_debug_image(image_data, "recognition_error")
            except:
                pass
                
            return jsonify({
                'recognized': False,
                'message': f'Error processing image: {str(e)}',
                'confidence': 0
            }), 500

    @app.route('/api/admin/mark-attendance', methods=['POST'])
    @jwt_required()
    def admin_mark_attendance():
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized. Only admin can mark attendance'}), 403
        
        data = request.get_json()
        
        # Validate request data
        if not data or 'student_id' not in data:
            return jsonify({'error': 'Missing student ID'}), 400
        
        student_id = data['student_id']
        current_app.logger.info(f"Received attendance request for student_id: {student_id} (type: {type(student_id)})")
        
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
        
        try:
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
                    'marked_by': ObjectId(user_id),
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
            current_app.logger.error(f"Error marking attendance for student {student_id}: {str(e)}")
            return jsonify({
                'error': f'Error marking attendance: {str(e)}',
                'student_id': student_id
            }), 500

    @app.route('/api/admin/recent-attendance', methods=['GET'])
    @jwt_required()
    def get_recent_attendance():
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
                'date': today
            }).sort('created_at', -1).limit(10))
            
            # Format the response
            result = []
            for record in attendance_records:
                # Get student details
                student = User.find_by_id(str(record['student_id']))
                if student:
                    # Find student profile for additional details
                    profile = StudentProfile.collection().find_one({'user_id': str(student['_id'])})
                    
                    result.append({
                        '_id': str(record['_id']),
                        'student': {
                            '_id': str(student['_id']),
                            'name': student['name'],
                            'email': student['email'],
                            'registration_number': profile.get('registration_number', 'Unknown') if profile else 'Unknown',
                            'profile_photo': profile.get('profile_photo', None) if profile else None
                        },
                        'date': record['date'],
                        'time': record.get('time', '00:00:00'),
                        'status': record.get('status', 'present'),
                        'marked_method': record.get('marked_method', 'manual'),
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

    # Student Details API endpoint
    @app.route('/api/admin/student/<student_id>', methods=['GET'])
    @jwt_required()
    def get_student_details(student_id):
        try:
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access this resource'}), 403
            
            # Get student user data
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
                
            # Remove sensitive data
            if 'password' in student:
                student.pop('password', None)
                
            # Convert ObjectId to string
            student['_id'] = str(student['_id'])
            
            # Get student profile data
            db = get_db()
            profile = db.student_profiles.find_one({'user_id': ObjectId(student_id)})
            
            result = {
                'user': student,
                'has_profile': profile is not None
            }
            
            # Add profile data if it exists
            if profile:
                # Convert ObjectIds to strings
                profile['_id'] = str(profile['_id'])
                profile['user_id'] = str(profile['user_id'])
                
                # Format timestamps
                if 'created_at' in profile and isinstance(profile['created_at'], datetime.datetime):
                    profile['created_at'] = profile['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if 'updated_at' in profile and isinstance(profile['updated_at'], datetime.datetime):
                    profile['updated_at'] = profile['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                result['profile'] = profile
                
                # Check if face data exists and is complete
                has_face_data = False
                if 'face_images' in profile and isinstance(profile['face_images'], dict):
                    has_face_data = 'front' in profile['face_images'] and profile['face_images']['front']
                
                result['has_face_data'] = has_face_data
                
                # Get attendance records for this student
                attendance_records = list(db.attendance.find({
                    'student_id': ObjectId(student_id)
                }).sort('created_at', -1).limit(10))
                
                # Format attendance records
                formatted_records = []
                for record in attendance_records:
                    record['_id'] = str(record['_id'])
                    record['student_id'] = str(record['student_id'])
                    if 'marked_by' in record:
                        record['marked_by'] = str(record['marked_by'])
                    if 'created_at' in record and isinstance(record['created_at'], datetime.datetime):
                        record['created_at'] = record['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    if 'updated_at' in record and isinstance(record['updated_at'], datetime.datetime):
                        record['updated_at'] = record['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                    formatted_records.append(record)
                
                result['recent_attendance'] = formatted_records
            
            return jsonify(result), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student details: {str(e)}")
            return jsonify({'error': f'Error fetching student details: {str(e)}'}), 500

    # Add the plural version route to match frontend expectation
    @app.route('/api/admin/students/<student_id>', methods=['GET'])
    @jwt_required()
    def get_student_details_plural(student_id):
        try:
            # Get student user data
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found', 'success': False, 'message': 'Student not found'}), 404
                
            # Remove sensitive data
            if 'password' in student:
                student.pop('password', None)
                
            # Convert ObjectId to string
            student['_id'] = str(student['_id'])
            
            # Get student profile data
            db = get_db()
            profile = db.student_profiles.find_one({'user_id': ObjectId(student_id)})
            
            # Add profile data if it exists
            if profile:
                # Get registration number from profile
                student['registration_number'] = profile.get('registration_number', 'Unknown')
                # Get profile photo from profile
                student['profile_photo'] = profile.get('profile_photo', None)
            
            # Return data in both formats to support all frontend components
            return jsonify({
                'success': True,
                'student': student,
                'user': student,
                'has_profile': profile is not None
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student details: {str(e)}")
            return jsonify({
                'error': f'Error fetching student details: {str(e)}',
                'success': False,
                'message': 'Failed to fetch student details'
            }), 500

    @app.route('/api/admin/student/<student_id>/attendance', methods=['GET'])
    @jwt_required()
    def get_student_attendance_details(student_id):
        try:
            # Add debug logging with more details
            current_app.logger.debug(f"Fetching attendance for student_id: {student_id} (type: {type(student_id)})")
            
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access this resource'}), 403
            
            # Get month and year from query params, default to current month/year
            month = request.args.get('month', datetime.datetime.now().month)
            year = request.args.get('year', datetime.datetime.now().year)
            
            try:
                month = int(month)
                year = int(year)
            except ValueError:
                return jsonify({'error': 'Invalid month or year format'}), 400
            
            # Generate date range for the specified month
            import calendar
            _, last_day = calendar.monthrange(year, month)
            month_str = str(month).zfill(2)
            
            start_date = f"{year}-{month_str}-01"
            end_date = f"{year}-{month_str}-{last_day}"
            
            # Get student user data
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
            
            # Safely convert student_id to ObjectId without any potential errors
            try:
                # Check if student_id is invalid before we even try to use it
                if student_id is None or student_id == '' or student_id == 'None':
                    return jsonify({'error': 'Invalid student ID, cannot be None'}), 400
                
                # Get student profile using our improved safe method
                profile = StudentProfile.find_by_user_id(student_id)
                
                # Convert to ObjectId only if it's a valid string (24 hex chars)
                if isinstance(student_id, str) and len(student_id) == 24:
                    try:
                        student_id_obj = ObjectId(student_id)
                    except Exception as e:
                        current_app.logger.error(f"Could not convert {student_id} to ObjectId: {str(e)}")
                        return jsonify({'error': 'Invalid student ID format'}), 400
                else:
                    return jsonify({'error': 'Student ID is not in valid format'}), 400
                
                # Get attendance records for this student within the date range
                attendance_records = list(Attendance.collection().find({
                    'student_id': student_id_obj,
                    'date': {'$gte': start_date, '$lte': end_date}
                }).sort('date', 1))
                
                current_app.logger.debug(f"Found {len(attendance_records)} attendance records")
                
            except Exception as e:
                current_app.logger.error(f"Error processing data: {str(e)}")
                return jsonify({'error': f'Error processing attendance data: {str(e)}'}), 400
            
            # Format attendance records
            formatted_records = []
            for record in attendance_records:
                record['_id'] = str(record['_id'])
                record['student_id'] = str(record['student_id'])
                
                # Add marked_by_user details if available
                if 'marked_by' in record and record['marked_by'] is not None:
                    try:
                        marked_by_id = str(record['marked_by'])
                        marker = User.find_by_id(marked_by_id)
                        record['marked_by'] = marked_by_id
                        if marker:
                            record['marked_by_user'] = {
                                '_id': marked_by_id,
                                'name': marker.get('name', 'Unknown')
                            }
                    except Exception as e:
                        current_app.logger.error(f"Error processing marker data: {str(e)}")
                
                # Format timestamps
                if 'created_at' in record and isinstance(record['created_at'], datetime.datetime):
                    record['created_at'] = record['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if 'updated_at' in record and isinstance(record['updated_at'], datetime.datetime):
                    record['updated_at'] = record['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                formatted_records.append(record)
            
            # Generate calendar data for the month


            # Generate calendar data for the month



            # Generate calendar data for the month

            calendar_days = []

            current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')

            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')

            today_date = datetime.datetime.now().date()

            

            records_list = locals().get('formatted_records', locals().get('attendance_records', []))

            attendance_by_date = {record.get('date', ''): record for record in records_list if 'date' in record}

            

            # Registration date logic

            registration_date = student.get('created_at') if student else datetime.date.min

            if isinstance(registration_date, str):

                try:

                    import dateutil.parser

                    registration_date = dateutil.parser.parse(registration_date).date()

                except:

                    registration_date = datetime.date.min

            elif isinstance(registration_date, datetime.datetime):

                registration_date = registration_date.date()

            else:

                registration_date = datetime.date.min

                

            working_days_count = 0

            present_count = 0

            late_count = 0

            absent_count = 0

            holiday_count = 0

            

            db = get_db()

            holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})

            holiday_dates = {h['date']: h['name'] for h in holidays_cursor}

            

            off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})

            off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

            

            while current_date <= end_date_obj:

                date_str = current_date.strftime('%Y-%m-%d')

                is_past_or_today = current_date.date() <= today_date

                is_before_registration = current_date.date() < registration_date

                weekday = current_date.weekday()

                

                is_holiday = date_str in holiday_dates

                is_off_day = weekday in off_weekdays

                

                status = 'unknown'

                has_records = date_str in attendance_by_date

                

                if is_before_registration:
                    status = 'not_enrolled'
                elif has_records:
                    record = attendance_by_date[date_str]
                    if isinstance(record, dict):
                        status = record.get('status', 'unknown')
                    else:
                        status = record
                    if status == 'present':
                        present_count += 1
                    elif status == 'late':
                        late_count += 1
                    elif status == 'absent':
                        absent_count += 1
                    working_days_count += 1
                elif is_holiday or is_off_day:
                    if is_past_or_today or is_holiday:
                        status = 'holiday'
                        holiday_count += 1
                elif is_past_or_today:
                    status = 'absent'
                    absent_count += 1

                    working_days_count += 1

                    

                calendar_days.append({

                    'date': date_str,

                    'day': current_date.day,

                    'weekday': current_date.strftime('%a'),

                    'status': status,

                    'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)

                })

                current_date += datetime.timedelta(days=1)

                

            total_records = working_days_count

            attendance_percentage = 0

            if working_days_count > 0:

                attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)


            response_data = {
                'student': {
                    '_id': str(student['_id']),
                    'name': student['name'],
                    'email': student['email'],
                    'registration_number': profile.get('registration_number', 'Unknown') if profile else 'Unknown',
                    'profile_photo': profile.get('profile_photo', None) if profile else None
                },
                'records': formatted_records,
                'calendar': calendar_days,
                'statistics': {
                    'total_days': total_records,
                    'present': present_count,
                    'absent': absent_count,
                    'late': late_count,
                    'holidays': holiday_count,
                    'percentage': attendance_percentage
                },
                'month': month,
                'year': year
            }
            
            # Use mongo_to_json helper to ensure all MongoDB objects are properly serialized
            return jsonify(mongo_to_json(response_data)), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student attendance: {str(e)}")
            return jsonify({'error': f'Error fetching attendance records: {str(e)}'}), 500

    @app.route('/api/admin/attendance/monthly-summary', methods=['GET'])
    @jwt_required()
    def get_monthly_attendance_summary():
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access this resource'}), 403
            
            # Get month and year from query params, default to current month/year
            month = request.args.get('month', datetime.datetime.now().month)
            year = request.args.get('year', datetime.datetime.now().year)
            
            try:
                month = int(month)
                year = int(year)
            except ValueError:
                return jsonify({'error': 'Invalid month or year format'}), 400
            
            # Generate date range for the specified month
            import calendar
            _, last_day = calendar.monthrange(year, month)
            month_str = str(month).zfill(2)
            
            start_date = f"{year}-{month_str}-01"
            end_date = f"{year}-{month_str}-{last_day}"            # Get registered students count
            registered_students = User.get_all_students()
            registered_count = len(registered_students)
            
            db = get_db()
            profiles = list(db.student_profiles.find({}))
            course_registered_counts = {}
            for profile in profiles:
                if 'course' in profile:
                    course = profile['course']
                    course_registered_counts[course] = course_registered_counts.get(course, 0) + 1
            
            # Query the attendance collection for all records in the month
            attendance_records = list(Attendance.collection().find({
                'date': {'$gte': start_date, '$lte': end_date}
            }))
            
            # Calculate how many unique students marked attendance
            students_with_attendance = set()
            for record in attendance_records:
                if 'student_id' in record:
                    students_with_attendance.add(str(record['student_id']))
                    
            students_with_attendance_count = len(students_with_attendance)            # Group records by date
            daily_attendance = {}
            for record in attendance_records:
                date = record.get('date')
                if date:
                    if date not in daily_attendance:
                        daily_attendance[date] = {'present': 0}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present']:
                        daily_attendance[date][status] += 1
                        
            # Fetch holidays and off-weekdays
            db = get_db()
            holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
            holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
            
            off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
            off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]
            
            # Format daily attendance for the chart
            daily_attendance_trend = []
            current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
            today_date = datetime.datetime.now().date()
            
            # Collect registration dates for all students
            student_reg_dates = []
            for s in registered_students:
                reg_date = s.get('created_at')
                if isinstance(reg_date, str):
                    try:
                        import dateutil.parser
                        reg_date = dateutil.parser.parse(reg_date).date()
                    except:
                        reg_date = datetime.date.min
                elif isinstance(reg_date, datetime.datetime):
                    reg_date = reg_date.date()
                else:
                    reg_date = datetime.date.min
                student_reg_dates.append(reg_date)
                
            working_days_count = 0
            
            while current_date <= end_date_obj:
                date_str = current_date.strftime('%Y-%m-%d')
                is_past_or_today = current_date.date() <= today_date
                weekday = current_date.weekday()
                
                # Dynamic registered count based on student creation dates
                daily_registered_count = sum(1 for d in student_reg_dates if d <= current_date.date())
                
                is_holiday = date_str in holiday_dates
                is_off_day = weekday in off_weekdays
                
                present = 0
                absent = 0
                holiday = 0
                total = 0
                
                has_records = date_str in daily_attendance
                
                if is_holiday or (is_off_day and not has_records):
                    if is_past_or_today or is_holiday:
                        holiday = daily_registered_count
                        total = daily_registered_count
                else:
                    if has_records:
                        date_data = daily_attendance[date_str]
                        present = date_data['present']
                        absent = max(0, daily_registered_count - present)
                        total = daily_registered_count
                        working_days_count += 1
                    elif is_past_or_today:
                        absent = daily_registered_count
                        total = daily_registered_count
                        working_days_count += 1
                
                daily_attendance_trend.append({
                    'date': date_str,
                    'day': current_date.day,
                    'total': total,
                    'present': present,
                    'absent': absent,
                    'holiday': holiday,
                    'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
                })
                
                current_date += datetime.timedelta(days=1)
            
            # Calculate weekly attendance trend
            weekly_attendance = {}
            for day_data in daily_attendance_trend:
                week_num = (day_data['day'] - 1) // 7 + 1
                week_key = f"Week {week_num}"
                
                if week_key not in weekly_attendance:
                    weekly_attendance[week_key] = {'total': 0, 'present': 0,  'absent': 0, 'holiday': 0}
                
                weekly_attendance[week_key]['total'] += day_data['total']
                weekly_attendance[week_key]['present'] += day_data['present'] 
                weekly_attendance[week_key]['absent'] += day_data['absent']
                weekly_attendance[week_key]['holiday'] += day_data.get('holiday', 0)
            
            weekly_attendance_trend = []
            for week, data in sorted(weekly_attendance.items()):
                weekly_attendance_trend.append({
                    'week': week,
                    'total': data['total'],
                    'present': data['present'],

                    'absent': data['absent'],
                    'holiday': data['holiday']
                })
            
            # Calculate course-wise attendance
            course_attendance = {}
            for record in attendance_records:
                if 'student_id' not in record:
                    continue
                
                student_id = str(record['student_id'])
                profile = next((p for p in profiles if str(p.get('user_id')) == student_id), None)
                
                if profile and 'course' in profile:
                    course = profile['course']
                    if course not in course_attendance:
                        course_attendance[course] = {'present': 0}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present']:
                        course_attendance[course][status] += 1
            
            course_attendance_data = []
            for course, data in course_attendance.items():
                course_total = course_registered_counts.get(course, 0) * working_days_count
                present = data['present']
                absent = max(0, course_total - present)
                
                attendance_rate = 0
                if course_total > 0:
                    attendance_rate = round(((present ) / course_total) * 100, 1)
                    
                course_attendance_data.append({
                    'course': course,
                    'total': course_total,
                    'present': present,
                    
                    'absent': absent,
                    'attendance_rate': attendance_rate
                })
            
            # Calculate overall statistics
            total_expected_attendance = working_days_count * registered_count
            present_count = sum(day['present'] for day in daily_attendance_trend)
            absent_count = sum(day['absent'] for day in daily_attendance_trend)
            
            overall_attendance_rate = 0
            if total_expected_attendance > 0:
                overall_attendance_rate = round(((present_count) / total_expected_attendance) * 100, 1)
            
            # Generate the response with all summary data
            response_data = {
                'month': month,
                'year': year,
                'month_name': calendar.month_name[month],
                'overall_statistics': {
                    'registered_students': registered_count,
                    'students_with_attendance': students_with_attendance_count,
                    'total_attendance_records': total_expected_attendance,
                    'present_count': present_count,

                    'absent_count': absent_count,
                    'overall_attendance_rate': overall_attendance_rate
                },
                'daily_trend': daily_attendance_trend,
                'weekly_trend': weekly_attendance_trend,
                'course_attendance': course_attendance_data
            }
            
            # Use mongo_to_json helper for serialization
            return jsonify(mongo_to_json(response_data)), 200
            
        except Exception as e:
            current_app.logger.error(f"Error generating monthly attendance summary: {str(e)}")
            return jsonify({'error': f'Error generating monthly attendance summary: {str(e)}'}), 500

    # Add the plural version route to match frontend expectation
    @app.route('/api/admin/students/<student_id>/attendance', methods=['GET'])
    @jwt_required()
    def get_student_attendance_details_plural(student_id):
        try:
            # Add debug logging with more details
            current_app.logger.debug(f"Fetching attendance (plural route) for student_id: {student_id} (type: {type(student_id)})")
            
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access this resource'}), 403
            
            # Get month and year from query params, default to current month/year
            month = request.args.get('month', datetime.datetime.now().month)
            year = request.args.get('year', datetime.datetime.now().year)
            
            try:
                month = int(month)
                year = int(year)
            except ValueError:
                return jsonify({'error': 'Invalid month or year format'}), 400
            
            # Generate date range for the specified month
            import calendar
            _, last_day = calendar.monthrange(year, month)
            month_str = str(month).zfill(2)
            
            start_date = f"{year}-{month_str}-01"
            end_date = f"{year}-{month_str}-{last_day}"
            
            # Get student user data
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
            
            # Safely convert student_id to ObjectId without any potential errors
            try:
                # Check if student_id is invalid before we even try to use it
                if student_id is None or student_id == '' or student_id == 'None':
                    return jsonify({'error': 'Invalid student ID, cannot be None'}), 400
                
                # Get student profile using our improved safe method
                profile = StudentProfile.find_by_user_id(student_id)
                
                # Convert to ObjectId only if it's a valid string (24 hex chars)
                if isinstance(student_id, str) and len(student_id) == 24:
                    try:
                        student_id_obj = ObjectId(student_id)
                    except Exception as e:
                        current_app.logger.error(f"Could not convert {student_id} to ObjectId: {str(e)}")
                        return jsonify({'error': 'Invalid student ID format'}), 400
                else:
                    return jsonify({'error': 'Student ID is not in valid format'}), 400
                
                # Get attendance records for this student within the date range
                attendance_records = list(Attendance.collection().find({
                    'student_id': student_id_obj,
                    'date': {'$gte': start_date, '$lte': end_date}
                }).sort('date', 1))
                
                current_app.logger.debug(f"Found {len(attendance_records)} attendance records")
                
            except Exception as e:
                current_app.logger.error(f"Error processing data: {str(e)}")
                return jsonify({'error': f'Error processing attendance data: {str(e)}'}), 400
                
            # Format attendance records
            formatted_records = []
            for record in attendance_records:
                record['_id'] = str(record['_id'])
                record['student_id'] = str(record['student_id'])
                
                # Add marked_by_user details if available
                if 'marked_by' in record and record['marked_by'] is not None:
                    try:
                        marked_by_id = str(record['marked_by'])
                        marker = User.find_by_id(marked_by_id)
                        record['marked_by'] = marked_by_id
                        if marker:
                            record['marked_by_user'] = {
                                '_id': marked_by_id,
                                'name': marker.get('name', 'Unknown')
                            }
                    except Exception as e:
                        current_app.logger.error(f"Error processing marker data: {str(e)}")
                
                # Format timestamps
                if 'created_at' in record and isinstance(record['created_at'], datetime.datetime):
                    record['created_at'] = record['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if 'updated_at' in record and isinstance(record['updated_at'], datetime.datetime):
                    record['updated_at'] = record['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                formatted_records.append(record)
            
            # Generate calendar data for the month


            # Generate calendar data for the month



            # Generate calendar data for the month

            calendar_days = []

            current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')

            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')

            today_date = datetime.datetime.now().date()

            

            records_list = locals().get('formatted_records', locals().get('attendance_records', []))

            attendance_by_date = {record.get('date', ''): record for record in records_list if 'date' in record}

            

            # Registration date logic

            registration_date = student.get('created_at') if student else datetime.date.min

            if isinstance(registration_date, str):

                try:

                    import dateutil.parser

                    registration_date = dateutil.parser.parse(registration_date).date()

                except:

                    registration_date = datetime.date.min

            elif isinstance(registration_date, datetime.datetime):

                registration_date = registration_date.date()

            else:

                registration_date = datetime.date.min

                

            working_days_count = 0

            present_count = 0

            late_count = 0

            absent_count = 0

            holiday_count = 0

            

            db = get_db()

            holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})

            holiday_dates = {h['date']: h['name'] for h in holidays_cursor}

            

            off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})

            off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

            

            while current_date <= end_date_obj:

                date_str = current_date.strftime('%Y-%m-%d')

                is_past_or_today = current_date.date() <= today_date

                is_before_registration = current_date.date() < registration_date

                weekday = current_date.weekday()

                

                is_holiday = date_str in holiday_dates

                is_off_day = weekday in off_weekdays

                

                status = 'unknown'

                has_records = date_str in attendance_by_date

                

                if is_before_registration:
                    status = 'not_enrolled'
                elif has_records:
                    record = attendance_by_date[date_str]
                    if isinstance(record, dict):
                        status = record.get('status', 'unknown')
                    else:
                        status = record
                    if status == 'present':
                        present_count += 1
                    elif status == 'late':
                        late_count += 1
                    elif status == 'absent':
                        absent_count += 1
                    working_days_count += 1
                elif is_holiday or is_off_day:
                    if is_past_or_today or is_holiday:
                        status = 'holiday'
                        holiday_count += 1
                elif is_past_or_today:
                    status = 'absent'
                    absent_count += 1

                    working_days_count += 1

                    

                calendar_days.append({

                    'date': date_str,

                    'day': current_date.day,

                    'weekday': current_date.strftime('%a'),

                    'status': status,

                    'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)

                })

                current_date += datetime.timedelta(days=1)

                

            total_records = working_days_count

            attendance_percentage = 0

            if working_days_count > 0:

                attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)


            response_data = {
                'student': {
                    '_id': str(student['_id']),
                    'name': student['name'],
                    'email': student['email'],
                    'registration_number': profile.get('registration_number', 'Unknown') if profile else 'Unknown',
                    'profile_photo': profile.get('profile_photo', None) if profile else None
                },
                'records': formatted_records,
                'calendar': calendar_days,
                'statistics': {
                    'total_days': total_records,
                    'present': present_count,
                    'absent': absent_count,
                    'late': late_count,
                    'holidays': holiday_count,
                    'percentage': attendance_percentage
                },
                'month': month,
                'year': year
            }
            
            # Use mongo_to_json helper to ensure all MongoDB objects are properly serialized
            return jsonify(mongo_to_json(response_data)), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching student attendance: {str(e)}")
            return jsonify({'error': f'Error fetching attendance records: {str(e)}'}), 500

    # Contact form routes
    @app.route('/api/contact/submit', methods=['POST'])
    def submit_contact_form():
        try:
            # Get form data
            data = request.get_json()
            
            # Validate required fields
            if not all(k in data for k in ('name', 'email', 'subject', 'message')):
                return jsonify({'error': 'Missing required fields'}), 400
                
            # Get database connection
            db = get_db()
            
            # Create contact submission
            contact_data = {
                'name': data['name'],
                'email': data['email'],
                'subject': data['subject'],
                'message': data['message'],
                'is_read': False,
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            
            # Insert into database
            result = db.contact_submissions.insert_one(contact_data)
            
            return jsonify({
                'message': 'Contact form submission successful',
                'submission_id': str(result.inserted_id)
            }), 201
            
        except Exception as e:
            current_app.logger.error(f"Error saving contact form: {str(e)}")
            return jsonify({'error': f'Error saving contact form: {str(e)}'}), 500
    
    @app.route('/api/admin/contact-submissions', methods=['GET'])
    @jwt_required()
    def get_contact_submissions():
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can access contact submissions'}), 403
            
            # Get all contact submissions
            db = get_db()
            
            # Get filter parameters
            is_read = request.args.get('is_read')
            
            # Build query
            query = {}
            if is_read is not None:
                query['is_read'] = is_read.lower() == 'true'
            
            # Get submissions with pagination
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 10))
            skip = (page - 1) * limit
            
            # Find submissions and sort by newest first
            submissions = list(db.contact_submissions.find(query)
                              .sort('created_at', -1)
                              .skip(skip)
                              .limit(limit))
            
            # Count total submissions
            total_count = db.contact_submissions.count_documents(query)
            
            # Format response
            formatted_submissions = []
            for submission in submissions:
                submission['_id'] = str(submission['_id'])
                
                # Format timestamps
                if 'created_at' in submission and isinstance(submission['created_at'], datetime.datetime):
                    submission['created_at'] = submission['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if 'updated_at' in submission and isinstance(submission['updated_at'], datetime.datetime):
                    submission['updated_at'] = submission['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                formatted_submissions.append(submission)
            
            return jsonify({
                'submissions': formatted_submissions,
                'total': total_count,
                'page': page,
                'limit': limit,
                'total_pages': (total_count + limit - 1) // limit
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching contact submissions: {str(e)}")
            return jsonify({'error': f'Error fetching contact submissions: {str(e)}'}), 500
    
    @app.route('/api/admin/contact-submissions/<submission_id>', methods=['PUT'])
    @jwt_required()
    def update_contact_submission(submission_id):
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can update contact submissions'}), 403
            
            # Get request data
            data = request.get_json()
            
            # Validate request data
            if 'is_read' not in data:
                return jsonify({'error': 'Missing is_read field'}), 400
            
            # Update submission
            db = get_db()
            result = db.contact_submissions.update_one(
                {'_id': ObjectId(submission_id)},
                {'$set': {
                    'is_read': data['is_read'],
                    'updated_at': datetime.datetime.now()
                }}
            )
            
            if result.modified_count == 0:
                return jsonify({'error': 'Submission not found or not modified'}), 404
            
            return jsonify({
                'message': 'Contact submission updated successfully'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating contact submission: {str(e)}")
            return jsonify({'error': f'Error updating contact submission: {str(e)}'}), 500
    
    @app.route('/api/admin/contact-submissions/<submission_id>', methods=['DELETE'])
    @jwt_required()
    def delete_contact_submission(submission_id):
        try:
            # Check if user is admin
            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can delete contact submissions'}), 403
            
            # Delete submission
            db = get_db()
            result = db.contact_submissions.delete_one({'_id': ObjectId(submission_id)})
            
            if result.deleted_count == 0:
                return jsonify({'error': 'Submission not found'}), 404
            
            return jsonify({
                'message': 'Contact submission deleted successfully'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error deleting contact submission: {str(e)}")
            return jsonify({'error': f'Error deleting contact submission: {str(e)}'}), 500

    @app.route('/api/admin/update-student/<student_id>', methods=['PUT'])
    @jwt_required()
    def update_student(student_id):
        try:
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can update students'}), 403
            
            # Get request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Get the student
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
            
            # Update user data
            update_data = {}
            
            # Update basic user fields
            if 'name' in data:
                update_data['name'] = data['name']
            if 'email' in data:
                update_data['email'] = data['email']
            if 'phone_number' in data:
                update_data['phone_number'] = data['phone_number']
            
            # Update password if provided
            if 'password' in data and data['password']:
                hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
                update_data['password'] = hashed_password.decode('utf-8')
            
            # Add updated timestamp
            update_data['updated_at'] = datetime.datetime.now()
            
            # Update the user
            if update_data:
                db = get_db()
                db.users.update_one(
                    {'_id': ObjectId(student_id)},
                    {'$set': update_data}
                )
            
            # Update student profile
            profile_data = {}
            profile_fields = ['college_name', 'course', 'year_of_study', 'registration_number', 'profile_photo', 'face_images']
            
            for field in profile_fields:
                if field in data:
                    profile_data[field] = data[field]
            
            if profile_data:
                profile_data['updated_at'] = datetime.datetime.now()
                
                # Check if profile exists
                db = get_db()
                profile = db.student_profiles.find_one({'user_id': ObjectId(student_id)})
                
                if profile:
                    # Update existing profile
                    db.student_profiles.update_one(
                        {'user_id': ObjectId(student_id)},
                        {'$set': profile_data}
                    )
                else:
                    # Create new profile
                    profile_data['user_id'] = ObjectId(student_id)
                    profile_data['created_at'] = datetime.datetime.now()
                    profile_data['is_approved'] = True  # Admin-created profiles are pre-approved
                    
                    db.student_profiles.insert_one(profile_data)
            
            return jsonify({
                'success': True,
                'message': 'Student updated successfully'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating student: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error updating student: {str(e)}'
            }), 500
    
    @app.route('/api/admin/update-student-face/<student_id>', methods=['PUT'])
    @jwt_required()
    def update_student_face(student_id):
        try:
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can update student face data'}), 403
            
            # Get request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Get the student
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
            
            # Update profile with face data
            profile_data = {}
            face_fields = ['profile_photo', 'face_images']
            
            for field in face_fields:
                if field in data:
                    profile_data[field] = data[field]
            
            if not profile_data:
                return jsonify({'error': 'No face data provided'}), 400
            
            profile_data['updated_at'] = datetime.datetime.now()
            
            # Check if profile exists
            db = get_db()
            profile = db.student_profiles.find_one({'user_id': ObjectId(student_id)})
            
            if profile:
                # Update existing profile
                db.student_profiles.update_one(
                    {'user_id': ObjectId(student_id)},
                    {'$set': profile_data}
                )
            else:
                # Create new profile with face data
                profile_data['user_id'] = ObjectId(student_id)
                profile_data['created_at'] = datetime.datetime.now()
                profile_data['is_approved'] = True  # Admin-created profiles are pre-approved
                
                db.student_profiles.insert_one(profile_data)
            
            return jsonify({
                'success': True,
                'message': 'Student face data updated successfully'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating student face data: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error updating student face data: {str(e)}'
            }), 500

    # Add a public endpoint for student recognition (for use from landing page)
    @app.route('/api/public/recognize-student', methods=['POST', 'OPTIONS'])
    def public_recognize_student():
        # Handle CORS preflight request
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response
            
        # Get image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        current_app.logger.info(f"Public student recognition request received")
        
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
            preprocessed_image, was_preprocessed = preprocess_image_for_face_detection(image_np)
            
            # First try face detection on preprocessed image with more sensitivity for webcam images
            face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=1)
            detection_method = "preprocessed"
            
            # If no faces found, try with original image
            if len(face_locations) == 0:
                face_locations = face_recognition.face_locations(image_np, model="hog", number_of_times_to_upsample=1)
                detection_method = "original"
                
                # If still no faces, try with more aggressive upsampling
                if len(face_locations) == 0:
                    face_locations = face_recognition.face_locations(preprocessed_image, model="hog", number_of_times_to_upsample=2)
                    detection_method = "preprocessed_upsample2"
            
            # If still no faces detected
            if len(face_locations) == 0:
                current_app.logger.warning("No faces detected in image for public recognition")
                return jsonify({
                    'recognized': False,
                    'message': 'No face detected in the image. Please ensure face is clearly visible and well-lit.',
                    'confidence': 0
                }), 200

            if len(face_locations) > 1:
                current_app.logger.warning(f"Multiple faces ({len(face_locations)}) detected in public recognition")
                return jsonify({
                    'recognized': False,
                    'message': 'Multiple faces detected. Please ensure only one student is in frame',
                    'confidence': 0
                }), 200
    
            # Get the face encoding using the same image used for detection
            # Use 2 jitters for better encoding quality from webcam images
            encoding_image = preprocessed_image if detection_method.startswith("preprocessed") else image_np
            face_encoding = face_recognition.face_encodings(encoding_image, face_locations, num_jitters=2)[0]
            
            current_app.logger.info(f"Public recognition: Face detected using {detection_method} method, proceeding with recognition")
            
            # Find matching student profiles with face images
            student_profiles = list(StudentProfile.collection().find({
                'is_approved': True,
                'face_images.front': {'$exists': True}
            }))
            
            current_app.logger.info(f"Public recognition: Found {len(student_profiles)} student profiles with face images")
            
            if not student_profiles:
                return jsonify({
                    'recognized': False,
                    'message': 'No registered students with face data found',
                    'confidence': 0
                }), 200
    
            # Compare face encoding with stored face images of all registered students
            best_match = None
            best_match_distance = 1.0  # Lower is better, threshold is typically 0.6
            best_match_profile = None
            
            # Store all encodings from all students for batch comparison
            all_stored_encodings = []
            all_profile_refs = []
            
            # Collect face encodings from front orientation only
            for profile in student_profiles:
                try:
                    if 'face_images' in profile and 'front' in profile['face_images'] and profile['face_images']['front']:
                        # Get image data for front orientation
                        stored_image_data = profile['face_images']['front']
                        
                        # Remove data URI prefix if present
                        if stored_image_data.startswith('data:image'):
                            stored_image_data = stored_image_data.split(',', 1)[1]
                        
                        # Decode and convert to image
                        try:
                            image_bytes = base64.b64decode(stored_image_data)
                            stored_image = Image.open(io.BytesIO(image_bytes))
                            if stored_image.mode != 'RGB':
                                stored_image = stored_image.convert('RGB')
                            stored_image_np = np.array(stored_image)
                            
                            # Apply preprocessing to stored image for better matching
                            stored_preprocessed, _ = preprocess_image_for_face_detection(stored_image_np)
                            
                            # Find face in stored image
                            stored_face_locations = face_recognition.face_locations(stored_preprocessed, model="hog")
                            if len(stored_face_locations) > 0:
                                # Use higher quality encoding for database stored images
                                stored_face_encoding = face_recognition.face_encodings(stored_preprocessed, stored_face_locations, num_jitters=1)[0]
                                
                                # Store encoding with reference to profile
                                all_stored_encodings.append(stored_face_encoding)
                                all_profile_refs.append({
                                    'profile': profile
                                })
                        except Exception as e:
                            current_app.logger.error(f"Public recognition: Error processing front face for profile {profile.get('_id')}: {str(e)}")
                            continue
                except Exception as e:
                    current_app.logger.error(f"Public recognition: Error processing profile {profile.get('_id')}: {str(e)}")
                    continue
            
            # Second pass: Batch compare against all encodings at once
            if all_stored_encodings:
                # Calculate distances to all stored encodings at once
                face_distances = face_recognition.face_distance(all_stored_encodings, face_encoding)
                
                # Get best match
                best_match_index = np.argmin(face_distances)
                best_match_distance = face_distances[best_match_index]
                best_match_profile = all_profile_refs[best_match_index]['profile']
                
                # Log matching details for debugging
                current_app.logger.info(f"Public recognition: Best match distance: {best_match_distance}, profile: {best_match_profile.get('_id', 'unknown')}")
            
            # Use a more relaxed threshold for webcam recognition
            match_threshold = 0.6  # Changed from 0.65 to 0.6 for stricter matching
            if best_match_profile and best_match_distance < match_threshold:
                # Get student details
                student = User.find_by_id(str(best_match_profile['user_id']))
                if not student:
                    current_app.logger.error(f"Public recognition: Could not find user with ID: {best_match_profile['user_id']}")
                    return jsonify({
                        'recognized': False,
                        'message': 'Error finding student data',
                        'confidence': 0
                    }), 500
                
                # Check if attendance already marked for today
                attendance_date = datetime.datetime.now().strftime('%Y-%m-%d')
                existing_attendance = Attendance.collection().find_one({
                    'student_id': ObjectId(best_match_profile['user_id']),
                    'date': attendance_date
                })
                
                # Make sure student ID is properly serialized for the response
                student_id = str(student['_id'])
                
                # Remove sensitive data
                if 'password' in student:
                    student.pop('password', None)
                
                # Calculate confidence percentage
                confidence_percentage = round((1.0 - best_match_distance) * 100, 1)
                current_app.logger.info(f"Public recognition: Student recognized: {student.get('name')} with confidence {confidence_percentage}%")
                
                # Get course and other details from profile
                course = best_match_profile.get('course', '')
                year = best_match_profile.get('year_of_study', '')
                
                # Create a simplified student object with only essential details
                student_data = {
                    '_id': student_id,
                    'name': student.get('name', 'Unknown Student'),
                    'email': student.get('email', ''),
                    'course': course,
                    'year_of_study': year,
                    'registration_number': best_match_profile.get('registration_number', '')
                }
                
                return jsonify({
                    'recognized': True,
                    'student': student_data,
                    'confidence': confidence_percentage,
                    'face_detected': True,
                    'already_marked': existing_attendance is not None
                }), 200
            else:
                # No good match found
                confidence = 0
                if best_match_distance < 1.0:
                    # Calculate confidence percentage even for non-matches for debugging
                    confidence = round((1.0 - best_match_distance) * 100, 1)
                
                current_app.logger.info(f"Public recognition: No match found (best confidence: {confidence}%)")
                
                return jsonify({
                    'recognized': False,
                    'message': 'No matching student found in the database',
                    'confidence': confidence,
                    'face_detected': True
                }), 200
                
        except Exception as e:
            current_app.logger.error(f"Public recognition error: {str(e)}")
            return jsonify({
                'recognized': False,
                'message': f'Error processing image: {str(e)}',
                'confidence': 0
            }), 500

    @app.route('/api/admin/delete-student/<student_id>', methods=['DELETE'])
    @jwt_required()
    def delete_student(student_id):
        try:
            # Check if user is admin
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized. Only admin can delete students'}), 403
            
            # Get the student
            student = User.find_by_id(student_id)
            if not student:
                return jsonify({'error': 'Student not found'}), 404
            
            # Delete student data from all collections
            db = get_db()
            
            # Delete profile
            db.student_profiles.delete_many({'user_id': ObjectId(student_id)})
            
            # Delete attendance records
            db.attendance.delete_many({'student_id': ObjectId(student_id)})
            
            # Delete face data if exists
            db.face_data.delete_many({'user_id': ObjectId(student_id)})
            
            # Finally delete the user
            db.users.delete_one({'_id': ObjectId(student_id)})
            
            return jsonify({
                'success': True,
                'message': f'Student {student["name"]} has been deleted successfully'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error deleting student: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error deleting student: {str(e)}'
            }), 500

    # --- HOLIDAYS & OFF WEEKDAYS ROUTES ---

    @app.route('/api/admin/settings/off-weekdays', methods=['GET', 'PUT', 'OPTIONS'])
    @jwt_required()
    def manage_off_weekdays():
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            
            if request.method == 'GET':
                setting = db.settings.find_one({'key': 'off_weekdays'})
                # Default to Saturday (5) and Sunday (6)
                off_weekdays = setting.get('value', [5, 6]) if setting else [5, 6]
                return jsonify({'off_weekdays': off_weekdays}), 200
                
            elif request.method == 'PUT':
                data = request.json
                off_weekdays = data.get('off_weekdays', [])
                
                db.settings.update_one(
                    {'key': 'off_weekdays'},
                    {'$set': {'value': off_weekdays}},
                    upsert=True
                )
                return jsonify({'success': True, 'message': 'Off weekdays updated'}), 200

        except Exception as e:
            current_app.logger.error(f"Error in off-weekdays: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/admin/holidays', methods=['GET', 'POST', 'OPTIONS'])
    @jwt_required()
    def manage_holidays():
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            
            if request.method == 'GET':
                holidays = list(db.holidays.find().sort('date', 1))
                for h in holidays:
                    h['_id'] = str(h['_id'])
                return jsonify(holidays), 200
                
            elif request.method == 'POST':
                data = request.json
                date_str = data.get('date')
                name = data.get('name')
                
                if not date_str or not name:
                    return jsonify({'error': 'Date and name are required'}), 400
                    
                new_holiday = {
                    'date': date_str,
                    'name': name,
                    'created_at': datetime.datetime.now()
                }
                
                # Check if exists
                if db.holidays.find_one({'date': date_str}):
                    return jsonify({'error': 'Holiday for this date already exists'}), 400
                    
                result = db.holidays.insert_one(new_holiday)
                new_holiday['_id'] = str(result.inserted_id)
                
                return jsonify({'success': True, 'holiday': new_holiday}), 201

        except Exception as e:
            current_app.logger.error(f"Error in holidays: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/admin/holidays/<holiday_id>', methods=['DELETE', 'OPTIONS'])
    @jwt_required()
    def delete_holiday(holiday_id):
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            result = db.holidays.delete_one({'_id': ObjectId(holiday_id)})
            
            if result.deleted_count == 0:
                return jsonify({'error': 'Holiday not found'}), 404
                
            return jsonify({'success': True, 'message': 'Holiday deleted'}), 200

        except Exception as e:
            current_app.logger.error(f"Error deleting holiday: {str(e)}")
            return jsonify({'error': str(e)}), 500
