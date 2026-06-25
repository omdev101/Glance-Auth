import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/App';
import { adminService } from '@/services/api';
import { 
  Video, 
  Camera, 
  CameraOff, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  Loader2,
  User,
  Clock,
  Search,
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api as axios } from '@/services/api';
import { API_URL } from '@/config';
import { getToken } from '@/lib/auth';
import Webcam from 'react-webcam';

const LiveAttendancePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { userName, isAuthenticated, userRole } = useAuth();
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [recognitionMessage, setRecognitionMessage] = useState<string>('');
  const [recognitionConfidence, setRecognitionConfidence] = useState<number>(0);
  const [recognizedStudent, setRecognizedStudent] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  
  // Determine if we're in public mode (student access from landing page) or admin mode
  const isPublicMode = !isAuthenticated || userRole !== 'admin';
  
  // Show/hide admin controls based on authentication
  const showAdminControls = isAuthenticated && userRole === 'admin';
  
  // Live attendance visibility state - still initialize from localStorage for immediate feedback
  const [isLiveAttendanceVisible, setIsLiveAttendanceVisible] = useState(() => {
    // Initialize from localStorage or default to false
    return localStorage.getItem('liveAttendanceVisible') === 'true';
  });
  
  const [isAutoScheduleActive, setIsAutoScheduleActive] = useState(() => {
    // Initialize from localStorage or default to true
    const setting = localStorage.getItem('liveAttendanceAutoSchedule');
    return setting === null ? true : setting === 'true';
  });
  
  // Connection status
  const [backendConnected, setBackendConnected] = useState(true);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTimer, setAnalysisTimer] = useState<NodeJS.Timeout | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Helper function to check if backend is available
  const checkBackendConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`, { timeout: 60000 });
      setBackendConnected(true);
      return true;
    } catch (error) {
      console.log('Backend server seems to be offline or taking too long to respond');
      // For Render deployments, cold starts can take a long time.
      // Don't mark as offline immediately just due to a timeout.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNABORTED') {
        // It's a timeout, the server might just be waking up
        return true; 
      }
      setBackendConnected(false);
      return false;
    }
  };
  
  // Start the camera and begin face analysis
  const startCamera = async () => {
    try {
      // Request camera permissions explicitly before starting with higher resolution
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 }
        }, 
        audio: false 
      });
      
      // Clean up previous stream if it exists
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        if (video.srcObject) {
          const tracks = (video.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
      }
      
      // Once we have the stream, set camera as active
      setCameraActive(true);
      setError(null);
      setRecognitionStatus('idle');
      setFaceDetected(false); // Reset face detection state
      console.log('Camera stream acquired successfully');
      
      // Clear any existing timer
      if (analysisTimer) {
        clearInterval(analysisTimer);
      }
      
      // Add a delay to ensure webcam component is properly mounted
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if webcam reference is available
      if (!webcamRef.current) {
        throw new Error("Camera initialization failed. Webcam reference not available.");
      }
      
      // Force face analysis immediately after camera starts (same as clicking Force Analysis button)
      console.log("Automatically triggering initial face analysis...");
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        setIsAnalyzing(true);
        setRecognitionStatus('scanning');
        setRecognitionMessage('Initial face analysis...');
        
        // Make the API call directly for initial analysis
        try {
          const response = await axios.post(`${API_URL}/api/analyze-face`, {
            image: screenshot,
            is_live_analysis: true,
            expected_orientation: "front"
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          console.log("Initial face analysis response:", response.data);
          setFaceDetected(response.data.is_valid);
          
          if (response.data.is_valid) {
            // If face is detected, proceed with student recognition
            try {
              const recognizeResponse = await axios.post(`${API_URL}${isPublicMode ? '/api/public/recognize-student' : '/api/admin/recognize-student'}`, {
                image: screenshot
              }, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                timeout: 60000
              });
              
              const recognizeData = recognizeResponse.data;
              console.log('Initial student recognition response:', recognizeData);
              
              if (recognizeData.recognized) {
                setRecognizedStudent(recognizeData.student);
                setRecognitionStatus('success');
                setRecognitionMessage(`Student recognized: ${recognizeData.student.name}`);
                setRecognitionConfidence(recognizeData.confidence || 0);
                
                // Show which orientation matched best (front, left, right)
                if (recognizeData.matched_orientation) {
                  toast({
                    title: 'Student Recognized',
                    description: `Matched with ${recognizeData.confidence.toFixed(1)}% confidence`,
                    duration: 3000
                  });
                }
                
                // Check if confidence is above 60% before marking attendance
                if (recognizeData.confidence >= 60) {
                  // Mark attendance if not already marked
                  if (!recognizeData.already_marked) {
                    markAttendance(recognizeData.student);
                  } else {
                    toast({
                      title: 'Already Marked',
                      description: `${recognizeData.student.name}'s attendance was already marked today`,
                      duration: 3000
                    });
                    
                    // Set flags to show already marked
                    setAttendanceMarked(true);
                    setRecognizedStudent(recognizeData.student);
                  }
                } else {
                  // Confidence too low to mark attendance
                  toast({
                    title: 'Low Confidence Match',
                    description: `Face recognized with insufficient confidence (${recognizeData.confidence.toFixed(1)}%). Minimum 60% required.`,
                    variant: 'destructive',
                    duration: 4000
                  });
                  setRecognitionMessage(`Student recognized with low confidence (${recognizeData.confidence.toFixed(1)}%)`);
                }
              } else {
                // Face detected but no matching student found
                const isFaceDetected = recognizeData.face_detected === true;
                
                if (isFaceDetected) {
                  // Show a special message for faces detected but not registered
                  toast({
                    title: 'Face Not Registered',
                    description: recognizeData.message || 'Face detected but not registered in the system',
                    variant: 'destructive',
                    duration: 4000
                  });
                  
                  setRecognitionStatus('failed');
                  setRecognitionMessage('Face not registered in system');
                } else {
                  setRecognitionStatus('failed');
                  setRecognitionMessage(recognizeData.message || 'No matching student found');
                  
                  // If confidence is close but not enough, show a special message
                  if (recognizeData.confidence > 50) {
                    toast({
                      title: 'Almost Recognized',
                      description: `Face was similar to a student but below confidence threshold (${recognizeData.confidence.toFixed(1)}%)`,
                      variant: 'default',
                      duration: 3000
                    });
                  }
                }
              }
            } catch (err) {
              console.error("Error in initial student recognition:", err);
              setRecognitionStatus('failed');
              setRecognitionMessage('Error recognizing student');
            }
        } else {
            setRecognitionStatus('failed');
            setRecognitionMessage(response.data.message || 'Face not properly detected');
          }
        } catch (err) {
          console.error("Error in initial face analysis:", err);
          setRecognitionStatus('failed');
          setRecognitionMessage('Initial face analysis failed');
        } finally {
          setIsAnalyzing(false);
        }
        }
        
      // Start periodic face analysis (every 500ms)
      const timer = setInterval(() => {
        if (webcamRef.current && cameraActive) {
          // Only perform face analysis if we're not already analyzing, capturing, or showing a recognized student
          if (!isAnalyzing && !isCapturing && !recognizedStudent && recognitionStatus !== 'success') {
            analyzeFaceFromCamera();
          }
        } else if (!cameraActive) {
          clearInterval(timer);
        }
      }, 500); // More frequent checks (500ms)
      
      setAnalysisTimer(timer);
    
    toast({
      title: 'Camera Started',
      description: 'Face recognition is now active',
    });
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
    
    setError(errorMessage);
    setCameraActive(false);
    
      toast({
        title: 'Camera Error',
      description: errorMessage,
        variant: 'destructive'
      });
  }
};

// Stop the camera
const stopCamera = () => {
  setCameraActive(false);
  setFaceDetected(false);
  setRecognitionStatus('idle');
  
  // Clear analysis timer
  if (analysisTimer) {
    clearInterval(analysisTimer);
    setAnalysisTimer(null);
  }
};

// Analyze face from webcam for recognition
const analyzeFaceFromCamera = async () => {
  if (!webcamRef.current || !cameraActive || isCapturing) return;
  
  // Throttle analysis to prevent too many requests, but use shorter interval
  const now = Date.now();
  if (now - lastCaptureTime < 500) return; // Further reduced from 600ms to 500ms for more responsive checks
  
  // Get screenshot from webcam
  const imageSrc = webcamRef.current.getScreenshot();
  if (!imageSrc) {
    console.log('Failed to get screenshot from webcam');
    return;
  }
  
  // Set analyzing state to provide immediate visual feedback
  setIsAnalyzing(true);
  setRecognitionStatus('scanning');
  setRecognitionMessage('Analyzing faces...');
  console.log('Analyzing face from camera...');
  setLastCaptureTime(now);
  
  try {
    // Log the API request for debugging
    console.log('Sending face analysis request to API');
  
    // Prepare headers based on whether user is authenticated
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Call backend API to analyze face - EXACTLY matching the working format
    const response = await axios.post(`${API_URL}/api/analyze-face`, {
      image: imageSrc,
      is_live_analysis: true,
      expected_orientation: "front"
    }, {
      headers,
      // Add timeout to prevent hanging requests
      timeout: 60000
    });
    
    console.log('Face analysis API response:', response.data);
    
    const { is_valid, message, detected_orientation, orientation_match } = response.data;
    console.log('Face analysis results:', { is_valid, message, detected_orientation, orientation_match });
    
    // Update face detection state
    setFaceDetected(is_valid);
    
    if (!is_valid) {
      setRecognitionStatus('failed');
      setRecognitionMessage(message || 'Face not properly detected');
      
      // Reset after short delay
      setTimeout(() => {
        setRecognitionStatus('idle');
        setIsAnalyzing(false); // Make sure to reset this flag
      }, 1000); // Shorter reset time (1s instead of 1.5s)
      return;
    }
    
    // If face is valid, now try to recognize the student
    try {
      console.log('Face detected, attempting student recognition');
      setRecognitionMessage('Face detected! Matching with database...');
      
      // Now call backend API to recognize student from detected face
      const recognizeResponse = await axios.post(`${API_URL}${isPublicMode ? '/api/public/recognize-student' : '/api/admin/recognize-student'}`, {
        image: imageSrc
      }, {
        headers,
        // Add timeout to prevent hanging requests
        timeout: 60000
      });
      
      const recognizeData = recognizeResponse.data;
      console.log('Student recognition response:', recognizeData);
      
      if (recognizeData.recognized) {
        // Student recognized!
        setRecognizedStudent(recognizeData.student);
        setRecognitionStatus('success');
        setRecognitionMessage(`Student recognized: ${recognizeData.student.name}`);
        setRecognitionConfidence(recognizeData.confidence || 0);
      
        // Show which orientation matched best (front, left, right)
        if (recognizeData.matched_orientation) {
          toast({
            title: 'Student Recognized',
            description: `Matched with ${recognizeData.confidence.toFixed(1)}% confidence`,
            duration: 2000 // Reduced toast duration for faster workflow
          });
        }
        
        // Check if confidence is above 60% before marking attendance
        if (recognizeData.confidence >= 60) {
          // Mark attendance if not already marked
          if (!recognizeData.already_marked) {
            console.log('Marking attendance for student:', recognizeData.student);
            markAttendance(recognizeData.student);
          } else {
            console.log('Attendance already marked for student:', recognizeData.student);
            toast({
              title: 'Already Marked',
              description: `${recognizeData.student.name}'s attendance was already marked today`,
              duration: 2000 // Reduced toast duration for faster workflow
            });
            
            // Set attendance marked flag even though it was previously marked
            setAttendanceMarked(true);
            setRecognizedStudent(recognizeData.student);
            
            // Auto-reset for next student after 1.5s when already marked
            setTimeout(() => {
              setRecognitionStatus('idle');
              setRecognizedStudent(null);
              setIsCapturing(false);
              setAttendanceMarked(false);
              setIsAnalyzing(false); // Make sure to reset this flag
            }, 1500);
          }
        } else {
          // Confidence too low to mark attendance
          toast({
            title: 'Low Confidence Match',
            description: `Face recognized with insufficient confidence (${recognizeData.confidence.toFixed(1)}%). Minimum 60% required.`,
            variant: 'destructive',
            duration: 3000
          });
          console.log(`Recognition confidence too low: ${recognizeData.confidence}%. Not marking attendance.`);
          setRecognitionMessage(`Student recognized with low confidence (${recognizeData.confidence.toFixed(1)}%)`);
          
          // Auto-reset after 2s for low confidence match
          setTimeout(() => {
            setRecognitionStatus('idle');
            setRecognizedStudent(null);
            setIsCapturing(false);
            setAttendanceMarked(false);
            setIsAnalyzing(false); // Make sure to reset this flag
          }, 2000);
        }
        
        // Update the recent attendance list - only for admin
        if (!isPublicMode) {
          fetchRecentAttendance();
        }
      } else {
        // Face detected but no matching student found
        const isFaceDetected = recognizeData.face_detected === true;
        
        setRecognitionStatus('failed');
        setRecognitionMessage(recognizeData.message || 'No matching student found in database');
        setRecognitionConfidence(recognizeData.confidence || 0);
        
        // Show specific feedback when face is detected but not registered
        if (isFaceDetected) {
          // Show a special message for faces detected but not registered
          toast({
            title: 'Face Not Registered',
            description: recognizeData.message || 'Face detected but not registered in the system',
            variant: 'destructive',
            duration: 3000
          });
          
          // Add extra visual feedback
          setRecognitionStatus('failed');
          setRecognitionMessage('Face not registered in system');
        } else if (recognizeData.confidence > 0) {
          // Show more details about the recognition failure
          console.log(`Best match confidence: ${recognizeData.confidence}% (below threshold)`);
          
          // If confidence is close but not enough, show a special message
          if (recognizeData.confidence > 50) {
            toast({
              title: 'Almost Recognized',
              description: `Face was similar to a student but below confidence threshold (${recognizeData.confidence.toFixed(1)}%)`,
              variant: 'default',
              duration: 2000 // Reduced toast duration
            });
          }
        }
        
        setTimeout(() => {
          setRecognitionStatus('idle');
          setIsAnalyzing(false); // Make sure to reset this flag
        }, 1000); // Reduced to 1s for faster scanning cycle
      }
    } catch (recognizeError) {
      console.error('Student recognition error:', recognizeError);
      setRecognitionStatus('failed');
      setRecognitionMessage('Error recognizing student. Please try again.');
      
      // Reset after error
      setTimeout(() => {
        setRecognitionStatus('idle');
        setIsAnalyzing(false); // Make sure to reset this flag
      }, 1500); // Reduced reset time after error
    }
  } catch (error) {
    console.error('Face analysis error:', error);
    setFaceDetected(false);
    setRecognitionStatus('failed');
    
    // Type narrowing for proper TypeScript error handling
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { response?: { data?: { message?: string } }, message?: string };
      setRecognitionMessage(`Error: ${errorObj.response?.data?.message || errorObj.message || 'Failed to analyze face'}`);
    } else {
      setRecognitionMessage('Failed to analyze face');
    }
    
    // Reset after error with shorter timeout
    setTimeout(() => {
      setRecognitionStatus('idle');
      setIsAnalyzing(false); // Make sure to reset this flag
    }, 1500); // Reduced to 1.5s
  } finally {
    // In case the timeout doesn't fire, ensure isAnalyzing is reset after 3s
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  }
};

// Fetch recent attendance records from live attendance endpoint
const fetchRecentAttendance = async () => {
  try {
    const token = getToken();
    if (!token) return;
    
    const response = await axios.get(`${API_URL}/api/admin/recent-live-attendance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.records) {
      setRecentAttendance(response.data.records);
    }
  } catch (error) {
    console.error('Error fetching recent live attendance:', error);
    // Use proper TypeScript error handling
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { response?: { data?: { message?: string } }, message?: string };
      toast({
        title: 'Error',
        description: `Failed to fetch attendance records: ${errorObj.response?.data?.message || errorObj.message || 'Unknown error'}`,
        variant: 'destructive',
        duration: 3000
      });
    }
  }
};

// Mark attendance for the recognized student
const markAttendance = async (student: any) => {
  if (!student || !student._id) {
    console.error('Cannot mark attendance: Invalid student data', student);
    return;
  }
  
  try {
    setIsCapturing(true); // Prevent new captures while marking attendance
    setRecognitionMessage(`Marking attendance for ${student.name}...`);
    
    // Get token if available (will be null in public mode)
    const token = localStorage.getItem('token');
    
    // Prepare headers based on whether we have a token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if available (admin mode)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Sending attendance marking request for student ID:', student._id);
    console.log('Complete student data:', student);
    
    // Make sure we're using a proper string ID
    const studentId = typeof student._id === 'object' && student._id.$oid 
      ? student._id.$oid 
      : String(student._id);
    
    console.log('Normalized student ID for API request:', studentId);
    
    // Use different endpoints based on whether we're in public or admin mode
    const endpoint = isPublicMode
      ? `${API_URL}/api/public/mark-attendance`
      : `${API_URL}/api/admin/mark-attendance`;
    
    console.log(`Using ${isPublicMode ? 'public' : 'admin'} endpoint: ${endpoint}`);
    
    const response = await axios.post(endpoint, {
      student_id: studentId,
      method: 'face_recognition'
    }, {
      headers
    });
    
    console.log('Attendance marking response:', response.data);
    
    if (response.data.already_marked) {
      toast({
        title: 'Attendance Already Marked',
        description: `${student.name} already has attendance marked for today`,
        variant: 'default'
      });
      setRecognitionMessage(`${student.name} already marked present today`);
    } else {
      toast({
        title: 'Attendance Marked',
        description: `Successfully marked attendance for ${student.name}`,
        variant: 'default'
      });
      setRecognitionMessage(`${student.name} marked present successfully!`);
    }
    
    // Set flag to show attendance has been marked
    setAttendanceMarked(true);
    
    // Refresh recent attendance list - only for admin
    if (!isPublicMode) {
      fetchRecentAttendance();
    }
    
    // Automatically reset after a short delay to show the success message
    setTimeout(() => {
      setRecognitionStatus('idle');
      setRecognizedStudent(null);
      setIsCapturing(false);
      setAttendanceMarked(false);
    }, 1500);
    
  } catch (error) {
    console.error('Error marking attendance:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      request: {
        url: isPublicMode ? `${API_URL}/api/public/mark-attendance` : `${API_URL}/api/admin/mark-attendance`,
        student_id: student._id,
        method: 'face_recognition'
      }
    });
    
    // Type narrowing for proper TypeScript error handling
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { response?: { data?: { message?: string } }, message?: string };
      toast({
        title: 'Error',
        description: `Failed to mark attendance: ${errorObj.response?.data?.message || errorObj.message}`,
        variant: 'destructive'
      });
      
      setRecognitionMessage(`Error marking attendance: ${errorObj.response?.data?.message || errorObj.message}`);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to mark attendance',
        variant: 'destructive'
      });
      
      setRecognitionMessage('Error marking attendance');
    }
    
    // Show error for a few seconds, then reset
    setTimeout(() => {
      setRecognitionStatus('idle');
      setRecognizedStudent(null);
      setIsCapturing(false);
      setAttendanceMarked(false);
    }, 2000);
  }
};

// Continue scanning after a student has been recognized
const continueScan = () => {
  console.log('Continuing scan for next student');
  setIsCapturing(false);
  setRecognizedStudent(null);
  setRecognitionStatus('idle');
  setAttendanceMarked(false);
  setIsAnalyzing(false);
  setFaceDetected(false);
  
  // Reset the lastCaptureTime to allow immediate scanning for the next student
  setLastCaptureTime(0);
};

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
};

// Check if current time is within scheduled attendance time
const isWithinScheduledTime = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  
  // Convert to minutes since midnight for easier comparison
  const currentTimeInMinutes = hour * 60 + minutes;
  const startTimeInMinutes = 7 * 60 + 30; // 7:30 AM
  const endTimeInMinutes = 10 * 60;       // 10:00 AM
  
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
};

// Toggle live attendance visibility - with improved offline handling
const toggleLiveAttendanceVisibility = async (visible: boolean) => {
  try {
    console.log('Toggling live attendance visibility to:', visible);
    
    // Update state first for immediate UI feedback
    setIsLiveAttendanceVisible(visible);
    
    // Always update localStorage 
    localStorage.setItem('liveAttendanceVisible', visible.toString());
    
    // Check if backend is reachable
    if (!await checkBackendConnection()) {
      toast({
        title: 'Working Offline',
        description: 'Settings saved locally. Will sync when connection is restored.',
        variant: 'default'
      });
      return;
    }
    
    const token = getToken();
    if (!token) {
      console.error('No authentication token found');
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please login again.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }
    
    console.log('Sending API request to update settings');
    
    // Send request to backend to update setting
    const response = await axios.post(`${API_URL}/api/admin/settings/live-attendance`, {
      isVisible: visible
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 5 second timeout
    });
    
    console.log('API response:', response.data);
    
    toast({
      title: visible ? 'Live Attendance Enabled' : 'Live Attendance Disabled',
      description: visible 
        ? 'Students can now mark attendance from the landing page' 
        : 'Live attendance option is now hidden from students',
      variant: 'default'
    });
  } catch (error) {
    console.error('Error updating live attendance visibility:', error);
    
    // Additional offline handling
    if (error.code === 'ECONNABORTED' || !backendConnected || error.message.includes('Network Error')) {
      setBackendConnected(false);
      toast({
        title: 'Working Offline',
        description: 'Settings saved locally. Will sync when connection is restored.',
        variant: 'default'
      });
      return;
    }
    
    // Show more detailed error toast
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Server error response:', error.response.data);
      toast({
        title: `Error ${error.response.status}`,
        description: `Failed to update settings: ${error.response.data.error || 'Server error'}`,
        variant: 'destructive'
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      toast({
        title: 'Network Error',
        description: 'No response from server. Using local storage instead.',
        variant: 'default'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      toast({
        title: 'Error',
        description: `Failed to update settings: ${error.message}`,
        variant: 'destructive'
      });
    }
  }
};

// Toggle auto schedule - with improved offline handling
const toggleAutoSchedule = async (enabled: boolean) => {
  try {
    console.log('Toggling auto schedule to:', enabled);
    
    // Update state first for immediate UI feedback
    setIsAutoScheduleActive(enabled);
    
    // Always update localStorage 
    localStorage.setItem('liveAttendanceAutoSchedule', enabled.toString());
    
    // Check if backend is reachable
    if (!await checkBackendConnection()) {
      toast({
        title: 'Working Offline',
        description: 'Auto schedule setting saved locally. Will sync when connection is restored.',
        variant: 'default'
      });
      return;
    }
    
    const token = getToken();
    if (!token) {
      console.error('No authentication token found');
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please login again.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }
    
    console.log('Sending API request to update auto schedule');
    
    // Send request to backend to update setting
    const response = await axios.post(`${API_URL}/api/admin/settings/live-attendance-schedule`, {
      autoSchedule: enabled
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 5 second timeout
    });
    
    console.log('API response:', response.data);
    
    toast({
      title: enabled ? 'Auto Schedule Enabled' : 'Auto Schedule Disabled',
      description: enabled 
        ? 'Live attendance will be automatically enabled from 7:30AM to 10:00AM' 
        : 'Live attendance will remain in its current state regardless of time',
      variant: 'default'
    });
  } catch (error) {
    console.error('Error updating auto schedule setting:', error);
    
    // Additional offline handling
    if (error.code === 'ECONNABORTED' || !backendConnected || error.message.includes('Network Error')) {
      toast({
        title: 'Working Offline',
        description: 'Auto schedule setting saved locally. Will sync when connection is restored.',
        variant: 'default'
      });
      return;
    }
    
    // Show more detailed error toast
    if (error.response) {
      console.error('Server error response:', error.response.data);
      toast({
        title: `Error ${error.response.status}`,
        description: `Failed to update auto schedule: ${error.response.data.error || 'Server error'}`,
        variant: 'destructive'
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
      toast({
        title: 'Network Error',
        description: 'No response from server. Using local storage instead.',
        variant: 'default'
      });
    } else {
      toast({
        title: 'Error',
        description: `Failed to update auto schedule: ${error.message}`,
        variant: 'destructive'
      });
    }
  }
};

// Log recognition status changes for debugging
useEffect(() => {
  console.log('Recognition status changed:', { 
    recognitionStatus, 
    recognitionMessage,
    faceDetected,
    isAnalyzing 
  });
}, [recognitionStatus, recognitionMessage, faceDetected, isAnalyzing]);

// Fetch settings and recent attendance on component mount
useEffect(() => {
  // Try to fetch, but always set the connection status
  fetchRecentAttendance().catch(() => setBackendConnected(false));
  
  // Fetch live attendance settings from API
  const fetchSettings = async () => {
    try {
      console.log('Fetching live attendance settings from API');
      
      // First check if backend is reachable
      const connected = await checkBackendConnection();
      if (!connected) {
        console.log('Backend is offline, using localStorage values');
        return;
      }
      
      const token = getToken();
      if (!token) {
        console.error('No token available for fetching settings');
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/admin/settings/live-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 60000
      });
      
      console.log('Settings API response:', response.data);
      
      if (response.data) {
        // Update state with settings from backend
        setIsLiveAttendanceVisible(response.data.isVisible);
        setIsAutoScheduleActive(response.data.autoSchedule);
        
        // Also update localStorage as fallback
        localStorage.setItem('liveAttendanceVisible', response.data.isVisible.toString());
        localStorage.setItem('liveAttendanceAutoSchedule', response.data.autoSchedule.toString());
        
        console.log('Updated settings from API:', {
          isVisible: response.data.isVisible,
          autoSchedule: response.data.autoSchedule
        });
        
        // If we got this far, backend is online
        setBackendConnected(true);
      }
    } catch (error) {
      console.error('Error fetching live attendance settings:', error);
      
      // Mark as offline if appropriate
      if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        console.log('Network issue detected, marking as offline');
        setBackendConnected(false);
      }
      
      // Only show toast for server errors, not for network issues
      if (error.response) {
        console.error('Server error response:', error.response.data);
        toast({
          title: 'Settings Error',
          description: `Failed to fetch settings: ${error.response.data.error || 'Server error'}`,
          variant: 'destructive',
          duration: 4000
        });
      }
      
      console.log('Using localStorage fallback values');
      // Continue using localStorage values on error
    }
  };
  
  // Initial fetch
  fetchSettings();
  
  // Also set up periodic check to see if backend comes back online
  const connectionCheckTimer = setInterval(() => {
    if (!backendConnected) {
      checkBackendConnection().then(connected => {
        if (connected) {
          console.log('Backend is online again, fetching settings');
          fetchSettings();
        }
      });
    }
  }, 30000); // Check every 30 seconds
  
  // Auto schedule check - run once every minute
  const autoScheduleTimer = setInterval(() => {
    if (isAutoScheduleActive) {
      const shouldBeVisible = isWithinScheduledTime();
      
      // FIXED: Only update if we're within scheduled time and visibility is false
      // This prevents auto-schedule from turning off manual settings
      if (shouldBeVisible === true && isLiveAttendanceVisible === false) {
        // Update localStorage only when enabling (not disabling)
        localStorage.setItem('liveAttendanceVisible', 'true');
        
        // Update UI
        setIsLiveAttendanceVisible(true);
        
        // Also update backend if auto schedule is active and backend is connected
        if (backendConnected) {
          try {
            const token = getToken();
            if (token) {
              axios.post(`${API_URL}/api/admin/settings/live-attendance`, {
                isVisible: true
              }, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 60000
              }).catch(e => console.error('Auto schedule update error:', e));
            }
          } catch (error) {
            console.error('Error updating auto-scheduled visibility:', error);
          }
        }
      }
      // Don't automatically turn off - let admin control this manually
    }
  }, 60000); // Check every minute
  
  // Cleanup on unmount
  return () => {
    if (analysisTimer) {
      clearInterval(analysisTimer);
    }
    
    clearInterval(autoScheduleTimer);
    clearInterval(connectionCheckTimer);
    
    // Stop camera stream if active
    if (cameraActive && webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };
}, [isAutoScheduleActive, isLiveAttendanceVisible]);

// Toggle camera when button is clicked
const toggleCamera = () => {
  if (cameraActive) {
    stopCamera();
  } else {
    startCamera();
  }
};

return (
    <DashboardLayout userType="admin" hideSidebar={isPublicMode}>
      {isPublicMode && (
        <div className="bg-background sticky top-0 z-50 px-4 py-4 md:px-6 md:py-4 mb-8 flex items-center justify-between">
          <div className="flex-1 flex justify-start">
            <CustomButton 
              variant="outline"
              onClick={() => navigate('/')}
              size="icon"
              className="text-foreground border-border hover:bg-muted w-10 h-10 rounded-full"
              title="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </CustomButton>
          </div>
          
          <div className="flex-1 flex justify-center items-center gap-3">
            <div className="rounded-md bg-primary p-2 flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold tracking-wider">FA</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Glance Auth</span>
          </div>
          
          <div className="flex-1 flex justify-end">
            <div className="flex bg-muted rounded-full p-1 border border-border/50">
              <button
                onClick={() => setTheme('light')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'light' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Light theme"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'system' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                title="System theme"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'dark' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Dark theme"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`page-container ${isPublicMode ? 'relative z-10 min-h-[calc(100vh-100px)]' : ''}`}>
          {!isPublicMode && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
              <div>
                <h1 className="page-title">Live Attendance</h1>
                <p className="text-muted-foreground">
                  Recognize student faces and mark attendance automatically
                </p>
              </div>
              
              {/* Toggle camera when button is clicked - admin only */}
              <div className="mt-4 flex items-center gap-2">
                <CustomButton 
                  variant={cameraActive ? 'outline' : 'default'}
                  onClick={toggleCamera}
                  leftIcon={cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                >
                  {cameraActive ? 'Stop Camera' : 'Start Camera'}
                </CustomButton>
                
                {cameraActive && (
                  <CustomButton
                    variant="secondary"
                    onClick={() => {
                      if (webcamRef.current) {
                        const screenshot = webcamRef.current.getScreenshot();
                        if (screenshot) {
                          console.log("Debug: Manually triggering face analysis");
                          setIsAnalyzing(true);
                          setRecognitionStatus('scanning');
                          
                          // Make the API call directly here for debugging
                          axios.post(`${API_URL}/api/analyze-face`, {
                            image: screenshot,
                            is_live_analysis: true,
                            expected_orientation: "front"
                          }, {
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                          })
                          .then(response => {
                            console.log("Debug API response:", response.data);
                            setFaceDetected(response.data.is_valid);
                            setRecognitionMessage(response.data.message);
                            setRecognitionStatus(response.data.is_valid ? 'success' : 'failed');
                          })
                          .catch(error => {
                            console.error("Debug API error:", error);
                            setRecognitionStatus('failed');
                            setRecognitionMessage('API Error');
                          })
                          .finally(() => {
                            setIsAnalyzing(false);
                          });
                        }
                      }
                    }}
                  >
                    Force Face Analysis
                  </CustomButton>
                )}
              </div>
            </div>
          )}
          
          {/* Public mode header */}
          {isPublicMode && (
            <div className="mb-12 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                Mark Your Attendance
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Position your face in the camera frame to securely and instantly mark your attendance.
              </p>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 relative z-10 max-w-3xl mx-auto">
              <CustomCard className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50">
                <div className="flex items-start gap-4 p-4">
                  <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-900 dark:text-red-300">Camera Error</h3>
                    <p className="text-red-700/80 dark:text-red-400/80 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </CustomCard>
            </div>
          )}
          
          <div className={`grid grid-cols-1 ${isPublicMode ? "justify-center max-w-4xl mx-auto" : "lg:grid-cols-12 gap-6"}`}>
            {/* Camera and Recognition Panel */}
            <div className={isPublicMode ? "col-span-1" : "lg:col-span-8"}>
              
              {!isPublicMode && <h3 className="font-semibold text-lg mb-4">Live Recognition</h3>}
              
              <CustomCard>
                <div className="relative">
                  <div className={`bg-muted ${isPublicMode ? 'rounded-lg' : 'rounded-md'} overflow-hidden relative ${cameraActive ? 'aspect-video' : 'min-h-[350px] flex items-center justify-center'}`}>
                    {!cameraActive ? (
                      <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        <div className="p-4 bg-muted-foreground/10 rounded-full mb-6">
                          <Video className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Camera is turned off</h3>
                        <p className="text-muted-foreground mb-8 max-w-md">Click the button below to start the camera and begin facial recognition for attendance</p>
                        <CustomButton 
                          onClick={startCamera}
                          variant="default"
                          size="lg"
                          leftIcon={<Camera className="h-5 w-5" />}
                        >
                          Start Camera
                        </CustomButton>
                      </div>
                    ) : (
                      <>
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          screenshotQuality={1}
                          mirrored={false}
                          imageSmoothing={true}
                          forceScreenshotSourceSize={true}
                          videoConstraints={{
                            facingMode: "user",
                            width: { ideal: 1280, min: 640 },
                            height: { ideal: 720, min: 480 },
                            frameRate: { ideal: 30, min: 15 },
                            aspectRatio: { ideal: 1.777 }
                          }}
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{ display: 'none' }} />
                        
                        {/* Enhanced face detection indicator */}
                        <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
                          {/* Main detection indicator */}
                          <div className="flex items-center space-x-2">
                            {isAnalyzing ? (
                              <div className="bg-gray-800 bg-opacity-70 p-2 rounded-full animate-pulse">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            ) : faceDetected === true ? (
                              <div className="bg-green-500 bg-opacity-90 p-2 rounded-full animate-pulse">
                                <CheckCircle className="h-6 w-6 text-white" />
                              </div>
                            ) : faceDetected === false ? (
                              <div className="bg-red-500 bg-opacity-90 p-2 rounded-full animate-pulse">
                                <XCircle className="h-6 w-6 text-white" />
                              </div>
                            ) : null}
                          </div>
                          
                          {/* Feedback based on detection status */}
                          {faceDetected === false && (
                            <div className="bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-2 rounded-md mt-2 text-xs max-w-xs">
                              <p className="font-medium">No face detected:</p>
                              <ul className="list-disc pl-4 mt-1">
                                <li>Ensure good lighting</li>
                                <li>Face the camera directly</li>
                                <li>Keep your face in frame</li>
                                <li>Remove obstacles (hats, masks)</li>
                              </ul>
                            </div>
                          )}
                          
                          {isAnalyzing && (
                            <div className="bg-muted border border-border text-primary p-2 rounded-md mt-2 text-xs max-w-xs">
                              <p className="font-medium">Analyzing...</p>
                              <p className="mt-1">Please wait while we process your face</p>
                            </div>
                          )}
                          
                          {faceDetected === true && !isAnalyzing && recognitionStatus !== 'success' && (
                            <div className="bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 p-2 rounded-md mt-2 text-xs max-w-xs">
                              <p className="font-medium">Face detected!</p>
                              <p className="mt-1">Matching with student database...</p>
                            </div>
                          )}
                          
                          {/* New panel for unregistered faces */}
                          {faceDetected === true && recognitionStatus === 'failed' && recognitionMessage === 'Face not registered in system' && (
                            <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 p-2 rounded-md mt-2 text-xs max-w-xs">
                              <p className="font-medium">Face Not Registered!</p>
                              <p className="mt-1">This face is not in the student database.</p>
                              <p className="mt-1">Please register as a student first.</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Recognition status overlay */}
                        <div className="absolute bottom-4 right-4 left-4 flex justify-between items-center">
                          <div className={`${
                            recognitionStatus === 'idle' ? 'bg-muted text-muted-foreground' :
                            recognitionStatus === 'scanning' ? 'bg-muted text-primary' :
                            recognitionStatus === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          } py-2 px-4 rounded-md flex items-center`}>
                            {recognitionStatus === 'idle' && <Search className="h-4 w-4 mr-2" />}
                            {recognitionStatus === 'scanning' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {recognitionStatus === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
                            {recognitionStatus === 'failed' && <XCircle className="h-4 w-4 mr-2" />}
                            <span>{recognitionMessage || 'Ready for face recognition'}</span>
                          </div>
                          
                          {faceDetected && (
                            <Badge className={recognitionStatus === 'failed' && recognitionMessage === 'Face not registered in system' 
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                              : "bg-muted text-blue-800 dark:text-blue-300"}>
                              {recognitionStatus === 'failed' && recognitionMessage === 'Face not registered in system' 
                                ? "Unregistered Face" 
                                : "Face Detected"}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Make Force Analysis button visible to everyone */}
                        <div className="absolute bottom-16 left-4">
                          <button
                            className={`${isPublicMode ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-2 px-4 rounded-md text-sm flex items-center shadow-md`}
                            onClick={() => {
                              if (webcamRef.current) {
                                const screenshot = webcamRef.current.getScreenshot();
                                if (screenshot) {
                                  console.log("Debug: Manually triggering full face recognition workflow");
                                  setIsAnalyzing(true);
                                  setRecognitionStatus('scanning');
                                  
                                  // First, analyze the face
                                  const headers = {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  };
                                  
                                  // Step 1: Analyze face
                                  axios.post(`${API_URL}/api/analyze-face`, {
                                    image: screenshot,
                                    is_live_analysis: true,
                                    expected_orientation: "front"
                                  }, { headers })
                                  .then(response => {
                                    console.log("Face analysis response:", response.data);
                                    setFaceDetected(response.data.is_valid);
                                    setRecognitionMessage(response.data.message);
                                    
                                    // Step 2: If face is valid, attempt to recognize student
                                    if (response.data.is_valid) {
                                      return axios.post(`${API_URL}${isPublicMode ? '/api/public/recognize-student' : '/api/admin/recognize-student'}`, {
                                        image: screenshot
                                      }, { headers });
                                    } else {
                                      setRecognitionStatus('failed');
                                      throw new Error("Face detection failed");
                                    }
                                  })
                                  .then(recognizeResponse => {
                                    // Process student recognition result
                                    const recognizeData = recognizeResponse.data;
                                    console.log("Student recognition response:", recognizeData);
                                    
                                    if (recognizeData.recognized) {
                                      // Student recognized!
                                      setRecognizedStudent(recognizeData.student);
                                      setRecognitionStatus('success');
                                      setRecognitionMessage(`Student recognized: ${recognizeData.student.name}`);
                                      setRecognitionConfidence(recognizeData.confidence || 0);
                                      
                                      // Show toast with confidence
                                      toast({
                                        title: 'Student Recognized',
                                        description: `Matched with ${recognizeData.confidence.toFixed(1)}% confidence`,
                                        duration: 2000
                                      });
                                      
                                      // Step 3: Mark attendance if confidence is high enough
                                      if (recognizeData.confidence >= 60) {
                                        // Check if already marked
                                        if (!recognizeData.already_marked) {
                                          // Mark attendance
                                          markAttendance(recognizeData.student);
                                        } else {
                                          // Already marked today
                                          toast({
                                            title: 'Already Marked',
                                            description: `${recognizeData.student.name}'s attendance was already marked today`,
                                            duration: 2000
                                          });
                                          
                                          // Set attendance marked flag
                                          setAttendanceMarked(true);
                                        }
                                      } else {
                                        // Confidence too low
                                        toast({
                                          title: 'Low Confidence Match',
                                          description: `Face recognized with insufficient confidence (${recognizeData.confidence.toFixed(1)}%). Minimum 60% required.`,
                                          variant: 'destructive',
                                          duration: 3000
                                        });
                                      }
                                      
                                      // Update recent attendance for admin view
                                      if (!isPublicMode) {
                                        fetchRecentAttendance();
                                      }
                                    } else {
                                      // Face detected but no matching student
                                      setRecognitionStatus('failed');
                                      setRecognitionMessage(recognizeData.message || 'No matching student found');
                                      
                                      if (recognizeData.face_detected === true) {
                                        toast({
                                          title: 'Face Not Registered',
                                          description: 'Face detected but not registered in the system',
                                          variant: 'destructive',
                                          duration: 3000
                                        });
                                      }
                                    }
                                  })
                                  .catch(error => {
                                    if (error.message !== "Face detection failed") {
                                      console.error("Error in recognition process:", error);
                                      setRecognitionStatus('failed');
                                      setRecognitionMessage('Error processing face');
                                    }
                                  })
                                  .finally(() => {
                                    setIsAnalyzing(false);
                                  });
                                }
                              }
                            }}
                          >
                            {isPublicMode ? (
                              <>
                                <Search className="h-4 w-4 mr-2" />
                                Scan Face Now
                              </>
                            ) : (
                              'Force Analysis'
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Recognized student panel */}
                  {recognizedStudent && recognitionStatus === 'success' && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-md">
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                          <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-lg font-medium text-green-800 dark:text-green-300">{recognizedStudent.name}</h3>
                          <p className="text-green-600 dark:text-green-400">{recognizedStudent.registration_number || recognizedStudent.email}</p>
                          <div className="mt-1 flex flex-wrap gap-2 justify-center md:justify-start">
                            {recognizedStudent.course && (
                              <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">{recognizedStudent.course}</Badge>
                            )}
                            {recognizedStudent.year_of_study && (
                              <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">Year {recognizedStudent.year_of_study}</Badge>
                            )}
                            <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">Confidence: {recognitionConfidence.toFixed(1)}%</Badge>
                            {attendanceMarked && (
                              <Badge className="bg-muted text-blue-800 dark:text-blue-300">Attendance Marked</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <CustomButton
                            onClick={continueScan}
                            variant="outline"
                          >
                            {attendanceMarked ? "Scan Next Student" : "Continue"}
                          </CustomButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CustomCard>
              
              {/* Recent Attendance Panel - Only show for admin mode */}
              {!isPublicMode && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Recent Attendance</h3>
                  <CustomCard>
                    <div className="p-4">
                      <h3 className="font-medium text-lg mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        Recent Attendance
                      </h3>
                      
                      {recentAttendance.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          No recent attendance records
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {recentAttendance.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-md bg-background hover:bg-muted transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="bg-muted p-2 rounded-full">
                                  <UserCheck className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{record.name}</h4>
                                  <p className="text-sm text-muted-foreground">{record.roll_number || record.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">{record.status || 'present'}</Badge>
                                <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(record.timestamp)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CustomCard>
                </div>
              )}
              
              {/* Public mode instructions at the bottom */}
              {isPublicMode && attendanceMarked && (
                <div className="mt-4 p-4 bg-muted border border-border rounded-md text-center">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Attendance Marked Successfully!</h3>
                  <p className="text-primary">Thank you for marking your attendance.</p>
                  <CustomButton 
                    variant="outline" 
                    onClick={() => navigate('/')}
                    className="mt-4"
                  >
                    Return to Home
                  </CustomButton>
                </div>
              )}
            </div>
            
            {/* Info Panel - Only show for admin mode */}
            {!isPublicMode && (
              <div className="lg:col-span-4">
                <CustomCard>
                  <div className="p-4">
                    <h3 className="font-medium text-lg mb-4">Face Recognition</h3>
                    <p className="text-muted-foreground mb-4">
                      This page allows you to take attendance by recognizing student faces. Start the camera and
                      the system will automatically recognize registered students and mark their attendance.
                    </p>
                    
                    {/* Live Attendance Toggle Section */}
                    <div className="border-t border-border pt-4 mt-6">
                      <h4 className="font-medium text-base mb-3">Landing Page Attendance</h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="live-attendance-toggle" className="font-medium">
                              Show Live Attendance Option
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              When enabled, students can mark attendance from the landing page
                            </p>
                          </div>
                          <Switch
                            id="live-attendance-toggle"
                            checked={isLiveAttendanceVisible}
                            onCheckedChange={(checked) => {
                              console.log('Toggle switched to:', checked);
                              toggleLiveAttendanceVisibility(checked);
                            }}
                          />
                        </div>
                        
                        <div className={`flex items-center justify-between ${!isLiveAttendanceVisible && 'opacity-50'}`}>
                          <div>
                            <Label htmlFor="auto-schedule-toggle" className="font-medium">
                              Auto Schedule
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically enable from 7:30AM to 10:00AM
                            </p>
                          </div>
                          <Switch
                            id="auto-schedule-toggle"
                            checked={isAutoScheduleActive}
                            onCheckedChange={(checked) => {
                              console.log('Auto schedule toggle switched to:', checked);
                              toggleAutoSchedule(checked);
                            }}
                            disabled={!isLiveAttendanceVisible}
                          />
                        </div>
                        
                        {isWithinScheduledTime() && (
                          <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-green-700 dark:text-green-400 text-sm flex items-start">
                            <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <p>Currently within scheduled attendance hours (7:30AM - 10:00AM)</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="rounded-md bg-muted p-4 text-blue-800 dark:text-blue-300 mb-4 mt-4">
                      <h4 className="font-medium mb-2">How it works:</h4>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Start the camera</li>
                        <li>Position student's face in the frame</li>
                        <li>System will recognize registered students</li>
                        <li>Attendance is marked automatically</li>
                      </ol>
                    </div>
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-300 mb-4">
                      <h4 className="font-medium mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Important Notes:
                      </h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Students must be properly registered with facial images</li>
                        <li>Good lighting conditions are important for accurate recognition</li>
                        <li>Students should face the camera directly</li>
                        <li>Attendance is recorded with date and time automatically</li>
                      </ul>
                    </div>
                  </div>
                </CustomCard>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
);
};

export default LiveAttendancePage;
