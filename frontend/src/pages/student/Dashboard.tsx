import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Calendar, ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentService } from '@/services/api';
import { useAuth } from '@/App';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuth();
  
  // User data
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isProfileApproved, setIsProfileApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Attendance data
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [presentClasses, setPresentClasses] = useState(0);
  const [absentClasses, setAbsentClasses] = useState(0);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Fetch student profile
        const profileResponse = await studentService.getStudentProfile();
        
        if (profileResponse.data) {
          setUser(profileResponse.data.user);
          setHasProfile(profileResponse.data.has_profile);
          setIsProfileApproved(profileResponse.data.is_approved);
        }
        
        // Fetch attendance data if profile is approved
        if (profileResponse.data.is_approved) {
          try {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            
            const attendanceResponse = await studentService.getMonthlyAttendance(currentMonth, currentYear);
            
            if (attendanceResponse.data) {
              setAttendanceRecords(attendanceResponse.data.records || []);
              
              const stats = attendanceResponse.data.statistics || {};
              setTotalClasses(stats.total_days || 0);
              setPresentClasses(stats.present || 0);
              setAbsentClasses(stats.absent || 0);
              setAttendancePercentage(stats.percentage || 0);
            }
          } catch (error) {
            console.error('Error fetching attendance data:', error);
          }
        }
        
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your profile data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [toast]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60">Present</Badge>;

      case 'absent':
        return <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60">Absent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const redirectToProfileCompletion = () => {
    navigate('/student/profile-completion');
  };
  
  return (
    <DashboardLayout userType="student">
      <div className="page-container">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="page-header">
              <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'Student'}</h1>
              <p className="page-subtitle">View your attendance records and upcoming classes</p>
            </div>
            
            {/* Profile Completion Banner */}
            {!hasProfile && (
              <div className="mb-6 bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Complete Your Profile</h2>
                    <p className="text-muted-foreground mt-1">
                      Please complete your profile to access all features of the attendance system.
                    </p>
                  </div>
                  
                  <CustomButton 
                    className="mt-4 md:mt-0"
                    size="lg"
                    onClick={redirectToProfileCompletion}
                    rightIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Complete Profile
                  </CustomButton>
                </div>
              </div>
            )}
            
            {/* Profile Pending Approval Banner */}
            {hasProfile && !isProfileApproved && (
              <div className="mb-6 bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Profile Pending Approval</h2>
                    <p className="text-muted-foreground mt-1">
                      Your profile is being reviewed by an administrator. Some features may be limited until approval.
                    </p>
                  </div>
                  
                  <CustomButton 
                    variant="outline"
                    className="mt-4 md:mt-0"
                    size="lg"
                    onClick={redirectToProfileCompletion}
                    rightIcon={<AlertCircle className="h-4 w-4" />}
                  >
                    Update Profile
                  </CustomButton>
                </div>
              </div>
            )}
            
            {/* Quick Actions Banner */}
            {hasProfile && isProfileApproved && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Attendance Records</h2>
                      <p className="text-muted-foreground mt-1">View your attendance history and statistics.</p>
                    </div>
                    
                    <CustomButton 
                      className="mt-4 md:mt-0"
                      size="lg"
                      onClick={() => navigate('/student/attendance')}
                      rightIcon={<Calendar className="h-4 w-4" />}
                    >
                      View Attendance
                    </CustomButton>
                  </div>
                </div>
              </div>
            )}
            
            {/* Detailed Stats */}
            {hasProfile && isProfileApproved && (
              <>
                {attendanceRecords.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <CustomCard className="bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                          <h3 className="text-2xl font-bold mt-1">{totalClasses}</h3>
                        </div>
                        <div className="bg-muted p-2 rounded-full">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CustomCard>
                    
                    <CustomCard className="bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Present</p>
                          <h3 className="text-2xl font-bold mt-1">{presentClasses}</h3>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CustomCard>
                    

                    
                    <CustomCard className="bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Absent</p>
                          <h3 className="text-2xl font-bold mt-1">{absentClasses}</h3>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                    </CustomCard>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                  {attendanceRecords.length > 0 && (
                    <CustomCard className="col-span-1">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Attendance Summary</h3>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="relative w-36 h-36 mb-4">
                          {/* Custom circular progress indicator */}
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              className="stroke-current text-gray-200 dark:text-gray-800"
                              strokeLinecap="round"
                              strokeWidth="3.8"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={`stroke-current ${
                                attendancePercentage >= 75 
                                  ? 'text-green-500' 
                                  : attendancePercentage >= 60 
                                    ? 'text-amber-500' 
                                    : 'text-red-500'
                              }`}
                              strokeLinecap="round"
                              strokeWidth="3.8"
                              fill="none"
                              strokeDasharray={`${attendancePercentage}, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <text x="18" y="18" fontSize="8" className="font-semibold" textAnchor="middle" dy=".3em" fill="currentColor">
                              {attendancePercentage}%
                            </text>
                          </svg>
                        </div>
                        
                        <h4 className="text-lg font-semibold">
                          {attendancePercentage >= 75 
                            ? 'Excellent!' 
                            : attendancePercentage >= 60 
                              ? 'Good Standing' 
                              : 'Needs Improvement'}
                        </h4>
                        <p className="text-sm text-muted-foreground text-center mt-1">
                          {attendancePercentage >= 75 
                            ? 'You\'re maintaining excellent attendance.' 
                            : attendancePercentage >= 60 
                              ? 'Your attendance is good, but try to improve.' 
                              : 'Your attendance is below required levels.'}
                        </p>
                      </div>
                    </CustomCard>
                  )}
                </div>
                
                <CustomCard>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recent Attendance Records</h3>
                    {attendanceRecords.length > 0 && (
                      <CustomButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate('/student/attendance')}
                        className="text-primary hover:text-primary hover:bg-muted"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        View All
                      </CustomButton>
                    )}
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.length > 0 ? (
                          attendanceRecords.slice(0, 5).map((record, index) => (
                            <TableRow key={index}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>{record.time || '-'}</TableCell>
                              <TableCell>
                                {getStatusBadge(record.status)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No attendance records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CustomCard>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
