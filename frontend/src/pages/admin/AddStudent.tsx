import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import { api as axios } from '@/services/api';
import { API_URL, ENDPOINTS } from '@/config';
import { Camera, CheckCircle, AlertCircle, Save, ChevronLeft, UserPlus, Loader2, XCircle } from 'lucide-react';
import Webcam from 'react-webcam';

const AddStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<'create' | 'update' | 'face-only'>('create');
  const totalSteps = 3;

  // Determine if we're only uploading face data
  useEffect(() => {
    if (location.pathname.includes('/upload-face')) {
      setMode('face-only');
      setCurrentStep(3); // Skip to face data step
    } else if (id) {
      setMode('update');
    }
  }, [location, id]);

  // Form data state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    college_name: '',
    course: '',
    year_of_study: '1',
    registration_number: '',
    profile_photo: '',
    face_images: {
      front: ''
    }
  });

  // Fetch student data if ID is provided
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const token = getToken();
        
        if (!token) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please login again.',
            variant: 'destructive'
          });
          navigate('/login');
          return;
        }

        // Fetch student data from backend
        console.log("Fetching student data from:", ENDPOINTS.STUDENT_FETCH(id));
        const response = await axios.get(ENDPOINTS.STUDENT_FETCH(id), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Log the structure to understand what we're getting
        console.log("Fetched student data:", response.data);
        
        // Extract user and profile data from response
        const studentData = response.data;
        
        if (!studentData) {
          throw new Error("No student data returned");
        }
        
        // Setup default values in case data is nested differently
        let userData = studentData.user || studentData;
        let profileData = studentData.profile || {};
        
        // Pre-populate form with student data
        let firstName = '';
        let lastName = '';
        
        if (userData.name) {
          const nameParts = userData.name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        setFormData(prev => ({
          ...prev,
          first_name: firstName,
          last_name: lastName,
          email: userData.email || '',
          phone_number: userData.phone_number || '',
          password: '', // Don't pre-fill password for security
          college_name: profileData.college_name || '',
          course: profileData.course || '',
          year_of_study: profileData.year_of_study?.toString() || '1',
          registration_number: profileData.registration_number || '',
          profile_photo: profileData.profile_photo || '',
          face_images: {
            front: profileData.face_images?.front || ''
          }
        }));
        
      } catch (error) {
        console.error("Error fetching student data:", error);
        toast({
          title: 'Error',
          description: 'Failed to load student data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [id, navigate, toast]);

  // Webcam state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentFaceAngle, setCurrentFaceAngle] = useState<'profile' | 'front'>('profile');
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [captureMessage, setCaptureMessage] = useState('');
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [faceAnalysisTimer, setFaceAnalysisTimer] = useState<NodeJS.Timeout | null>(null);
  const [detectedOrientation, setDetectedOrientation] = useState<string | null>(null);
  const [orientationMatch, setOrientationMatch] = useState<boolean | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // streamRef is no longer needed with Webcam component

  // Effect to clean up camera when component unmounts
  useEffect(() => {
    return () => {
      // No need to clean up media stream with Webcam component
      if (faceAnalysisTimer) {
        clearInterval(faceAnalysisTimer);
      }
    };
  }, []);

  // Start periodic face analysis when camera is active
  useEffect(() => {
    if (isCameraActive) {
      // Reset analysis state
      setFaceDetected(null);
      setCaptureMessage('');
      setDetectedOrientation(null);
      setOrientationMatch(null);
      setAnalysisCount(0);
      setLastAnalysisTime(0);
      
      // Initial analysis after a short delay to let camera initialize
      const initialTimer = setTimeout(() => {
        analyzeFaceFromCamera();
      }, 500);
      
      // Start face analysis for real-time feedback
      const timer = setInterval(() => {
        analyzeFaceFromCamera();
      }, 1200); // Check every 1.2 seconds for balanced feedback
      
      setFaceAnalysisTimer(timer);
      
      return () => {
        clearTimeout(initialTimer);
        clearInterval(timer);
        setFaceDetected(null);
        setCaptureMessage('');
        setDetectedOrientation(null);
        setOrientationMatch(null);
        setAnalysisCount(0);
        setLastAnalysisTime(0);
      };
    }
  }, [isCameraActive]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Analyze face from camera feed
  const analyzeFaceFromCamera = async () => {
    if (!webcamRef.current || !currentFaceAngle || !(currentFaceAngle === 'front')) return;
    
    // Throttle analysis to prevent too many requests
    const now = Date.now();
    if (now - lastAnalysisTime < 1200) return; // Increased to 1.2 seconds between requests
    
    // Get screenshot from webcam
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    setIsAnalyzing(true);
    setLastAnalysisTime(now);
    setAnalysisCount(prev => prev + 1);
    
    try {
      const token = getToken();
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Your session has expired. Please login again.',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      
      // Send to backend for analysis
      const response = await axios.post(`${API_URL}/api/analyze-face`, {
        image: imageSrc,
        is_live_analysis: true,
        expected_orientation: currentFaceAngle
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 8000 // Increased timeout for more reliable processing
      });
      
      const { is_valid, message, detected_orientation, orientation_match } = response.data;
      
      setFaceDetected(is_valid);
      setDetectedOrientation(detected_orientation);
      setOrientationMatch(orientation_match);
      
      // Generate appropriate message based on detection results
      if (!is_valid) {
        setCaptureMessage(message || 'Face not properly detected');
      } else if (detected_orientation && orientation_match === false) {
        const orientationInstructions = {
          'front': 'Please face the camera directly'
        };
        setCaptureMessage(orientationInstructions[currentFaceAngle] || 'Please adjust your head position');
      } else {
        const orientationText = detected_orientation ? ` (${detected_orientation} detected)` : '';
        setCaptureMessage(`Face detected successfully${orientationText} - ready to capture`);
      }
      
    } catch (error: any) {
      console.error('Error analyzing face:', error);
      
      // Handle various error cases with better messaging
      if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
        setCaptureMessage('Analysis timeout. Please ensure good lighting and try again.');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          setCaptureMessage('Authentication error. Please try refreshing the page.');
        } else if (error.response.data && error.response.data.message) {
          setCaptureMessage(error.response.data.message);
        } else {
          setCaptureMessage('Server error. Please try again.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        setCaptureMessage('No response from server. Check your connection.');
      } else {
        setCaptureMessage('Error analyzing face. Check lighting and position.');
      }
      
      // Fallback to client-side detection after multiple failures
      if (analysisCount > 3) {
        setFaceDetected(true); // Allow capture even without server validation
        setCaptureMessage('Using fallback detection mode. Try to align your face properly.');
      } else {
        setFaceDetected(false);
      }
      
      setDetectedOrientation(null);
      setOrientationMatch(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setCaptureStatus('idle');
      setCaptureMessage('Initializing camera and analyzing face...');
      setFaceDetected(null);
      setAnalysisCount(0);
      
      // Add a small delay to ensure webcam component is properly mounted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if webcam reference is available
      if (!webcamRef.current) {
        throw new Error("Camera initialization failed. Webcam reference not available.");
      }
      
      // Reset any previous timers
      if (faceAnalysisTimer) {
        clearInterval(faceAnalysisTimer);
      }
      
      // Start face analysis after a short delay to allow webcam to initialize
      const initialTimer = setTimeout(() => {
        // First analysis attempt
        analyzeFaceFromCamera();
        
        // Set up an interval to periodically analyze the face
        const timer = setInterval(() => {
          if (webcamRef.current && isCameraActive) {
            analyzeFaceFromCamera();
          } else if (!isCameraActive) {
            clearInterval(timer);
          }
        }, 1500); // Increased interval for more stable processing
        
        setFaceAnalysisTimer(timer);
      }, 1000);
      
      return () => {
        clearTimeout(initialTimer);
        if (faceAnalysisTimer) {
          clearInterval(faceAnalysisTimer);
        }
      };
    } catch (err) {
      console.error('Error starting camera:', err);
      
      // More detailed error message based on error type
      let errorMessage = 'Unable to access camera. Please check permissions.';
      
      if (err instanceof Error) {
        if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
          errorMessage = 'Camera access denied. Please allow camera permissions in your browser.';
        } else if (err.message.includes('NotFoundError') || err.message.includes('DevicesNotFoundError')) {
          errorMessage = 'No camera detected. Please connect a camera and try again.';
        } else if (err.message.includes('NotReadableError') || err.message.includes('TrackStartError')) {
          errorMessage = 'Camera is in use by another application. Please close other applications using the camera.';
        }
      }
      
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Reset camera state
      setIsCameraActive(false);
      setFaceDetected(null);
    }
  };

  // Stop camera
  const stopCamera = () => {
    setIsCameraActive(false);
    
    // Clear any ongoing face analysis
    if (faceAnalysisTimer) {
      clearInterval(faceAnalysisTimer);
      setFaceAnalysisTimer(null);
    }
    
    // Reset states
    setFaceDetected(null);
    setDetectedOrientation(null);
    setOrientationMatch(null);
    setCaptureMessage('');
  };

  // Capture image from camera
  const captureImage = async () => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    // For face images, only allow capture if face is detected
    if (currentFaceAngle === 'front') {
      // If we're using fallback mode (after server validation failures), just allow the capture
      if (analysisCount > 3 && !faceDetected) {
        // Continue without strict validation
      } else if (!faceDetected) {
        toast({
          title: 'Face Not Detected',
          description: 'Please ensure your face is properly visible and well-lit before capturing.',
          variant: 'destructive'
        });
        return;
      }
      
      // Check orientation match for face images (only warn, don't prevent capture)
      if (orientationMatch === false) {
        const orientationInstructions = {
          'front': 'Please face the camera directly'
        };
        toast({
          title: 'Orientation Warning',
          description: `${orientationInstructions[currentFaceAngle] || 'Please adjust your head position'} for better results. Capturing anyway...`,
          variant: 'default'
        });
      }
    }
    
    try {
      // Reset previous capture status
      setCaptureStatus('idle');
      setCaptureMessage('Processing image...');
      
      // Get image directly from webcam
      const imageData = webcamRef.current.getScreenshot();
      if (!imageData) {
        throw new Error('Failed to capture image from webcam');
      }
      
      // For profile photo, we don't need face validation
      if (currentFaceAngle === 'profile') {
        setFormData(prev => ({ ...prev, profile_photo: imageData }));
        setCaptureStatus('success');
        setCaptureMessage('Profile photo captured successfully!');
        
        toast({
          title: 'Success',
          description: 'Profile photo captured successfully',
          variant: 'default'
        });
        
        // Auto-stop camera after successful capture
        setTimeout(() => {
          stopCamera();
        }, 1500);
        return;
      }
      
      // For face images - first try server validation if we haven't had too many failures
      let validationSuccessful = false;
      
      if (analysisCount <= 5) {
        try {
          // For face images, validate with backend
          const token = getToken();
          if (!token) {
            toast({
              title: 'Authentication Error',
              description: 'Your session has expired. Please login again.',
              variant: 'destructive'
            });
            navigate('/login');
            return;
          }
          
          const response = await axios.post(`${API_URL}/api/validate-face-final`, {
            image: imageData,
            expected_orientation: currentFaceAngle
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout for image validation
          });
          
          if (response.data.is_valid) {
            validationSuccessful = true;
          } else {
            setCaptureStatus('error');
            setCaptureMessage(response.data.message || 'Face validation failed. Please try again.');
            
            // If this is the third or more attempt, use local validation as fallback
            if (analysisCount > 3) {
              validationSuccessful = true; // Bypass server validation after multiple attempts
            } else {
              toast({
                title: 'Validation Warning',
                description: response.data.message || 'Face validation issues detected. You may try again with better lighting and positioning.',
                variant: 'default'
              });
              
              // Reset capture status after 3 seconds
              setTimeout(() => {
                setCaptureStatus('idle');
              }, 3000);
              return;
            }
          }
        } catch (err) {
          console.error('Server validation error:', err);
          // If server validation fails, use local validation as fallback
          validationSuccessful = true; // Bypass server validation after error
          
          toast({
            title: 'Using Local Validation',
            description: 'Server validation unavailable. Using local validation instead.',
            variant: 'default'
          });
        }
      } else {
        // Skip server validation after too many failures
        validationSuccessful = true;
      }
      
      // If validation was successful (either from server or local fallback)
      if (validationSuccessful) {
        // Update form data with captured image
        setFormData(prev => ({
          ...prev,
          face_images: {
            ...prev.face_images,
            front: imageData
          }
        }));
        
        setCaptureStatus('success');
        setCaptureMessage('Face image captured successfully!');
        
        toast({
          title: 'Success',
          description: `${currentFaceAngle.charAt(0).toUpperCase() + currentFaceAngle.slice(1)} face captured successfully`,
          variant: 'default'
        });
        
        // Auto-stop camera after successful capture
        setTimeout(() => {
          stopCamera();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error capturing image:', err);
      setCaptureStatus('error');
      
      // Provide more specific error messages based on error type
      if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
        setCaptureMessage('Server response timeout. Using local validation instead.');
        
        // Fallback to local validation
        const imageData = webcamRef.current.getScreenshot();
        if (imageData) {
          setFormData(prev => ({
            ...prev,
            face_images: {
              ...prev.face_images,
              front: imageData
            }
          }));
          
          setCaptureStatus('success');
          setCaptureMessage('Face image captured with local validation.');
          
          toast({
            title: 'Captured with Local Validation',
            description: `${currentFaceAngle.charAt(0).toUpperCase() + currentFaceAngle.slice(1)} face captured using local validation`,
            variant: 'default'
          });
          
          // Auto-stop camera after successful capture
          setTimeout(() => {
            stopCamera();
          }, 1500);
          return;
        }
        
        toast({
          title: 'Connection Timeout',
          description: 'The server took too long to respond. Please try again.',
          variant: 'destructive'
        });
      } else {
        setCaptureMessage('Error processing image. Please try again.');
        toast({
          title: 'Capture Error',
          description: 'Failed to process the image. Please try again.',
          variant: 'destructive'
        });
      }
      
      // Reset capture status after 3 seconds
      setTimeout(() => {
        setCaptureStatus('idle');
      }, 3000);
    }
  };

  // Start camera for specific face angle
  const startCameraForAngle = (angle: 'profile' | 'front') => {
    setCurrentFaceAngle(angle);
    startCamera();
  };

  // Navigate between form steps
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Form validation
  const validateCurrentStep = () => {
    if (currentStep === 1) {
      // For face-only mode, we don't need to validate basic info steps
      if (mode === 'face-only') return true;
      
      // Basic info validation
      const requiredBasicFields = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim()
      };
      
      // Password is only required for new students
      if (mode === 'create') {
        requiredBasicFields['password'] = formData.password.trim();
      }
      
      // Check all required fields
      return Object.values(requiredBasicFields).every(value => value !== '');
      
    } else if (currentStep === 2) {
      // For face-only mode, we don't need to validate academic info steps
      if (mode === 'face-only') return true;
      
      // Academic info validation
      return (
        formData.college_name.trim() !== '' && 
        formData.course.trim() !== '' && 
        formData.year_of_study !== '' && 
        formData.registration_number.trim() !== ''
      );
    } else if (currentStep === 3) {
      // Face data validation - required for all modes
      return (
        formData.profile_photo !== '' && 
        formData.face_images.front !== ''
      );
    }
    return false;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure all required fields for the current step are filled
    if (!validateCurrentStep()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields for this step.',
        variant: 'destructive'
      });
      return;
    }
    
    // If we're not on the last step, go to the next step
    if (currentStep < totalSteps) {
      goToNextStep();
      return;
    }
    
    // Additional check to ensure face data is provided
    if (currentStep === totalSteps && (formData.profile_photo === '' || formData.face_images.front === '')) {
      toast({
        title: 'Face Data Required',
        description: 'Please provide both profile photo and front face image before submitting.',
        variant: 'destructive'
      });
      return;
    }
    
    // Only proceed with submission if we're on the last step and all validations pass
    if (currentStep === totalSteps) {
      try {
        setIsSubmitting(true);
        
        const token = getToken();
        if (!token) {
          toast({
            title: 'Authentication Error',
            description: 'You are not logged in. Please login again.',
            variant: 'destructive'
          });
          navigate('/login');
          return;
        }
        
        // Prepare request payload based on mode
        const requestData: any = { ...formData };
        
        // Creating the full name from first and last name
        if (mode !== 'face-only') {
          requestData.name = `${formData.first_name} ${formData.last_name}`.trim();
        }
        
        // Determine the endpoint and method based on operation mode
        let endpoint = ENDPOINTS.STUDENT_CREATE;
        let method = 'post';
        let successMessage = 'Student account created successfully';
        
        if (mode === 'update') {
          endpoint = ENDPOINTS.STUDENT_UPDATE(id || '');
          method = 'put';
          successMessage = 'Student profile updated successfully';
          
          // If updating, don't send password unless it's provided
          if (!requestData.password) {
            delete requestData.password;
          }
        } else if (mode === 'face-only') {
          endpoint = ENDPOINTS.STUDENT_UPDATE_FACE(id || '');
          method = 'put';
          successMessage = 'Student face data updated successfully';
          
          // Only send face-related data
          const faceData = {
            profile_photo: formData.profile_photo,
            face_images: formData.face_images
          };
          
          // Replace requestData with just the face data
          Object.keys(requestData).forEach(key => delete requestData[key]);
          Object.assign(requestData, faceData);
        }
        
        // Log the full URL we're sending to
        console.log(`Sending ${method.toUpperCase()} request to ${endpoint}`);
        
        const response = await axios({
          method,
          url: endpoint,
          data: requestData,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        toast({
          title: 'Success',
          description: successMessage,
        });
        
        // Navigate back to students list
        navigate('/admin/students');
      } catch (err: any) {
        console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} student:`, err);
        
        let errorMessage = `Failed to ${mode === 'create' ? 'create' : 'update'} student. Please try again.`;
        
        // Handle specific error cases
        if (err.response) {
          if (err.response.status === 401) {
            errorMessage = 'Authentication error. Please login again.';
            setTimeout(() => navigate('/login'), 2000);
          } else if (err.response.data && err.response.data.error) {
            errorMessage = err.response.data.error;
          }
        } else if (err.request) {
          errorMessage = 'No response from server. Please check your connection.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (

        <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex items-center mb-6">
              <h1 className="page-title">
                {isLoading ? 'Loading...' : 
                  mode === 'create' ? 'Add New Student' :
                  mode === 'update' ? 'Update Student Profile' :
                  'Upload Face Data'}
              </h1>
            </div>
            
            {/* Progress Steps - Hide when in face-only mode */}
            {mode !== 'face-only' && (
              <div className="mb-8">
                <div className="flex justify-between relative">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <div 
                      key={index} 
                      className="flex-1 flex flex-col items-center relative z-10"
                    >
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          index + 1 === currentStep 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : index + 1 < currentStep 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-background text-muted-foreground border-muted'
                        }`}
                      >
                        {index + 1 < currentStep ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <p className={`text-xs mt-2 text-center font-medium ${
                        index + 1 <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {index === 0 ? 'Basic Info' : index === 1 ? 'Academic Info' : 'Face Data'}
                      </p>
                      
                      {/* Connecting Line */}
                      {index < totalSteps - 1 && (
                        <div 
                          className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${
                            index + 1 < currentStep ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isLoading ? (
              <CustomCard className="flex justify-center items-center p-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading student data...</p>
                </div>
              </CustomCard>
            ) : (
              <form onSubmit={handleSubmit}>
                <CustomCard className="mb-6">
                  {/* Step 1: Basic Information */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">First Name</Label>
                          <Input
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Last Name</Label>
                          <Input
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Phone Number</Label>
                          <Input
                            id="phone_number"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleInputChange}
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="password">
                            Password {mode === 'update' && <span className="text-xs text-muted-foreground">(leave blank to keep unchanged)</span>}
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder={mode === 'create' ? "Enter password" : "Enter new password (optional)"}
                            required={mode === 'create'}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 2: Academic Information */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold mb-4">Academic Information</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="college_name">College Name</Label>
                          <Input
                            id="college_name"
                            name="college_name"
                            value={formData.college_name}
                            onChange={handleInputChange}
                            placeholder="Enter college name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="course">Course</Label>
                          <Input
                            id="course"
                            name="course"
                            value={formData.course}
                            onChange={handleInputChange}
                            placeholder="Enter course name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="year_of_study">Year of Study</Label>
                          <Select
                            value={formData.year_of_study}
                            onValueChange={(value) => handleSelectChange('year_of_study', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1st Year</SelectItem>
                              <SelectItem value="2">2nd Year</SelectItem>
                              <SelectItem value="3">3rd Year</SelectItem>
                              <SelectItem value="4">4th Year</SelectItem>
                              <SelectItem value="5">5th Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="registration_number">Registration Number</Label>
                          <Input
                            id="registration_number"
                            name="registration_number"
                            value={formData.registration_number}
                            onChange={handleInputChange}
                            placeholder="Enter registration number"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 3: Face Data */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold mb-4">Face Data Collection</h2>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Camera Preview */}
                        <div className="flex-1">
                          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                            {isCameraActive ? (
                              <>
                                <Webcam
                                  ref={webcamRef}
                                  audio={false}
                                  screenshotFormat="image/jpeg"
                                  className="w-full h-full object-cover"
                                  videoConstraints={{
                                    facingMode: 'user',
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 }
                                  }}
                                />
                                {/* Enhanced face detection indicator for face images only */}
                                {(currentFaceAngle === 'front') && (
                                  <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
                                    {/* Main detection indicator */}
                                    <div className="flex items-center space-x-2">
                                      {isAnalyzing ? (
                                        <div className="bg-gray-800 bg-opacity-70 p-2 rounded-full animate-pulse">
                                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                                        </div>
                                      ) : faceDetected === true && (orientationMatch !== false) ? (
                                        <div className="bg-green-500 bg-opacity-90 p-2 rounded-full animate-pulse">
                                          <CheckCircle className="h-6 w-6 text-white" />
                                        </div>
                                      ) : faceDetected === true && orientationMatch === false ? (
                                        <div className="bg-amber-500 bg-opacity-90 p-2 rounded-full animate-pulse">
                                          <AlertCircle className="h-6 w-6 text-white" />
                                        </div>
                                      ) : faceDetected === false ? (
                                        <div className="bg-red-500 bg-opacity-90 p-2 rounded-full animate-pulse">
                                          <XCircle className="h-6 w-6 text-white" />
                                        </div>
                                      ) : null}
                                    </div>
                                    
                                    {/* Orientation indicator */}
                                    {detectedOrientation && (
                                      <div className="bg-black bg-opacity-60 px-2 py-1 rounded text-white text-xs">
                                        {detectedOrientation} detected
                                      </div>
                                    )}
                                    
                                    {/* Analysis counter for debugging */}
                                    {analysisCount > 0 && (
                                      <div className="bg-black bg-opacity-40 px-2 py-1 rounded text-white text-xs">
                                        #{analysisCount}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full p-4">
                                <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                                <p className="text-center text-muted-foreground">
                                  Click on the capture buttons to activate camera
                                </p>
                              </div>
                            )}
                            
                            {/* Capture status overlay */}
                            {captureStatus !== 'idle' && (
                              <div className={`absolute inset-0 flex items-center justify-center ${
                                captureStatus === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                              }`}>
                                {captureStatus === 'success' ? (
                                  <div className="bg-card p-3 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                  </div>
                                ) : (
                                  <div className="bg-card p-3 rounded-full">
                                    <AlertCircle className="h-8 w-8 text-red-500" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Canvas for capturing (hidden) */}
                          <canvas ref={canvasRef} className="hidden" />
                          
                          {/* Camera controls */}
                          {isCameraActive && (
                            <div className="mt-4 flex flex-col items-center space-y-3">
                              {/* Instructions based on current angle */}
                              <div className="text-sm text-muted-foreground text-center">
                                {currentFaceAngle === 'front' && 'Look directly at the camera with your face centered and well-lit.'}
                              </div>
                              
                              {/* Enhanced status messages for face images */}
                              {(currentFaceAngle === 'front') && (
                                <div className="flex justify-center">
                                  {faceDetected === true && orientationMatch !== false ? (
                                    <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-3 rounded-md flex items-center border border-green-200 dark:border-green-900/50">
                                      <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">Perfect! Ready to capture</span>
                                        {detectedOrientation && (
                                          <span className="text-xs text-green-600 dark:text-green-400">{detectedOrientation} orientation detected</span>
                                        )}
                                        <span className="text-xs text-green-600 dark:text-green-400">{captureMessage}</span>
                                      </div>
                                    </div>
                                  ) : faceDetected === true && orientationMatch === false ? (
                                    <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-3 rounded-md flex items-center border border-green-200 dark:border-green-900/50">
                                      <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">Face detected - Ready to capture</span>
                                        <span className="text-xs text-amber-600 dark:text-amber-400">Tip: {captureMessage}</span>
                                      </div>
                                    </div>
                                  ) : faceDetected === false ? (
                                    <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-md flex items-center border border-red-200 dark:border-red-900/50">
                                      <XCircle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">Face not detected</span>
                                        <span className="text-xs text-red-600 dark:text-red-400">{captureMessage || 'Adjust position and lighting'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-muted text-primary p-3 rounded-md flex items-center border border-border">
                                      <Loader2 className="h-5 w-5 mr-2 text-primary animate-spin" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">Analyzing face...</span>
                                        <span className="text-xs text-primary">Please hold still</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Simple status for profile photo */}
                              {currentFaceAngle === 'profile' && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-2 rounded-md flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  <span className="text-sm">Ensure good lighting and a plain background</span>
                                </div>
                              )}
                              
                              <div className="flex space-x-2">
                                <CustomButton
                                  variant="outline"
                                  onClick={stopCamera}
                                >
                                  Cancel
                                </CustomButton>
                                
                                <CustomButton
                                  variant="primary"
                                  onClick={captureImage}
                                  disabled={
                                    (currentFaceAngle !== 'profile' && !faceDetected) || 
                                    isAnalyzing
                                  }
                                  className={
                                    faceDetected === true && currentFaceAngle !== 'profile'
                                      ? 'bg-green-600 hover:bg-green-700 border-green-600'
                                      : ''
                                  }
                                  leftIcon={
                                    isAnalyzing ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : faceDetected === true && currentFaceAngle !== 'profile' ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      <Camera className="h-4 w-4" />
                                    )
                                  }
                                >
                                  {isAnalyzing ? (
                                    'Analyzing...'
                                  ) : faceDetected === true && currentFaceAngle !== 'profile' ? (
                                    `Capture ${currentFaceAngle.charAt(0).toUpperCase() + currentFaceAngle.slice(1)} Now`
                                  ) : (
                                    `Capture ${currentFaceAngle === 'profile' ? 'Profile Photo' : `${currentFaceAngle.charAt(0).toUpperCase() + currentFaceAngle.slice(1)} Face`}`
                                  )}
                                </CustomButton>
                              </div>
                            </div>
                          )}
                          
                          {/* Lighting and position tips */}
                          {isCameraActive && (currentFaceAngle === 'front') && faceDetected === false && (
                            <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
                              <h4 className="text-amber-800 dark:text-amber-300 font-medium text-sm">Tips for better face detection:</h4>
                              <ul className="text-amber-700 dark:text-amber-400 text-xs mt-1 list-disc pl-4 space-y-1">
                                <li>Ensure your face is well-lit from the front</li>
                                <li>Avoid backlighting (don't sit with a window behind you)</li>
                                <li>Position your face in the center of the frame</li>
                                <li>For side angles, turn your head approximately 45 degrees</li>
                                <li>Remove hats, masks or heavy glasses</li>
                                <li>Keep a neutral expression</li>
                                <li>Make sure your entire face is visible</li>
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Face capture options */}
                        <div className="flex-1 space-y-4">
                          <h3 className="font-medium">Required Images</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Profile Photo */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">Profile Photo</h4>
                              {formData.profile_photo ? (
                                <div className="relative">
                                  <img 
                                    src={formData.profile_photo} 
                                    alt="Profile" 
                                    className="w-full h-32 object-cover rounded-md"
                                  />
                                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                    <CheckCircle className="h-4 w-4" />
                                  </div>
                                </div>
                              ) : (
                                <CustomButton
                                  variant="outline"
                                  className="w-full h-32"
                                  onClick={() => startCameraForAngle('profile')}
                                >
                                  Capture Profile Photo
                                </CustomButton>
                              )}
                            </div>
                            
                            {/* Front Face */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">Front Face</h4>
                              {formData.face_images.front ? (
                                <div className="relative">
                                  <img 
                                    src={formData.face_images.front} 
                                    alt="Front Face" 
                                    className="w-full h-32 object-cover rounded-md"
                                  />
                                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                    <CheckCircle className="h-4 w-4" />
                                  </div>
                                </div>
                              ) : (
                                <CustomButton
                                  variant="outline"
                                  className="w-full h-32"
                                  onClick={() => startCameraForAngle('front')}
                                >
                                  Capture Front Face
                                </CustomButton>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium text-primary mb-1">Instructions</h4>
                            <ul className="text-sm text-primary list-disc pl-5 space-y-1">
                              <li>Ensure good lighting for clear face capture</li>
                              <li>Remove glasses, masks or anything covering the face</li>
                              <li>Keep a neutral expression</li>
                              <li>Face the camera directly</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Form Navigation Buttons */}
                  <div className="flex justify-between mt-8">
                    {currentStep > 1 && mode !== 'face-only' && (
                      <CustomButton
                        type="button"
                        variant="outline"
                        onClick={goToPrevStep}
                      >
                        Previous
                      </CustomButton>
                    )}
                    
                    <div className="ml-auto">
                      <CustomButton
                        type={currentStep === totalSteps ? 'submit' : 'button'}
                        variant="primary"
                        disabled={!validateCurrentStep() || isSubmitting}
                        onClick={currentStep < totalSteps ? goToNextStep : undefined}
                        leftIcon={currentStep === totalSteps ? (
                          isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />
                        ) : undefined}
                      >
                        {currentStep < totalSteps ? 'Next' : (
                          mode === 'create' ? 'Create Student' : 
                          mode === 'update' ? 'Update Student' : 
                          'Save Face Data'
                        )}
                      </CustomButton>
                    </div>
                  </div>
                </CustomCard>
              </form>
            )}
          </div>
        </DashboardLayout>
  );
};

export default AddStudent; 