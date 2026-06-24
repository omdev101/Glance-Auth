import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/App';
import { studentService } from '@/services/api';
import { Camera, AlertCircle, Upload, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { API_URL } from '@/config';

const ProfileCompletion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  
  // Form data
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [faceImages, setFaceImages] = useState<Record<string, string>>({
    front: ''
  });
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [faceValidationErrors, setFaceValidationErrors] = useState<Record<string, string>>({});
  
  // Webcam
  const webcamRef = useRef<Webcam>(null);
  const [captureMode, setCaptureMode] = useState<'profile' | 'front' | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [faceAnalysisTimer, setFaceAnalysisTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [captureMessage, setCaptureMessage] = useState('');
  const [detectedOrientation, setDetectedOrientation] = useState<string | null>(null);
  const [orientationMatch, setOrientationMatch] = useState<boolean | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const [autoCapture, setAutoCapture] = useState(true); // Default to auto-capture enabled
  const [captureDelay, setCaptureDelay] = useState<NodeJS.Timeout | null>(null);
  const [successfulDetectionTime, setSuccessfulDetectionTime] = useState(0);
  const [stableFaceDetected, setStableFaceDetected] = useState(false);
  
  // Fetch user and profile data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const profileResponse = await studentService.getStudentProfile();
        setProfileData(profileResponse.data.profile);
        setUserData(profileResponse.data.user);
        
        // If profile exists, pre-fill the form
        if (profileResponse.data.profile) {
          const profile = profileResponse.data.profile;
          setCollegeName(profile.college_name || '');
          setCourse(profile.course || '');
          setYearOfStudy(profile.year_of_study || '');
          setRegistrationNumber(profile.registration_number || '');
          setProfilePhoto(profile.profile_photo || '');
          
          // Set face images if they exist
          if (profile.face_images) {
            setFaceImages({
              front: profile.face_images.front || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching student profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your profile information',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  // Start face analysis when webcam is opened
  useEffect(() => {
    if (captureMode) {
      // Reset analysis state
      setFaceDetected(null);
      setCaptureMessage('');
      setDetectedOrientation(null);
      setOrientationMatch(null);
      setAnalysisCount(0);
      setLastAnalysisTime(0);
      setStableFaceDetected(false);
      
      // Initial analysis after a short delay to let camera initialize
      const initialTimer = setTimeout(() => {
        analyzeFaceFromWebcam();
      }, 1000); // Increased from 500ms to give camera more time to initialize
      
      // Start face analysis for real-time feedback with adaptive interval
      const timer = setInterval(() => {
        // Only attempt a new analysis if:
        // 1. We're not currently analyzing
        // 2. We haven't detected a stable face OR
        // 3. If we have a stable face, ensure we've waited at least 5 seconds since detection
        if (!isAnalyzing && 
            (!stableFaceDetected || 
             (stableFaceDetected && Date.now() - successfulDetectionTime > 5000))) {
          analyzeFaceFromWebcam();
        }
      }, 2000); // Keep at 2000ms interval but with better logic to prevent frequent analyses
      
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
  }, [captureMode, isAnalyzing]);
  
  // Analyze face from webcam feed
  const analyzeFaceFromWebcam = async () => {
    if (!webcamRef.current || !(captureMode === 'front')) return;
    
    // Throttle analysis to prevent too many requests
    const now = Date.now();
    if (now - lastAnalysisTime < 1000) return; // Minimum 1 second between requests
    
    // If we have a stable face detection, don't analyze immediately (allow more time for capture)
    // Increased window from 3000ms to 5000ms to give users more time to capture
    if (stableFaceDetected && now - successfulDetectionTime < 5000) {
      return;
    }
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    // Performance optimization: Resize large images before sending to server
    let processedImage = imageSrc;
    try {
      // Check if image is too large (larger than ~150KB)
      if (imageSrc.length > 150000) {
        // Create an image element to resize
        const img = new Image();
        img.src = imageSrc;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        // Resize image if needed
        if (img.width > 640 || img.height > 480) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 640x480 for better performance)
          const ratio = Math.min(640 / img.width, 480 / img.height);
          canvas.width = Math.floor(img.width * ratio);
          canvas.height = Math.floor(img.height * ratio);
          
          // Draw resized image
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get as JPEG with reduced quality
          processedImage = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    } catch (error) {
      console.warn('Image resize failed, using original image:', error);
    }
    
    setIsAnalyzing(true);
    setLastAnalysisTime(now);
    setAnalysisCount(prev => prev + 1);
    
    try {
      // Adaptive timeout based on previous performance
      const timeoutDuration = 12000; // Default 12 seconds timeout
      
      // Call backend API to analyze face with orientation detection
      const response = await axios.post(`${API_URL}/api/analyze-face`, {
        image: processedImage,
        is_live_analysis: true,
        expected_orientation: captureMode,
        skip_orientation: analysisCount > 5 // Skip orientation detection after several attempts to improve performance
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: timeoutDuration
      });
      
      const { is_valid, message, detected_orientation, orientation_match, processing_time_ms } = response.data;
      
      // If server response includes processing time, adjust our analysis interval
      if (processing_time_ms && processing_time_ms > 1000) {
        // If processing takes more than 1 second, add some buffer to our interval
        const newInterval = processing_time_ms + 500; 
        // Update state for next time
        setLastAnalysisTime(now + newInterval - 1000);
      }
      
      setFaceDetected(is_valid);
      setDetectedOrientation(detected_orientation);
      setOrientationMatch(orientation_match);
      
      // Generate appropriate message based on detection results
      if (!is_valid) {
        setCaptureMessage(message || 'Face not properly detected');
        setStableFaceDetected(false);
      } else if (detected_orientation && orientation_match === false) {
        const orientationInstructions = {
          'front': 'Please face the camera directly',
          'left': 'Please turn your head to the left',
          'right': 'Please turn your head to the right'
        };
        setCaptureMessage(orientationInstructions[captureMode] || 'Please adjust your head position');
        setStableFaceDetected(false);
      } else {
        const orientationText = detected_orientation ? ` (${detected_orientation} detected)` : '';
        setCaptureMessage(`Face detected successfully${orientationText} - ready to capture`);
        
        // Mark successful detection time for auto-capture with current time
        const currentTime = Date.now();
        setSuccessfulDetectionTime(currentTime);
        
        // Set stable face detection state
        setStableFaceDetected(true);
        
        // Implement auto-capture logic with longer delay
        if (autoCapture && !captureDelay) {
          // Wait 3 seconds to make sure the face position is stable (increased from 1.5 seconds)
          const delay = setTimeout(() => {
            // Only proceed if we still have stable detection
            if (stableFaceDetected) {
              captureImage();
            }
            setCaptureDelay(null);
          }, 3000); // Increased from 1500ms to 3000ms
          
          setCaptureDelay(delay);
        }
      }
      
    } catch (error: any) {
      console.error('Error analyzing face:', error);
      
      // Handle timeout or network errors gracefully
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setCaptureMessage('Analysis timeout. Please ensure good lighting and stable internet connection.');
        
        // Slow down the analysis rate when experiencing timeouts
        setLastAnalysisTime(now + 3000); // Add extra delay before next attempt
      } else if (error.response) {
        // Handle server response errors
        setCaptureMessage(`Server error: ${error.response.status}. Please try again later.`);
      } else if (error.request) {
        // Handle network errors
        setCaptureMessage('Network error. Please check your connection.');
      } else {
        setCaptureMessage('Error analyzing face. Please check lighting and position.');
      }
      
      setFaceDetected(false);
      setDetectedOrientation(null);
      setOrientationMatch(null);
      setStableFaceDetected(false);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Cleanup capture delay on unmount
  useEffect(() => {
    return () => {
      if (captureDelay) {
        clearTimeout(captureDelay);
      }
    };
  }, [captureDelay]);
  
  // Handle form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!collegeName.trim()) newErrors.collegeName = 'College name is required';
    if (!course.trim()) newErrors.course = 'Course is required';
    if (!yearOfStudy.trim()) newErrors.yearOfStudy = 'Year of study is required';
    if (!registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required';
    if (!profilePhoto) newErrors.profilePhoto = 'Profile photo is required';
    
    // Validate face images
    const faceErrors: Record<string, string> = {};
    if (!faceImages.front) faceErrors.front = 'Front face image is required';
    
    setErrors(newErrors);
    setFaceValidationErrors(faceErrors);
    
    return Object.keys(newErrors).length === 0 && Object.keys(faceErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = {
        college_name: collegeName,
        course,
        year_of_study: yearOfStudy,
        registration_number: registrationNumber,
        profile_photo: profilePhoto,
        face_images: faceImages
      };
      
      // Determine if we're creating or updating the profile
      let response;
      if (profileData) {
        response = await studentService.updateStudentProfile(formData);
      } else {
        response = await studentService.createStudentProfile(formData);
      }
      
      toast({
        title: 'Success',
        description: response.data.message,
      });
      
      // Navigate back to dashboard
      navigate('/student/dashboard');
    } catch (error: any) {
      console.error('Profile submission error:', error);
      
      // Clear all previous errors
      setErrors({});
      setFaceValidationErrors({});
      
      // Handle different types of errors
      if (error.response?.data) {
        const responseData = error.response.data;
        
        // Handle field-specific errors
        if (responseData.field) {
          switch (responseData.field) {
            case 'profile_photo':
              setErrors(prev => ({ ...prev, profilePhoto: responseData.error }));
              toast({
                title: 'Profile Photo Error',
                description: responseData.error,
                variant: 'destructive'
              });
              break;
            case 'face_images':
              if (responseData.missing_angles) {
                const newFaceErrors: Record<string, string> = {};
                responseData.missing_angles.forEach((angle: string) => {
                  newFaceErrors[angle] = `${angle.charAt(0).toUpperCase() + angle.slice(1)} face image is required`;
                });
                setFaceValidationErrors(newFaceErrors);
              }
              toast({
                title: 'Face Images Error',
                description: responseData.error,
                variant: 'destructive'
              });
              break;
            default:
              // For other field errors
              toast({
                title: 'Validation Error',
                description: responseData.error,
                variant: 'destructive'
              });
          }
        }
        // Handle face validation errors
        else if (responseData.error === 'Face validation failed' && responseData.validation_results) {
          setFaceValidationErrors(responseData.validation_results);
          
          // Find the first face error to focus on that section
          const firstErrorAngle = Object.keys(responseData.validation_results)[0];
          const errorMessage = responseData.validation_results[firstErrorAngle];
          
          toast({
            title: 'Face Validation Failed',
            description: `${firstErrorAngle.charAt(0).toUpperCase() + firstErrorAngle.slice(1)} face image: ${errorMessage}`,
            variant: 'destructive'
          });
          
          // Scroll to the face images section
          const faceImagesSection = document.getElementById('face-images-section');
          if (faceImagesSection) {
            faceImagesSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
        // Generic error
        else if (responseData.error) {
          toast({
            title: 'Error',
            description: responseData.error,
            variant: 'destructive'
          });
        }
      } else {
        // Network or other errors
        toast({
          title: 'Error',
          description: 'Failed to submit your profile. Please check your connection and try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Capture image from webcam
  const captureImage = () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    // For face images, only allow capture if face is detected and valid
    if (captureMode === 'front') {
      if (!faceDetected) {
        toast({
          title: 'Invalid Face Position',
          description: 'Please ensure your face is properly visible and well-lit before capturing.',
          variant: 'destructive'
        });
        return;
      }
      
      // Check orientation match for face images (only warn, don't prevent capture)
      if (orientationMatch === false) {
        const orientationInstructions = {
          'front': 'Please face the camera directly',
          'left': 'Please turn your head to the left',
          'right': 'Please turn your head to the right'
        };
        toast({
          title: 'Orientation Warning',
          description: `${orientationInstructions[captureMode] || 'Please adjust your head position'} for better results. Capturing anyway...`,
          variant: 'default'
        });
        // Don't return - allow capture to proceed
      }
    }
    
    // Create a new Image to check dimensions and convert the image
    const img = new Image();
    img.onload = () => {
      // Check if image dimensions are sufficient
      if (img.width < 200 || img.height < 200) {
        toast({
          title: 'Image Too Small',
          description: 'The captured image is too small. Please adjust your camera position and try again.',
          variant: 'destructive'
        });
        return;
      }
      
      // Convert to proper format for better compatibility
      try {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image on the canvas with some enhancement
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast({
            title: 'Error Processing Image',
            description: 'Could not process the captured image. Please try again.',
            variant: 'destructive'
          });
          return;
        }
        
        // Apply some image processing to improve quality
        ctx.filter = 'contrast(1.1) brightness(1.05)';
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';
        
        // Convert to JPEG format for best compatibility with face_recognition
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        // Image passed checks, update state with the converted image
        if (captureMode === 'profile') {
          setProfilePhoto(jpegDataUrl);
          // Clear any validation errors for profile photo
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.profilePhoto;
            return newErrors;
          });
        } else if (captureMode === 'front') {
          setFaceImages(prev => ({
            ...prev,
            [captureMode]: jpegDataUrl
          }));
          
          // Clear any validation errors for this face angle
          if (faceValidationErrors[captureMode]) {
            setFaceValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[captureMode];
              return newErrors;
            });
          }
        }
        
        // Close webcam after capture
        setCaptureMode(null);
        
        toast({
          title: 'Image Captured',
          description: 'Image captured successfully',
        });
      } catch (error) {
        console.error('Error converting captured image:', error);
        toast({
          title: 'Error Processing Image',
          description: 'Could not process the captured image. Please try again.',
          variant: 'destructive'
        });
      }
    };
    
    // Handle image loading errors
    img.onerror = () => {
      toast({
        title: 'Invalid Capture',
        description: 'The captured image could not be processed. Please try again.',
        variant: 'destructive'
      });
    };
    
    img.src = imageSrc;
  };
  
  // Reset a specific image
  const resetImage = (type: 'profile' | 'front') => {
    if (type === 'profile') {
      setProfilePhoto('');
    } else {
      setFaceImages(prev => ({
        ...prev,
        [type]: ''
      }));
    }
  };
  
  return (
    <DashboardLayout userType="student">
          <div className="page-container">
            <div className="page-header mb-6">
              <h1 className="text-2xl font-bold">Complete Your Profile</h1>
              <p className="text-muted-foreground">
                Please provide your details to complete your registration. This information will be verified by an administrator.
              </p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Personal Information */}
                  <CustomCard>
                    <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            value={userData?.name || ''} 
                            disabled 
                            className="bg-background"
                          />
                          <p className="text-sm text-muted-foreground mt-1">Retrieved from your registration</p>
                        </div>
                        
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            value={userData?.email || ''} 
                            disabled 
                            className="bg-background"
                          />
                          <p className="text-sm text-muted-foreground mt-1">Retrieved from your registration</p>
                        </div>
                        
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={userData?.phone_number || ''} 
                            disabled 
                            className="bg-background"
                          />
                          <p className="text-sm text-muted-foreground mt-1">Retrieved from your registration</p>
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                  
                  {/* Academic Information */}
                  <CustomCard>
                    <h2 className="text-xl font-semibold mb-4">Academic Information</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="collegeName">College/Institution Name</Label>
                        <Input 
                          id="collegeName" 
                          value={collegeName} 
                          onChange={(e) => setCollegeName(e.target.value)} 
                          placeholder="Enter your college name"
                          className={errors.collegeName ? "border-red-500" : ""}
                        />
                        {errors.collegeName && (
                          <p className="text-sm text-red-500 mt-1">{errors.collegeName}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="course">Course/Program</Label>
                        <Input 
                          id="course" 
                          value={course} 
                          onChange={(e) => setCourse(e.target.value)} 
                          placeholder="E.g., Bachelor of Computer Science"
                          className={errors.course ? "border-red-500" : ""}
                        />
                        {errors.course && (
                          <p className="text-sm text-red-500 mt-1">{errors.course}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="yearOfStudy">Year of Study</Label>
                        <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                          <SelectTrigger className={errors.yearOfStudy ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select your year of study" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                            <SelectItem value="5">5th Year</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.yearOfStudy && (
                          <p className="text-sm text-red-500 mt-1">{errors.yearOfStudy}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="registrationNumber">University Registration Number</Label>
                        <Input 
                          id="registrationNumber" 
                          value={registrationNumber} 
                          onChange={(e) => setRegistrationNumber(e.target.value)} 
                          placeholder="Enter your registration/roll number"
                          className={errors.registrationNumber ? "border-red-500" : ""}
                        />
                        {errors.registrationNumber && (
                          <p className="text-sm text-red-500 mt-1">{errors.registrationNumber}</p>
                        )}
                      </div>
                    </div>
                  </CustomCard>
                </div>
                
                {/* Profile Photo */}
                <CustomCard className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center">
                      {profilePhoto ? (
                        <div className="relative">
                          <img 
                            src={profilePhoto} 
                            alt="Profile" 
                            className="w-48 h-48 object-cover rounded-full border-4 border-border"
                          />
                          <button
                            type="button"
                            onClick={() => resetImage('profile')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                          <span className="text-muted-foreground">No photo</span>
                        </div>
                      )}
                      
                      {errors.profilePhoto && (
                        <p className="text-sm text-red-500 mt-2">{errors.profilePhoto}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-4">
                      <p className="text-muted-foreground">Upload a clear photo of yourself for your profile.</p>
                      
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <button
                            type="button"
                            className="w-full border-2 border-dashed border-border rounded-md p-4 flex flex-col items-center justify-center hover:bg-background"
                            onClick={() => setCaptureMode('profile')}
                          >
                            <Camera className="h-6 w-6 text-muted-foreground mb-2" />
                            <span className="text-sm">Take a photo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CustomCard>
                
                {/* Face Images */}
                <div id="face-images-section">
                  <CustomCard className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Face Image for Recognition</h2>
                    <p className="text-muted-foreground mb-4">
                      Please provide a clear front-facing image of your face for the facial recognition system.
                      The image should show your face clearly with good lighting.
                    </p>
                    
                    <div className="flex justify-center">
                      {/* Front Face */}
                      <div className="border rounded-lg p-4 max-w-md w-full">
                        <h3 className="font-medium mb-2">Front Face</h3>
                        
                        <div className="flex flex-col items-center space-y-3">
                          {faceImages.front ? (
                            <div className="relative">
                              <img 
                                src={faceImages.front} 
                                alt="Front Face" 
                                className="w-full h-48 object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => resetImage('front')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                              >
                                <RefreshCw size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-muted flex items-center justify-center rounded-md">
                              <span className="text-muted-foreground">Front View</span>
                            </div>
                          )}
                          
                          {faceValidationErrors.front && (
                            <div className="flex items-center text-red-500 text-sm">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span>{faceValidationErrors.front}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-center w-full">
                            <button
                              type="button"
                              className="w-full border rounded-md p-2 flex items-center justify-center hover:bg-background"
                              onClick={() => setCaptureMode('front')}
                            >
                              <Camera className="h-4 w-4 mr-1" />
                              <span className="text-sm">Camera</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                </div>
                
                {/* Submission */}
                <div className="flex justify-end space-x-4">
                  <CustomButton
                    variant="outline"
                    onClick={() => navigate('/student/dashboard')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </CustomButton>
                  
                  <CustomButton
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    {profileData ? 'Update Profile' : 'Submit Profile'}
                  </CustomButton>
                </div>
              </form>
            )}
            
            {/* Webcam Capture Modal */}
            {captureMode && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4">
                      {captureMode === 'profile' ? 'Capture Profile Photo' : 'Capture Front Face'}
                    </h3>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          screenshotQuality={1}
                          mirrored={false}
                          imageSmoothing={true}
                          forceScreenshotSourceSize={true}
                          videoConstraints={{
                            width: 1280,
                            height: 720,
                            facingMode: "user"
                          }}
                          className="w-full rounded-md"
                        />
                        
                        {/* Enhanced face detection indicator for face images only */}
                        {captureMode === 'front' && (
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
                            
                            {/* Auto-capture indicator */}
                            {stableFaceDetected && autoCapture && (
                              <div className="bg-green-600 bg-opacity-80 px-2 py-1 rounded text-white text-xs animate-pulse">
                                Auto-capturing...
                              </div>
                            )}
                            
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
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        {captureMode === 'front' && 'Look directly at the camera with your face centered and well-lit.'}
                        {captureMode === 'profile' && 'Look directly at the camera with your face centered for a clear profile photo.'}
                      </p>
                      
                      {/* Auto-capture toggle */}
                      {(captureMode === 'front') && (
                        <div className="mt-2 flex items-center">
                          <input 
                            type="checkbox" 
                            id="autoCapture" 
                            checked={autoCapture} 
                            onChange={() => setAutoCapture(!autoCapture)}
                            className="mr-2"
                          />
                          <label htmlFor="autoCapture" className="text-sm text-muted-foreground">
                            Auto-capture when face is properly detected
                          </label>
                        </div>
                      )}
                      
                      {(captureMode === 'front') && (
                        <div className="mt-2 flex justify-center">
                          {faceDetected === true && orientationMatch !== false ? (
                            <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-3 rounded-md flex items-center border border-green-200 dark:border-green-900/50">
                              <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">Perfect! Ready to capture</span>
                                {stableFaceDetected && autoCapture ? (
                                  <span className="text-xs text-primary">Auto-capture will happen in a moment...</span>
                                ) : (
                                  <span className="text-xs text-green-600 dark:text-green-400">Press "Capture Now" or wait for auto-capture</span>
                                )}
                                {detectedOrientation && (
                                  <span className="text-xs text-green-600 dark:text-green-400">{detectedOrientation} orientation detected</span>
                                )}
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
                      
                      {/* Lighting and position tips */}
                      {(captureMode === 'front') && faceDetected === false && (
                        <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
                          <h4 className="text-amber-800 dark:text-amber-300 font-medium text-sm">Tips for better face detection:</h4>
                          <ul className="text-amber-700 dark:text-amber-400 text-xs mt-1 list-disc pl-4 space-y-1">
                            <li>Ensure your face is well-lit from the front</li>
                            <li>Avoid backlighting (don't sit with a window behind you)</li>
                            <li>Position your face in the center of the frame</li>
                            <li>For side angles, turn your head approximately 45 degrees</li>
                            <li>Remove hats, masks or heavy glasses</li>
                          </ul>
                        </div>
                      )}
                      
                      {captureMode === 'profile' && (
                        <div className="mt-2 flex justify-center">
                          <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-2 rounded-md flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <span className="text-sm">Ensure good lighting and a plain background</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <CustomButton
                        variant="outline"
                        onClick={() => {
                          if (captureDelay) {
                            clearTimeout(captureDelay);
                            setCaptureDelay(null);
                          }
                          setCaptureMode(null);
                          setStableFaceDetected(false);
                        }}
                      >
                        Cancel
                      </CustomButton>
                      
                      <CustomButton
                        onClick={captureImage}
                        disabled={
                          (captureMode !== 'profile' && !faceDetected) || 
                          isAnalyzing
                        }
                        className={
                          faceDetected === true && captureMode !== 'profile'
                            ? 'bg-green-600 hover:bg-green-700 border-green-600'
                            : ''
                        }
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : faceDetected === true && captureMode !== 'profile' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Capture Now
                          </>
                        ) : (
                          'Capture'
                        )}
                      </CustomButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DashboardLayout>
  );
};

export default ProfileCompletion; 