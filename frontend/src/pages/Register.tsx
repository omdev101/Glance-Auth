import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SimpleNavbar from '@/components/SimpleNavbar';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api';
import { ScanFace, UserPlus, ArrowRight, ShieldCheck, Mail, AlertCircle } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [isServerError, setIsServerError] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError('');
    setIsServerError(false);
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password) {
      setRegistrationError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setRegistrationError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullName = `${firstName} ${lastName}`;
      await authService.register(fullName, email, password, 'student', phoneNumber);
      
      setShowOtpVerification(true);
      toast({ title: 'Registration Started', description: 'Please check your email for the verification code.' });
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      if (error.message?.includes('Unable to connect to the server')) {
        errorMessage = error.message;
        setIsServerError(true);
      } else if (error.response?.status === 409) {
        errorMessage = 'This email address is already registered. Please login instead.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setRegistrationError(errorMessage);
      toast({ title: 'Registration Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setRegistrationError('OTP is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.verifyOtp(email, otp);
      toast({ title: 'Registration Successful', description: 'Your email has been verified. You can now log in.' });
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'OTP verification failed. Please try again.';
      setRegistrationError(errorMessage);
      toast({ title: 'Verification Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    if (!email) return;
    try {
      await authService.resendOtp(email);
      toast({ title: 'OTP Resent', description: 'A new verification code has been sent to your email.' });
    } catch (error: any) {
      toast({ title: 'Resend Failed', description: error.response?.data?.error || 'Failed to resend OTP.', variant: 'destructive' });
    }
  };

  const handleBack = () => {
    if (showOtpVerification) {
      setShowOtpVerification(false);
    } else {
      if (window.history.length > 2) navigate(-1);
      else navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SimpleNavbar onBack={handleBack} />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row-reverse bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          
          {/* Right Side - Professional Branding */}
          <div className="lg:w-5/12 p-10 bg-muted/30 flex flex-col justify-center relative overflow-hidden border-l border-border">
            <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 -mr-20 -mb-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
            
            <div className="relative z-10 w-full max-w-sm mx-auto">
              <div className="flex flex-col gap-6 mb-10">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                  <UserPlus className="text-primary-foreground h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold text-foreground leading-snug">
                  Enterprise Access <br/> Provisioning
                </h3>
                <p className="text-muted-foreground text-lg">
                  Create your secure personnel profile to access the organizational attendance network.
                </p>
              </div>
              
              <ul className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Secure Identity Verification" },
                  { icon: ScanFace, text: "Biometric Access Control" },
                  { icon: Mail, text: "Centralized Compliance Logs" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 bg-card/60 backdrop-blur-sm p-3 rounded-xl border border-border shadow-sm">
                    <div className="p-2 bg-muted text-primary rounded-lg"><item.icon size={18} /></div>
                    <span className="text-sm font-medium text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Left Side - Registration Form */}
          <div className="lg:w-7/12 p-10 flex flex-col justify-center bg-card">
            <div className="max-w-md w-full mx-auto">
              
              {showOtpVerification ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Verify Email</h2>
                  <p className="text-sm text-muted-foreground mb-8">We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span></p>
                  
                  {registrationError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-xl">
                      {registrationError}
                    </div>
                  )}

                  <form onSubmit={handleOtpVerification} className="space-y-5">
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
                        disabled={isLoading}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Verify & Register
                      </button>
                      <button 
                        type="button"
                        onClick={handleResendOtp}
                        className="w-full py-3 bg-transparent border border-border hover:bg-muted text-foreground font-semibold rounded-xl transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Create Account</h2>
                  <p className="text-sm text-muted-foreground mb-8">Enter your details to register as a new student.</p>
                  
                  {registrationError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{registrationError}</span>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">First Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Last Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Email Address</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="1234567890"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Confirm Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all outline-none"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Processing...' : 'Create Account'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                  
                  <div className="mt-8 text-center border-t border-border pt-6">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Link to="/login" className="font-semibold text-primary hover:text-primary/80">
                        Sign in instead
                      </Link>
                    </p>
                  </div>
                </div>
              )}
              
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default Register;