
import React, { useState, useRef, useCallback } from 'react';
import CustomButton from './ui/CustomButton';
import { Scan, Camera, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isProcessing?: boolean;
}

const WebcamCapture = ({ onCapture, isProcessing = false }: WebcamCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the data URL from the canvas
        const imageSrc = canvas.toDataURL('image/png');
        
        // Pass the image data to the parent component
        onCapture(imageSrc);
      }
    }
  }, [onCapture]);

  const handleRestartCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Clean up on component unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "relative w-full max-w-2xl bg-black rounded-lg overflow-hidden mb-4",
        isCameraActive ? "aspect-video" : "aspect-video bg-gray-900 flex items-center justify-center"
      )}>
        {!isCameraActive && !error && (
          <div className="text-center text-white p-4 flex flex-col items-center gap-4">
            <Camera className="w-12 h-12 opacity-40 mb-2" />
            <p className="opacity-70">Camera is not active</p>
            <CustomButton 
              variant="primary" 
              onClick={startCamera} 
              leftIcon={<Camera className="h-4 w-4" />}
            >
              Start Camera
            </CustomButton>
          </div>
        )}

        {error && (
          <div className="text-center text-white p-4">
            <p className="text-red-400 mb-3">{error}</p>
            <CustomButton 
              variant="secondary" 
              onClick={startCamera}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Retry
            </CustomButton>
          </div>
        )}

        <video 
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover",
            !isCameraActive && "hidden"
          )}
          autoPlay 
          playsInline 
          muted
        />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="inline-block p-3 rounded-full bg-college-700/30 mb-3">
                <Scan className="h-8 w-8 animate-pulse" />
              </div>
              <p className="text-lg font-medium">Processing...</p>
              <p className="text-sm opacity-70 mt-1">Please wait while we verify your face</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden canvas for capturing image */}
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex flex-wrap gap-3 justify-center">
        {isCameraActive && (
          <>
            <CustomButton
              variant="primary"
              onClick={captureImage}
              leftIcon={<Scan className="h-4 w-4" />}
              isLoading={isProcessing}
              disabled={isProcessing}
            >
              Scan Face
            </CustomButton>
            
            <CustomButton
              variant="outline"
              onClick={handleRestartCamera}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              disabled={isProcessing}
            >
              Reset Camera
            </CustomButton>
            
            <CustomButton
              variant="ghost"
              onClick={stopCamera}
              disabled={isProcessing}
            >
              Turn Off Camera
            </CustomButton>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
