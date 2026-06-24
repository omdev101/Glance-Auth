import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/Dashboard";
import StudentsPage from "./pages/admin/Students";
import PendingProfilesPage from "./pages/admin/PendingProfiles";
import AttendanceLogsPage from "./pages/admin/AttendanceLogs";
import AttendanceReports from "./pages/admin/AttendanceReports";
import StudentRegistration from "./pages/admin/StudentRegistration";
import AddStudent from "./pages/admin/AddStudent";
import AdminProfilePage from "./pages/admin/Profile";
import LiveAttendancePage from "./pages/admin/LiveAttendance";
import StudentDashboard from "./pages/student/Dashboard";
import FaceScan from "./pages/FaceScan";
import MarkAttendance from "./pages/MarkAttendance";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import Forbidden from "./pages/Forbidden";
import ServerError from "./pages/ServerError";
import ProfileCompletion from './pages/student/ProfileCompletion';
import StudentAttendance from './pages/student/Attendance';
import AttendanceRecordsPage from "./pages/admin/AttendanceRecords";
import StudentAttendanceDetailPage from "./pages/admin/StudentAttendanceDetail";
import StudentDetail from "./pages/admin/StudentDetail";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import ContactSubmissionsPage from "./pages/admin/ContactSubmissions";

const queryClient = new QueryClient();

// Auth context type
export type AuthContextType = {
  isAuthenticated: boolean;
  userRole: string | null;
  userName: string | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  getToken: () => string | null;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if token exists on startup
    const token = localStorage.getItem('token');
    const savedUserData = localStorage.getItem('userData');
    
    if (token && savedUserData) {
      try {
        const userData = JSON.parse(savedUserData);
        setIsAuthenticated(true);
        setUserRole(userData.role || null);
        setUserName(userData.name || null);
      } catch (e) {
        console.error('Error parsing saved user data', e);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }
    }
  }, []);
  
  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUserRole(userData.role || null);
    setUserName(userData.name || null);
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName(null);
  };
  
  const getToken = () => {
    return localStorage.getItem('token');
  };
  
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      userName, 
      login, 
      logout,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route component
const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/mark-attendance" element={
                <AuthRoute>
                  <MarkAttendance />
                </AuthRoute>
              } />
              
              {/* Footer Pages */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <AuthRoute>
                  <AdminDashboard />
                </AuthRoute>
              } />
              <Route path="/admin/students" element={
                <AuthRoute>
                  <StudentsPage />
                </AuthRoute>
              } />
              <Route path="/admin/pending-profiles" element={
                <AuthRoute>
                  <PendingProfilesPage />
                </AuthRoute>
              } />
              <Route path="/admin/students/register" element={
                <AuthRoute>
                  <StudentRegistration />
                </AuthRoute>
              } />
              <Route path="/admin/students/new" element={
                <AuthRoute>
                  <AddStudent />
                </AuthRoute>
              } />
              <Route path="/admin/attendance" element={
                <AuthRoute>
                  <AttendanceLogsPage />
                </AuthRoute>
              } />
              <Route path="/admin/attendance-records" element={
                <AuthRoute>
                  <AttendanceRecordsPage />
                </AuthRoute>
              } />
              <Route path="/admin/students/:studentId/attendance" element={
                <AuthRoute>
                  <StudentAttendanceDetailPage />
                </AuthRoute>
              } />
              <Route path="/admin/live-attendance" element={
                <AuthRoute>
                  <LiveAttendancePage />
                </AuthRoute>
              } />
              <Route path="/admin/reports" element={
                <AuthRoute>
                  <AttendanceReports />
                </AuthRoute>
              } />
              <Route path="/admin/profile" element={
                <AuthRoute>
                  <AdminProfilePage />
                </AuthRoute>
              } />
              <Route path="/admin/contact-submissions" element={
                <AuthRoute>
                  <ContactSubmissionsPage />
                </AuthRoute>
              } />
              <Route path="/admin/students/:id" element={
                <AuthRoute>
                  <StudentDetail />
                </AuthRoute>
              } />
              <Route path="/admin/students/:id/create-profile" element={
                <AuthRoute>
                  <AddStudent />
                </AuthRoute>
              } />
              <Route path="/admin/students/:id/upload-face" element={
                <AuthRoute>
                  <AddStudent />
                </AuthRoute>
              } />
              <Route path="/admin/students/:id/edit" element={
                <AuthRoute>
                  <AddStudent />
                </AuthRoute>
              } />
              
              {/* Student Routes */}
              <Route 
                path="/student/dashboard" 
                element={
                  <AuthRoute>
                    <StudentDashboard />
                  </AuthRoute>
                } 
              />
              <Route 
                path="/student/profile-completion" 
                element={
                  <AuthRoute>
                    <ProfileCompletion />
                  </AuthRoute>
                } 
              />
              <Route 
                path="/student/attendance" 
                element={
                  <AuthRoute>
                    <StudentAttendance />
                  </AuthRoute>
                } 
              />
              
              {/* Shared Routes */}
              <Route path="/scan" element={
                <AuthRoute>
                  <FaceScan />
                </AuthRoute>
              } />
              
              {/* Public Live Attendance Route */}
              <Route path="/live-attendance" element={<LiveAttendancePage />} />
              
              {/* Error Routes */}
              <Route path="/401" element={<Unauthorized />} />
              <Route path="/403" element={<Forbidden />} />
              <Route path="/500" element={<ServerError />} />
              <Route path="/404" element={<NotFound />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
