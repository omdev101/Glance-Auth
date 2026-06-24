import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Users, Calendar, BarChart4, User, Clock, Home, UserCircle, Settings, Mail, Camera, Sun, Moon, LogOut, Monitor, Menu, X, ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/App';
import { useTheme } from '@/components/ThemeProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  isOpen: boolean;
  userType: 'admin' | 'student';
  onClose?: () => void;
}

interface SubMenuItem {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  collapsible?: boolean;
  id?: string;
  subItems?: SubMenuItem[];
}

const Sidebar = ({ isOpen, userType, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  
  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const isLinkActive = (href: string) => {
    return location.pathname === href;
  };
  
  const handleLogout = () => {
    auth.logout();
    navigate('/');
  };

  const userInitials = auth.userName?.split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase() || 'U';

  // Student menu items
  const studentMenuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      href: '/student/dashboard',
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: 'Profile',
      href: '/student/profile-completion',
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: 'Attendance',
      href: '/student/attendance',
      icon: <Clock className="h-5 w-5" />,
    },
  ];
  
  // Admin menu items
  const adminMenuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: 'All Students',
      href: '/admin/students',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Pending Profiles',
      href: '/admin/pending-profiles',
      icon: <User className="h-5 w-5" />,
    },
    {
      title: 'Add Student',
      href: '/admin/students/new',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Attendance Records',
      href: '/admin/attendance-records',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: 'Live Attendance',
      href: '/admin/live-attendance',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: 'Reports',
      href: '/admin/reports',
      icon: <BarChart4 className="h-5 w-5" />,
    },
    {
      title: 'Contact Submissions',
      href: '/admin/contact-submissions',
      icon: <Mail className="h-5 w-5" />,
    },
    {
      title: 'Settings',
      href: '/admin/profile',
      icon: <Settings className="h-5 w-5" />,
    },
  ];
  
  const menuItems = userType === 'admin' ? adminMenuItems : studentMenuItems;
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border bg-card/50">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="rounded-xl bg-foreground text-background p-2 shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <ScanFace className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">Glance Auth</span>
          </Link>
          <button 
            className="ml-auto p-2 lg:hidden rounded-md text-muted-foreground hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1 scrollbar-thin">
          <ul className="space-y-1.5">
            {menuItems.map((item, index) => (
              <li key={index}>
                {item.collapsible && item.id ? (
                  <Collapsible 
                    open={item.id ? openCollapsibles[item.id] : false} 
                    onOpenChange={() => item.id && toggleCollapsible(item.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                          item.id && openCollapsibles[item.id] 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {item.icon}
                        <span className="ms-3 flex-1 text-left">{item.title}</span>
                        {item.id && openCollapsibles[item.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-11 pr-2 pt-1 pb-2">
                      <ul className="space-y-1">
                        {item.subItems?.map((subItem, subIndex) => (
                          <li key={subIndex}>
                            <Link
                              to={subItem.href}
                              className={cn(
                                "block px-3 py-2 rounded-md text-sm transition-colors",
                                isLinkActive(subItem.href) 
                                  ? "bg-primary/10 text-primary font-medium" 
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {subItem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                      isLinkActive(item.href) 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {React.cloneElement(item.icon as React.ReactElement, {
                      className: cn("h-5 w-5", isLinkActive(item.href) ? "text-primary-foreground" : "")
                    })}
                    <span className="ms-3">{item.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Area: Theme Toggle & User Profile */}
        <div className="border-t border-border p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-sm text-muted-foreground font-medium">Theme</span>
            <div className="flex bg-muted rounded-full p-1 border border-border/50">
              <button
                onClick={() => setTheme('light')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'light' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'system' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'dark' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/20">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{auth.userName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{userType}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to={userType === 'admin' ? '/admin/profile' : '/student/profile-completion'}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
