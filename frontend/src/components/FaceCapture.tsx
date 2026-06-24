import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import CustomButton from './ui/CustomButton';
import CustomCard from './ui/CustomCard';
import { Camera, RefreshCw, ScanFace } from 'lucide-react';

interface FaceCaptureProps {
  onImageCapture: (imageSrc: string) => void;
  isProcessing?: boolean;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onImageCapture, isProcessing = false }) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: "user"
  };

  useEffect(() => {
    if (isProcessing) {
      setIsScanning(true);
    } else {
      setIsScanning(false);
    }
  }, [isProcessing]);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
      if (imageSrc) {
        onImageCapture(imageSrc);
      }
    }
  }, [webcamRef, onImageCapture]);

  const retake = () => {
    setImgSrc(null);
  };

  return (
    <div className="w-full">
      <CustomCard className="overflow-hidden border-border bg-card">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-muted rounded-md">
              <ScanFace className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Facial Recognition</h3>
          </div>
          <p className="text-muted-foreground mb-6 text-sm">
            Please look directly at the camera. Ensure you are in a well-lit environment without wearing sunglasses or a mask.
          </p>

          <div className="flex justify-center mb-6">
            <div className="relative w-full max-w-md aspect-video rounded-md overflow-hidden ring-1 ring-border bg-muted flex items-center justify-center">
              {imgSrc ? (
                <>
                  <img src={imgSrc} alt="Captured face" className="w-full h-full object-cover" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-background/10 pointer-events-none">
                      <div className="w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.8)] absolute animate-scan"></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full h-full object-cover"
                    mirrored={true}
                  />
                  {/* Viewfinder overlay */}
                  <div className="absolute inset-0 pointer-events-none border-[2px] border-primary/20 rounded-md m-4">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm -mt-0.5 -ml-0.5"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-sm -mt-0.5 -mr-0.5"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-sm -mb-0.5 -ml-0.5"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm -mb-0.5 -mr-0.5"></div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            {imgSrc ? (
              <CustomButton
                variant="outline"
                size="default"
                className="w-full max-w-[200px]"
                onClick={retake}
                disabled={isProcessing}
                leftIcon={<RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />}
              >
                {isProcessing ? 'Processing...' : 'Retake Photo'}
              </CustomButton>
            ) : (
              <CustomButton
                variant="default"
                size="default"
                className="w-full max-w-[200px]"
                onClick={capture}
                disabled={isProcessing}
                leftIcon={<Camera className="h-4 w-4" />}
              >
                Capture Face
              </CustomButton>
            )}
          </div>
        </div>
      </CustomCard>
    </div>
  );
};

export default FaceCapture;