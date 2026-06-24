
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CustomCard from '@/components/ui/CustomCard';
import WebcamCapture from '@/components/WebcamCapture';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, Calendar, MapPin } from 'lucide-react';

const FaceScan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<{ 
    success: boolean; 
    studentName?: string; 
    message: string; 
  } | null>(null);
  
  // Mock current class information
  const currentClass = {
    name: 'Advanced Algorithms',
    time: '09:00 - 10:30',
    date: 'Monday, May 15, 2025',
    location: 'CS-301'
  };
  
  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setIsProcessing(true);
    
    // Simulating API call to backend
    setTimeout(() => {
      setIsProcessing(false);
      
      // Simulate successful recognition most of the time
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        setRecognitionResult({
          success: true,
          studentName: 'John Doe',
          message: 'Face recognized successfully!'
        });
        
        toast({
          title: 'Success!',
          description: 'Your attendance has been recorded.',
          variant: 'default',
        });
      } else {
        setRecognitionResult({
          success: false,
          message: 'Face not recognized. Please try again.'
        });
        
        toast({
          title: 'Recognition Failed',
          description: 'Please try again or contact administrator.',
          variant: 'destructive',
        });
      }
    }, 2000);
  };
  
  const handleReset = () => {
    setCapturedImage(null);
    setRecognitionResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        userType={null} // Don't show sidebar toggle on this page
      />
      
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">Face Recognition Attendance</h1>
            <p className="text-muted-foreground mt-2">Scan your face to mark your attendance for the current class</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CustomCard>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Scan Your Face</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make sure your face is clearly visible and well-lit
                  </p>
                </div>
                
                {!recognitionResult ? (
                  <WebcamCapture 
                    onCapture={handleCapture} 
                    isProcessing={isProcessing}
                  />
                ) : (
                  <div className="space-y-6">
                    {capturedImage && (
                      <div className="relative">
                        <img 
                          src={capturedImage} 
                          alt="Captured" 
                          className="w-full max-w-2xl mx-auto rounded-lg border"
                        />
                        
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          recognitionResult.success ? 'bg-green-900/30' : 'bg-red-900/30'
                        } rounded-lg`}>
                          <div className={`bg-card p-4 rounded-full ${
                            recognitionResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {recognitionResult.success ? (
                              <CheckCircle size={48} />
                            ) : (
                              <div className="text-2xl">✗</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className={`text-xl font-semibold mb-2 ${
                        recognitionResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {recognitionResult.message}
                      </div>
                      
                      {recognitionResult.success && (
                        <p className="mb-4">
                          Welcome, <span className="font-semibold">{recognitionResult.studentName}</span>! 
                          Your attendance has been recorded.
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-3 justify-center">
                        <CustomButton
                          variant={recognitionResult.success ? 'outline' : 'primary'}
                          onClick={handleReset}
                        >
                          {recognitionResult.success ? 'Scan Again' : 'Try Again'}
                        </CustomButton>
                        
                        {recognitionResult.success && (
                          <CustomButton
                            variant="primary"
                            onClick={() => navigate('/student/dashboard')}
                          >
                            Go to Dashboard
                          </CustomButton>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CustomCard>
            </div>
            
            <div className="lg:col-span-1">
              <CustomCard>
                <h2 className="text-xl font-semibold mb-4">Current Class</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">{currentClass.name}</div>
                      <div className="text-sm text-muted-foreground">{currentClass.date}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">Class Time</div>
                      <div className="text-sm text-muted-foreground">{currentClass.time}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-sm text-muted-foreground">Room {currentClass.location}</div>
                    </div>
                  </div>
                </div>
              </CustomCard>
              
              <div className="mt-6">
                <CustomCard>
                  <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                  
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">1</div>
                      <span>Position your face clearly in front of the camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">2</div>
                      <span>Make sure you are in a well-lit environment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">3</div>
                      <span>Click the "Scan Face" button when ready</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">4</div>
                      <span>Wait for the system to verify your identity</span>
                    </li>
                  </ul>
                </CustomCard>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FaceScan;
