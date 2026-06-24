import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FaceCapture from '@/components/FaceCapture';
import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, CalendarClock, ChevronRight, User } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000';

const MarkAttendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    studentName?: string;
    confidence?: number;
  } | null>(null);
  
  // Get available sessions (in a real app, this would be from API)
  const sessions = [
    { id: 1, name: 'Introduction to Computer Science', type: 'Morning Session', date: '2023-11-15' },
  ];
  
  const [selectedSession, setSelectedSession] = useState<number | null>(sessions[0]?.id || null);
  
  const handleImageCapture = async (imageSrc: string) => {
    if (!selectedSession) {
      toast({
        title: 'Error',
        description: 'Please select a session first',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Make API call to backend
      const response = await axios.post(`${BACKEND_URL}/attendance/mark`, {
        image_data: imageSrc,
        session_id: selectedSession
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // In a real app, get from auth context
        }
      });
      
      // For demo purposes, simulate success
      setResult({
        success: true,
        message: 'Attendance marked successfully!',
        studentName: 'John Doe',
        confidence: 0.92
      });
      
      toast({
        title: 'Success',
        description: 'Your attendance has been marked successfully',
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to mark attendance. Please try again.',
        variant: 'destructive',
      });
      
      setResult({
        success: false,
        message: 'Face not recognized or error processing request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-12 px-4">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Mark Your Attendance
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select your current session and scan your face to log your attendance securely and instantly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Left Column: Session Details & Results */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              {!result ? (
                <CustomCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-muted rounded-md">
                        <CalendarClock className="h-5 w-5 text-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold">Active Sessions</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`group relative p-5 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden ${
                            selectedSession === session.id
                              ? 'border-primary bg-muted'
                              : 'border-border hover:border-muted-foreground/30 bg-background'
                          }`}
                          onClick={() => setSelectedSession(session.id)}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-200 ${selectedSession === session.id ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/20'}`}></div>
                          
                          <div className="flex justify-between items-center pl-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{session.type}</p>
                              <h4 className="font-semibold text-foreground text-base">{session.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{session.date}</p>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${selectedSession === session.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CustomCard>
              ) : (
                <CustomCard className={`border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${result.success ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                  <div className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`p-3 rounded-full mb-4 ${result.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {result.success ? (
                          <CheckCircle className="h-10 w-10" />
                        ) : (
                          <XCircle className="h-10 w-10" />
                        )}
                      </div>
                      
                      <h3 className={`text-2xl font-bold mb-2 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {result.success ? 'Verified Successfully' : 'Verification Failed'}
                      </h3>
                      
                      <p className="text-muted-foreground mb-6">{result.message}</p>
                      
                      {result.success && result.studentName && (
                        <div className="w-full bg-background rounded-lg p-5 border border-border text-left mb-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-muted p-2 rounded-full">
                              <User className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Logged as</p>
                              <p className="text-base font-semibold">{result.studentName}</p>
                            </div>
                          </div>
                          
                          {result.confidence && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Confidence Match</span>
                                <span className="font-medium text-green-500">{Math.round(result.confidence * 100)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${Math.round(result.confidence * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <CustomButton
                        variant={result.success ? 'default' : 'outline'}
                        className="w-full"
                        onClick={result.success ? () => navigate('/student/dashboard') : () => setResult(null)}
                      >
                        {result.success ? 'Return to Dashboard' : 'Try Again'}
                      </CustomButton>
                    </div>
                  </div>
                </CustomCard>
              )}
            </div>
            
            {/* Right Column: Camera Capture */}
            <div className="lg:col-span-7">
              <div className="sticky top-24">
                <FaceCapture onImageCapture={handleImageCapture} isProcessing={isProcessing} />
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarkAttendance; 