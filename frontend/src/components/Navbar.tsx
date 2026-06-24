import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Camera, Sun, Moon, Monitor, ScanFace } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { useAuth } from '@/App';
import { useTheme } from '@/components/ThemeProvider';

interface NavbarProps {
  toggleSidebar?: () => void;
  userType?: 'admin' | 'student' | null;
  userName?: string;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const auth = useAuth();
  const isAuthenticated = auth.isAuthenticated;
  const userRole = auth.userRole;
  const userName = auth.userName;
  
  const userInitials = userName?.split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    auth.logout();
    navigate('/');
  };

  const mobileMenuItems = [
    { label: 'Home', href: '/', showWhenAuth: false },
    { label: 'Dashboard', href: userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard', showWhenAuth: true },
    { label: 'Terms', href: '/terms', showWhenAuth: false },
    { label: 'Contact', href: '/contact', showWhenAuth: false },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {userRole && (
            <button 
              className="mr-2 p-2 rounded-md lg:hidden hover:bg-muted transition-colors"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          )}
          
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-xl bg-foreground text-background p-2 shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <ScanFace className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight hidden sm:block">Glance Auth</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {!isAuthenticated && (
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-6">
              <Link
                to={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  location.pathname.includes("/dashboard") ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Dashboard
              </Link>
              
              <div className="flex bg-muted rounded-full p-1 border border-border/50">
                <button onClick={() => setTheme('light')} className={cn("p-1 rounded-full transition-all", theme === 'light' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="Light theme"><Sun className="h-4 w-4" /></button>
                <button onClick={() => setTheme('system')} className={cn("p-1 rounded-full transition-all", theme === 'system' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="System theme"><Monitor className="h-4 w-4" /></button>
                <button onClick={() => setTheme('dark')} className={cn("p-1 rounded-full transition-all", theme === 'dark' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="Dark theme"><Moon className="h-4 w-4" /></button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none transition-transform hover:scale-105">
                    <Avatar className="border-2 border-border shadow-sm">
                      <AvatarFallback className="bg-muted text-foreground font-bold">
                        {userInitials || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-lg border-border bg-popover">
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="font-normal text-xs text-muted-foreground">Signed in as</div>
                    <div className="font-bold text-sm truncate text-foreground">{userName || 'User'}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="rounded-md cursor-pointer hover:bg-muted">
                    <Link to={userRole === 'admin' ? '/admin/profile' : '/student/profile-completion'}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-md cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex bg-muted rounded-full p-1 border border-border/50 mr-2">
                <button onClick={() => setTheme('light')} className={cn("p-1 rounded-full transition-all", theme === 'light' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="Light theme"><Sun className="h-4 w-4" /></button>
                <button onClick={() => setTheme('system')} className={cn("p-1 rounded-full transition-all", theme === 'system' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="System theme"><Monitor className="h-4 w-4" /></button>
                <button onClick={() => setTheme('dark')} className={cn("p-1 rounded-full transition-all", theme === 'dark' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")} title="Dark theme"><Moon className="h-4 w-4" /></button>
              </div>
              <Link to="/login?type=student" className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors px-3 py-2">
                Login
              </Link>
              <Link to="/register" className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm">
                Sign Up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="p-2 md:hidden rounded-md hover:bg-muted transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="container md:hidden pb-4 border-t border-border pt-2 bg-background">
          <nav className="flex flex-col space-y-2">
            {!isAuthenticated && (
              <>
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 text-sm font-medium rounded-lg text-foreground hover:bg-muted">Home</Link>
                <Link to="/login?type=student" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 text-sm font-medium rounded-lg text-foreground hover:bg-muted">Login</Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 text-sm font-medium rounded-lg text-primary hover:bg-muted">Sign Up</Link>
              </>
            )}
            
            {mobileMenuItems.map((item) => {
              if (item.showWhenAuth && !isAuthenticated) return null;
              if (!item.showWhenAuth && isAuthenticated) return null;

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    location.pathname === item.href ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <button 
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="px-3 py-2 mt-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-left flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
