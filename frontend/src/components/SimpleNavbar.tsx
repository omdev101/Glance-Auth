import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanFace, ArrowLeft, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import CustomButton from './ui/CustomButton';
import { cn } from '@/lib/utils';

interface SimpleNavbarProps {
  onBack?: () => void;
}

const SimpleNavbar = ({ onBack }: SimpleNavbarProps = {}) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-background sticky top-0 z-50 px-8 py-8 md:px-12 md:py-10 flex items-center justify-between w-full">
        <div className="flex-1 flex justify-start">
          <CustomButton 
            variant="outline"
            onClick={handleBackClick}
            size="icon"
            className="text-foreground border-border hover:bg-muted w-10 h-10 rounded-full"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </CustomButton>
        </div>
        
        <div className="flex-1 flex justify-center items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="rounded-xl bg-foreground text-background p-2 shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <ScanFace className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight hidden sm:inline-block">Glance Auth</span>
          </Link>
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
  );
};

export default SimpleNavbar;