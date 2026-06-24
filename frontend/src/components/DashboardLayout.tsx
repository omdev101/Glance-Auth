import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: 'admin' | 'student';
  hideSidebar?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, userType, hideSidebar = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar automatically on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false); // Sidebar CSS uses 'translate-x-0' on lg screens natively
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 relative">
        {!hideSidebar && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            userType={userType} 
          />
        )}
        
        <main className={`flex-1 p-4 md:p-6 w-full min-w-0 transition-all duration-300 ${!hideSidebar ? 'lg:ml-64' : ''}`}>
          {/* Mobile Header */}
          {!hideSidebar && (
            <div className="lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h1 className="font-bold text-xl text-foreground tracking-tight">Glance Auth</h1>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                aria-label="Open Menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
