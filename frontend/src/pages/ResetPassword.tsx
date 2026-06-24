import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import SimpleNavbar from '@/components/SimpleNavbar';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Extract query parameters
  const queryParams = new URLSearchParams(location.search);
  const emailFromQuery = queryParams.get('email');
  const tokenFromQuery = queryParams.get('token');
  
  // Define states
  const [step, setStep] = useState(emailFromQuery && tokenFromQuery ? 'reset' : 'verify');
  const [email, setEmail] = useState(emailFromQuery || '');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(tokenFromQuery || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!otp.trim()) {
      setErrorMessage('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Call the verify reset OTP API
      const response = await authService.verifyResetOtp(email, otp);
      
      // Get the reset token
      setResetToken(response.reset_token);
      
      // Move to the next step
      setStep('reset');
      
      toast({
        title: 'Verification Successful',
        description: 'Please set your new password',
      });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      let errorMessage = 'Invalid or expired verification code.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      setErrorMessage(errorMessage);
      
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!password.trim()) {
      setErrorMessage('Please enter a new password');
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Call the reset password API
      await authService.resetPassword(resetToken, password);
      
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been updated. You can now log in.',
      });
      
      // Redirect to login
      navigate('/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to reset password. The link may have expired.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      setErrorMessage(errorMessage);
      
      toast({
        title: 'Password Reset Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resend OTP
  const handleResendOtp = async () => {
    if (!email) {
      setErrorMessage('Email is required');
      return;
    }
    
    try {
      await authService.forgotPassword(email);
      
      toast({
        title: 'OTP Sent',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (error: any) {
      let errorMessage = 'Failed to send verification code.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: 'Failed to send code',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => {
    if (step === 'reset' && !tokenFromQuery) {
      setStep('verify');
    } else {
      if (window.history.length > 2) navigate(-1);
      else navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SimpleNavbar onBack={handleBack} />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none -z-10"></div>
        
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/50 p-8 flex flex-col relative z-10 backdrop-blur-sm">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg mb-4">
              {step === 'verify' ? (
                <ShieldCheck className="text-primary-foreground h-7 w-7" />
              ) : (
                <KeyRound className="text-primary-foreground h-7 w-7" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {step === 'verify' ? 'Verification Required' : 'Set New Password'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {step === 'verify' 
                ? 'Enter the secure code sent to your email' 
                : 'Choose a strong password to secure your account'}
            </p>
          </div>
          {step === 'verify' ? (
            <div className="space-y-6">
              
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              
              <form onSubmit={handleVerifyOtp}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium">Email</label>
                    <input 
                      id="email" 
                      type="email" 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none text-foreground"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!!emailFromQuery}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="otp" className="block text-sm font-medium">Verification Code</label>
                    <input 
                      id="otp" 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none text-center text-2xl tracking-[0.5em] font-mono text-foreground"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      maxLength={6}
                      placeholder="6-digit code"
                      required
                    />
                  </div>
                  
                  <CustomButton 
                    variant="primary" 
                    className="w-full py-6 rounded-xl text-md font-semibold mt-2" 
                    type="submit"
                    isLoading={isLoading}
                  >
                    Verify Code
                  </CustomButton>
                  
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Didn't receive a code?{' '}
                    <button 
                      type="button"
                      className="text-primary hover:text-primary font-medium"
                      onClick={handleResendOtp}
                    >
                      Resend code
                    </button>
                  </p>
                  
                  <div className="pt-4 text-center border-t">
                    <Link to="/login" className="text-primary hover:underline text-sm">
                      Back to login
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              
              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium">New Password</label>
                    <input 
                      id="password" 
                      type="password" 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none text-foreground"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm Password</label>
                    <input 
                      id="confirm-password" 
                      type="password" 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none text-foreground"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <CustomButton 
                    variant="primary" 
                    className="w-full py-6 rounded-xl text-md font-semibold mt-2" 
                    type="submit"
                    isLoading={isLoading}
                    leftIcon={<Lock size={18} />}
                  >
                    Reset Password
                  </CustomButton>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword; 