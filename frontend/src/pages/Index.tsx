import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ShieldCheck, Camera, Clock, Sun, Moon, Monitor, ScanFace } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config';
import { format } from 'date-fns';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showLiveAttendance, setShowLiveAttendance] = useState(() => {
    const savedValue = localStorage.getItem('liveAttendanceVisible');
    return savedValue === 'true';
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigateToLogin = (userType: string) => {
    navigate(`/login?type=${userType}`);
  };
  
  const navigateToMarkAttendance = () => {
    navigate('/live-attendance');
  };
  
  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Backend sync effect
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await axios.get(`${API_URL}/api/health`, { timeout: 3000 });
        return true;
      } catch (error) {
        return false;
      }
    };

    const checkLiveAttendanceStatus = async () => {
      try {
        const connected = await checkBackendConnection();
        if (!connected) {
          if (retryCount < 5) {
            setTimeout(() => setRetryCount(prev => prev + 1), 10000);
          }
          return;
        }
        
        if (retryCount > 0) setRetryCount(0);
        
        const fullUrl = `${API_URL}/api/settings/live-attendance-status`;
        const response = await axios.get(fullUrl, {
          timeout: 8000,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
        });
        
        if (response.data && response.data.isVisible !== undefined) {
          const shouldShow = Boolean(response.data.isVisible);
          setShowLiveAttendance(shouldShow);
          localStorage.setItem('liveAttendanceVisible', String(shouldShow));
          
          if (response.data.autoSchedule !== undefined) {
            localStorage.setItem('liveAttendanceAutoSchedule', String(response.data.autoSchedule));
          }
        } else {
          const savedValue = localStorage.getItem('liveAttendanceVisible');
          setShowLiveAttendance(savedValue === 'true');
        }
      } catch (error) {
        const isVisible = localStorage.getItem('liveAttendanceVisible');
        setShowLiveAttendance(isVisible === 'true');
        if (retryCount < 5) {
          setTimeout(() => setRetryCount(prev => prev + 1), 10000);
        }
      }
    };
    
    checkLiveAttendanceStatus();
    const intervalId = setInterval(checkLiveAttendanceStatus, 60000);
    
    if (retryCount > 0) {
      checkLiveAttendanceStatus();
    }
    
    return () => clearInterval(intervalId);
  }, [retryCount]);

  // Determine greeting based on hour
  const hour = currentTime.getHours();
  let greeting = "Good Evening";
  if (hour >= 5 && hour < 12) greeting = "Good Morning";
  else if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  else if (hour >= 17 && hour < 22) greeting = "Good Evening";
  else greeting = "Good Night";

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans relative overflow-hidden">
      
      {/* Top Bar */}
      <header className="relative z-50 px-4 py-6 md:px-12 md:py-10 flex items-center justify-between w-full flex-shrink-0">
        <div className="flex-1 flex justify-start">
          <div className="text-sm font-medium text-muted-foreground bg-muted/80 px-4 py-1.5 rounded-full backdrop-blur-md inline-flex items-center">
            Portal Entry
          </div>
        </div>
        
        <div className="flex-1 flex justify-center items-center">
          <div className="flex items-center gap-3 group">
            <div className="rounded-xl bg-foreground text-background p-2 shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <ScanFace className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight hidden sm:inline-block">Glance Auth</span>
          </div>
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
      </header>

      {/* Main Portal View */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center justify-center mb-6">
            <Clock className="w-5 h-5 text-muted-foreground mr-2" />
            <span className="text-muted-foreground font-medium tracking-wide uppercase">
              {format(currentTime, 'EEEE, MMMM do, yyyy')}
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-4">
            {format(currentTime, 'h:mm')}
            <span className="text-2xl md:text-3xl text-muted-foreground ml-2 font-medium">{format(currentTime, 'a')}</span>
          </h1>
          
          <h2 className="text-3xl md:text-4xl text-muted-foreground font-light tracking-tight">
            {greeting}, welcome to the portal.
          </h2>
        </div>

        {/* Action Cards Grid */}
        <div className={`grid grid-cols-1 ${showLiveAttendance ? 'md:grid-cols-2' : ''} gap-6 w-full max-w-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150`}>
          
          {showLiveAttendance && (
            <button 
              onClick={navigateToMarkAttendance}
              className="group relative bg-foreground hover:bg-foreground/90 text-background p-8 rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-[1.02] hover:shadow-2xl border border-transparent overflow-hidden h-64"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-muted/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Camera className="w-12 h-12 mb-6 text-background" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold mb-3 relative z-10">Launch Scanner</h3>
              <p className="text-background/80 text-sm text-center max-w-xs relative z-10">Open the camera terminal to log attendance instantly via facial recognition.</p>
            </button>
          )}

          <button 
            onClick={() => navigateToLogin('student')}
            className={`group bg-card hover:bg-muted text-card-foreground p-8 rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-[1.02] hover:shadow-xl border border-border h-64 ${!showLiveAttendance ? 'max-w-md mx-auto w-full' : ''}`}
          >
            <div className="flex gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                <User className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3">Portal Login</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs">Access your personal dashboard or enter the admin console.</p>
          </button>

        </div>
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 inset-x-0 h-full pointer-events-none -z-10 bg-background"></div>
      
      <footer className="p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground font-medium z-10">
        <div>Glance Auth Internal Portal • System Operational</div>
        <div>Developed by Om</div>
        <div className="flex gap-6 mt-2">
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Support</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
