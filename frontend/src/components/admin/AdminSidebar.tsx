import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Clock, 
  User, 
  LogOut,
  Layers,
  PlusSquare,
  FileCheck,
  Mail
} from 'lucide-react';
import { useAuth } from '@/App';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentPage?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, setIsOpen, currentPage }) => {
  const location = useLocation();
  const auth = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <Home className="h-5 w-5" /> },
    { name: 'Students', path: '/admin/students', icon: <Users className="h-5 w-5" /> },
    { name: 'Pending Profiles', path: '/admin/pending-profiles', icon: <FileCheck className="h-5 w-5" /> },
    { name: 'Live Attendance', path: '/admin/live-attendance', icon: <Clock className="h-5 w-5" /> },
    { name: 'Attendance Records', path: '/admin/attendance-records', icon: <FileText className="h-5 w-5" /> },
    { name: 'Contact Submissions', path: '/admin/contact-submissions', icon: <Mail className="h-5 w-5" /> },
    { name: 'My Profile', path: '/admin/profile', icon: <User className="h-5 w-5" /> }
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path || currentPage === path.replace('/admin/', '');
  };
  
  return (
    <div 
      className={`bg-college-800 text-white transition-all h-screen ${
        isOpen ? 'w-64' : 'w-16'
      } flex flex-col fixed md:relative z-40`}
    >
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    
      <div className="p-4 flex items-center justify-between">
        <div className={`flex items-center space-x-2 ${!isOpen && 'hidden'}`}>
          <div className="rounded-full bg-college-600 p-1 flex items-center justify-center">
            <span className="text-white text-xs font-bold">FA</span>
          </div>
          <span className="text-xl font-bold">Glance Auth</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg text-white hover:bg-college-700 focus:outline-none md:hidden"
        >
          {isOpen ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex-1 py-6 flex flex-col justify-between">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center py-3 px-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-college-700 text-white'
                  : 'text-college-200 hover:bg-college-700 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                {item.icon}
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>
                  {item.name}
                </span>
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="px-2 space-y-1">
          <button 
            onClick={auth.logout}
            className="w-full flex items-center py-3 px-3 rounded-lg text-college-200 hover:bg-college-700 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className={`ml-3 ${!isOpen && 'hidden'}`}>
              Sign out
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar; 