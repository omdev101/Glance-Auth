import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import SimpleNavbar from '@/components/SimpleNavbar';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/App';
import { authService } from '@/services/api';
import { User, ShieldCheck, Mail, ArrowRight, ScanFace, KeyRound } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const auth = useAuth();
  
  const [activeTab, setActiveTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const handleLogin = async () => {
    setLoginError('');
    setIsLoading(true);
    
    try {
      if (!email.trim() || !password) {
        setLoginError('Email and password are required');
        setIsLoading(false);
        return;
      }
      
      const response = await authService.login(email, password);
      
      if (response.status === 'unverified_email' && response.require_verification) {
        setOtpEmail(response.email);
        setShowOtpVerification(true);
        toast({
          title: 'Email Verification Required',
          description: 'A verification code has been sent to your email.',
        });
        setIsLoading(false);
        return;
      }
      
      auth.login(response.access_token, response.user);
      
      toast({
        title: `Welcome, ${response.user.name}`,
        description: 'You have successfully logged in.',
      });
      
      const redirectUrl = response.redirect || (response.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      navigate(redirectUrl);
    } catch (error: any) {
      let errorMessage = 'Invalid credentials. Please try again.';
      if (error.response?.data?.error === 'Email not verified') {
        setOtpEmail(email);
        setShowOtpVerification(true);
        toast({
          title: 'Email Verification Required',
          description: 'A verification code has been sent to your email.',
        });
        errorMessage = '';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      if (errorMessage) {
        setLoginError(errorMessage);
        toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    try {
      if (!otp || otp.length < 6) {
        toast({ title: 'Invalid OTP', description: 'Please enter a valid verification code', variant: 'destructive' });
        setIsVerifying(false);
        return;
      }
      
      const response = await authService.verifyOtp(otpEmail, otp);
      
      if (response.status === 'verification_successful') {
        auth.login(response.access_token, response.user);
        toast({ title: 'Email Verified', description: 'Your account has been verified successfully.' });
        const redirectUrl = response.redirect || (response.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
        navigate(redirectUrl);
      } else {
        toast({ title: 'Verification Successful', description: 'Please log in again.' });
        setShowOtpVerification(false);
        setOtp('');
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.response?.data?.error || 'Invalid or expired verification code.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleForgotPassword = async () => {
    setForgotPasswordLoading(true);
    try {
      if (!forgotPasswordEmail.trim()) {
        toast({ title: 'Email Required', description: 'Please enter your email address', variant: 'destructive' });
        setForgotPasswordLoading(false);
        return;
      }
      
      await authService.forgotPassword(forgotPasswordEmail);
      toast({ title: 'OTP Sent', description: 'A verification code has been sent to your email.' });
      navigate(`/reset-password?email=${encodeURIComponent(forgotPasswordEmail)}`);
    } catch (error: any) {
      toast({
        title: 'Email Not Found',
        description: error.response?.data?.error || 'The email address is not registered in our system.',
        variant: 'destructive',
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleBack = () => {
    if (showOtpVerification) {
      setShowOtpVerification(false);
    } else if (showForgotPassword) {
      setShowForgotPassword(false);
    } else {
      if (window.history.length > 2) navigate(-1);
      else navigate('/');
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
              {showForgotPassword ? (
                <KeyRound className="text-primary-foreground h-7 w-7" />
              ) : showOtpVerification ? (
                <ShieldCheck className="text-primary-foreground h-7 w-7" />
              ) : (
                <ScanFace className="text-primary-foreground h-7 w-7" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {showForgotPassword ? 'Account Recovery' : showOtpVerification ? 'Verify Identity' : 'Portal Access'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {showForgotPassword 
                ? "Enter your email to receive a secure recovery code" 
                : showOtpVerification 
                  ? `We sent a code to ${otpEmail}` 
                  : "Authenticate your identity to continue"}
            </p>
          </div>
          
          <div className="w-full">
              
              {showForgotPassword ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  
                  <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Email Address</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                    
                    <div className="pt-2 flex flex-col gap-3">
                      <button 
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-70"
                      >
                        {forgotPasswordLoading ? 'Sending...' : 'Send Recovery Code'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full py-3 bg-transparent border border-border hover:bg-muted text-foreground font-semibold rounded-xl transition-colors"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </div>
              ) : showOtpVerification ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Secure Code</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none text-center text-2xl tracking-[0.5em] font-mono text-foreground"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        placeholder="••••••"
                        required
                      />
                    </div>
                    
                    <div className="pt-2 flex flex-col gap-3">
                      <button 
                        type="submit"
                        disabled={isVerifying}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Verify & Continue
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setShowOtpVerification(false); setOtp(''); }}
                        className="w-full py-3 bg-transparent border border-border hover:bg-muted text-foreground font-semibold rounded-xl transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground mb-8">Please sign in to your account.</p>
                  
                  {loginError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-xl">
                      {loginError}
                    </div>
                  )}
                  
                  <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Email Address</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <button 
                          type="button" 
                          className="text-xs font-medium text-primary hover:text-primary/80"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                  
                  <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <Link to="/register" className="font-semibold text-primary hover:text-primary/80">
                        Create one now
                      </Link>
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
