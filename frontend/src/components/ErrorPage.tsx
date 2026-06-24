import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SimpleNavbar from '@/components/SimpleNavbar';
import CustomButton from '@/components/ui/CustomButton';
import { Home, AlertTriangle, ShieldAlert, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorType = '404' | '401' | '403' | '500';

interface ErrorPageProps {
  type: ErrorType;
}

const errorConfig = {
  '404': {
    code: '404',
    title: 'Page Not Found',
    description: "The portal entry you are looking for doesn't exist or has been moved. Let's get you back to safety.",
    icon: AlertTriangle,
    color: 'from-blue-500/20 via-primary/20 to-purple-500/20',
    glow: 'shadow-[0_0_80px_rgba(var(--primary),0.3)]',
    textGlow: 'drop-shadow-[0_0_35px_rgba(var(--primary),0.8)]',
  },
  '401': {
    code: '401',
    title: 'Unauthorized',
    description: "You need to log in to access this sector of the portal. Please authenticate your identity.",
    icon: ShieldAlert,
    color: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
    glow: 'shadow-[0_0_80px_rgba(245,158,11,0.3)]',
    textGlow: 'drop-shadow-[0_0_35px_rgba(245,158,11,0.8)]',
  },
  '403': {
    code: '403',
    title: 'Access Forbidden',
    description: "Your clearance level is insufficient for this directory. Security has been notified.",
    icon: ShieldAlert,
    color: 'from-red-500/20 via-rose-500/20 to-red-900/20',
    glow: 'shadow-[0_0_80px_rgba(239,68,68,0.3)]',
    textGlow: 'drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]',
  },
  '500': {
    code: '500',
    title: 'System Failure',
    description: "Critical server error detected. Our engineers have been dispatched to resolve the anomaly.",
    icon: ServerCrash,
    color: 'from-purple-500/20 via-violet-500/20 to-indigo-500/20',
    glow: 'shadow-[0_0_80px_rgba(139,92,246,0.3)]',
    textGlow: 'drop-shadow-[0_0_35px_rgba(139,92,246,0.8)]',
  }
};

const ErrorPage = ({ type }: ErrorPageProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const config = errorConfig[type] || errorConfig['404'];
  const Icon = config.icon;

  useEffect(() => {
    console.error(
      `${config.code} Error: User encountered an error at route:`,
      location.pathname
    );
  }, [location.pathname, config.code]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      <SimpleNavbar />
      
      {/* Intense HDR Glowing Background */}
      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full blur-[120px] pointer-events-none -z-10 bg-gradient-to-tr animate-pulse duration-3000 opacity-60", config.color)}></div>
      
      {/* Grid Pattern overlay for tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)] pointer-events-none -z-10"></div>
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center z-10 relative">
        <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
          
          {/* Glowing Icon Container */}
          <div className="inline-flex items-center justify-center mb-8 relative">
            <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-60 animate-pulse", config.color)}></div>
            <div className="relative rounded-2xl bg-card p-5 flex items-center justify-center border border-border shadow-2xl backdrop-blur-sm z-10">
              <Icon className="h-12 w-12 text-foreground" strokeWidth={1.5} />
            </div>
          </div>
          
          {/* HDR Glitch/Glow Text */}
          <div className="relative mb-6">
            <h1 className={cn("text-[140px] md:text-[220px] font-black tracking-tighter text-foreground leading-none select-none relative z-10", config.textGlow)}>
              {config.code}
            </h1>
            {/* Pseudo glitch layers */}
            <h1 className="text-[140px] md:text-[220px] font-black tracking-tighter text-primary leading-none select-none absolute top-0 left-0 -ml-2 mt-1 opacity-40 blur-[4px] -z-10">
              {config.code}
            </h1>
            <h1 className="text-[140px] md:text-[220px] font-black tracking-tighter text-blue-500 leading-none select-none absolute top-0 left-0 ml-2 -mt-1 opacity-40 blur-[4px] -z-10">
              {config.code}
            </h1>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">
            {config.title}
          </h2>
          
          <p className="text-muted-foreground max-w-lg mx-auto mb-12 text-lg md:text-xl font-medium leading-relaxed backdrop-blur-md bg-background/40 p-6 rounded-2xl border border-border/50 shadow-lg">
            {config.description}
          </p>
          
          <CustomButton 
            onClick={() => navigate('/')}
            className="rounded-xl px-10 py-7 text-lg font-bold shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden border border-primary/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-primary/30 group-hover:opacity-100 opacity-0 transition-opacity duration-500"></div>
            <Home className="mr-3 h-6 w-6 relative z-10 group-hover:text-primary-foreground transition-colors" />
            <span className="relative z-10 group-hover:text-primary-foreground transition-colors">Return to Safety</span>
          </CustomButton>
        </div>
      </main>
    </div>
  );
};

export default ErrorPage;
