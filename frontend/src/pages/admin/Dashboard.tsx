import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, UserCheck, UserX, CalendarCheck, BookOpen, Check, X, AlertCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { getToken } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { API_URL, ENDPOINTS } from '@/config';

// Define interfaces for profile data
interface PendingProfile {
  _id: string;
  user_id: string;
  college_name: string;
  course: string;
  year_of_study: number;
  registration_number: string;
  approval_status: string;
  created_at: string;
  profile_photo: string;
  face_images: {
    front: string;
    left: string;
    right: string;
  };
  user: {
    name: string;
    email: string;
    phone_number?: string;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pending profiles that need approval
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  
  // State for attendance statistics
  const [attendanceStats, setAttendanceStats] = useState({
    totalStudents: 0,
    studentsWithFaceData: 0,
    presentCount: 0,
    absentCount: 0
  });
  
  // State for viewing profile images
  const [selectedProfile, setSelectedProfile] = useState<PendingProfile | null>(null);
  const [dialogView, setDialogView] = useState<'profile' | 'front' | 'left' | 'right'>('profile');
  
  // Fetch pending profiles from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        // 1. Fetch pending profiles
        const response = await axios.get(ENDPOINTS.ADMIN_PENDING_PROFILES, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const formattedProfiles = response.data.map((item: any) => ({
          _id: item.profile._id,
          user_id: item.profile.user_id,
          college_name: item.profile.college_name,
          course: item.profile.course,
          year_of_study: item.profile.year_of_study,
          registration_number: item.profile.registration_number,
          approval_status: item.profile.is_approved ? 'approved' : 'pending',
          created_at: item.profile.created_at,
          profile_photo: item.profile.profile_photo,
          face_images: item.profile.face_images || {},
          user: item.user
        }));
        
        setPendingProfiles(formattedProfiles);
        
        // 2. Fetch all students
        const statsResponse = await axios.get(ENDPOINTS.STUDENT_ALL, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const students = statsResponse.data || [];
        const studentsWithFaceData = students.filter((s: any) => s.has_face_data).length;
        
        // 3. Fetch attendance logs to calculate today's attendance
        const logsResponse = await axios.get(ENDPOINTS.ATTENDANCE_LOGS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = logsResponse.data;
        const logs = Array.isArray(logsData) ? logsData : (logsData.records || []);
        
        // Filter logs for today using local time zone instead of UTC
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        const todaysLogs = logs.filter((log: any) => 
          (log.date && log.date === today) || 
          (log.created_at && log.created_at.startsWith(today))
        );
        
        const presentCount = todaysLogs.filter((log: any) => log.status === 'present').length;
        const absentCount = students.length > 0 ? (students.length - presentCount) : 0; // Assuming everyone else is absent
        
        setAttendanceStats({
          totalStudents: students.length,
          studentsWithFaceData,
          presentCount,
          absentCount: absentCount > 0 ? absentCount : 0
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [navigate, toast]);
  
  // Prepare chart data (merge late into present)
  const attendanceStatusData = [
    { name: 'Present', value: attendanceStats.presentCount, color: '#10b981' },
    { name: 'Absent', value: attendanceStats.absentCount, color: '#ef4444' },
  ];
  
  const hasAttendanceData = attendanceStats.totalStudents > 0 && (attendanceStats.presentCount + attendanceStats.absentCount) > 0;
  
  // Handle profile approval/rejection
  const handleProfileApproval = async (profileId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const endpoint = action === 'approve' 
        ? ENDPOINTS.ADMIN_APPROVE_PROFILE(profileId)
        : ENDPOINTS.ADMIN_REJECT_PROFILE(profileId);
      
      await axios.put(endpoint, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setPendingProfiles(prevProfiles => 
        prevProfiles.filter(profile => profile._id !== profileId)
      );
      
      toast({
        title: action === 'approve' ? 'Profile Approved' : 'Profile Rejected',
        description: `The student profile has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
    } catch (err) {
      console.error(`Error ${action}ing profile:`, err);
      toast({
        title: 'Error',
        description: `Failed to ${action} profile. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewProfile = (profile: PendingProfile, view: 'profile' | 'front' | 'left' | 'right') => {
    setSelectedProfile(profile);
    setDialogView(view);
  };

  return (
    <DashboardLayout userType="admin">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">View attendance statistics and student data</p>
        </div>
        
        {/* Enrollment Requests Alert */}
        {pendingProfiles.length > 0 && (
          <div className="mb-6">
            <CustomCard className="bg-muted border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-muted p-2 rounded-full">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Enrollment Requests</h3>
                    <p className="text-muted-foreground">You have {pendingProfiles.length} pending enrollment {pendingProfiles.length === 1 ? 'request' : 'requests'}</p>
                  </div>
                </div>
                <CustomButton 
                  variant="outline" 
                  className="mt-4 sm:mt-0"
                  onClick={() => navigate('/admin/enrollment-requests')}
                >
                  View All Requests
                </CustomButton>
              </div>
            </CustomCard>
          </div>
        )}
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <CustomCard>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <h3 className="text-2xl font-semibold mt-1">{attendanceStats.totalStudents}</h3>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CustomCard>
          
          <CustomCard>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">With Face Data</p>
                <h3 className="text-2xl font-semibold mt-1">{attendanceStats.studentsWithFaceData}</h3>
              </div>
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CustomCard>
          
          <CustomCard>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <h3 className="text-2xl font-semibold mt-1">{pendingProfiles.length}</h3>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CustomCard>
          
          <CustomCard>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Today's Attendance</p>
                <h3 className="text-2xl font-semibold mt-1">{attendanceStats.presentCount}</h3>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                <CalendarCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CustomCard>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CustomCard className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Today's Overview</h3>
            <div className="h-[300px] w-full">
              {!hasAttendanceData ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <CalendarCheck className="h-10 w-10 opacity-20" />
                  <p className="text-sm">{attendanceStats.totalStudents === 0 ? 'No students registered yet' : 'No attendance marked today'}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {attendanceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CustomCard>

          <CustomCard className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Attendance Breakdown</h3>
            <div className="h-[300px] w-full">
              {!hasAttendanceData ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Users className="h-10 w-10 opacity-20" />
                  <p className="text-sm">{attendanceStats.totalStudents === 0 ? 'No students registered yet' : 'No attendance marked today'}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceStatusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {attendanceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CustomCard>
        </div>
        
        {/* Pending Profiles Approval Section */}
        {pendingProfiles.length > 0 && (
          <div className="mb-6">
            <CustomCard className="border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Pending Profile Approvals</h3>
                  <p className="text-sm text-muted-foreground">{pendingProfiles.length} student profiles need your review</p>
                </div>
                <Badge variant="outline" className="bg-muted text-primary border-border">
                  New Profiles
                </Badge>
              </div>
              
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-pulse">Loading pending profiles...</div>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : (
                <div className="space-y-4">
                  {pendingProfiles.map(profile => (
                    <div key={profile._id} className="flex flex-col sm:flex-row justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <h4 className="font-medium">{profile.user?.name}</h4>
                        <p className="text-sm"><span className="font-medium text-muted-foreground">Email:</span> {profile.user?.email}</p>
                        <p className="text-sm"><span className="font-medium text-muted-foreground">College:</span> {profile.college_name}</p>
                        <p className="text-sm"><span className="font-medium text-muted-foreground">Course:</span> {profile.course}</p>
                        <p className="text-sm"><span className="font-medium text-muted-foreground">Registration:</span> {profile.registration_number}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-3 sm:mt-0">
                        <div className="flex gap-2 mb-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <CustomButton 
                                variant="outline" 
                                size="sm"
                                className="border-border text-primary hover:bg-muted"
                                onClick={() => handleViewProfile(profile, 'profile')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Profile
                              </CustomButton>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>
                                  {dialogView === 'profile' ? 'Profile Photo' : 'Front Face Image'}
                                </DialogTitle>
                              </DialogHeader>
                              {selectedProfile && (
                                <div className="mt-2">
                                  <div className="flex justify-center mb-4">
                                    <img 
                                      src={dialogView === 'profile' ? selectedProfile.profile_photo : selectedProfile.face_images.front} 
                                      alt={`Student ${dialogView} image`} 
                                      className="max-h-[60vh] object-contain rounded-md" 
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <DialogClose asChild>
                                      <CustomButton variant="outline">Close</CustomButton>
                                    </DialogClose>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex gap-2">
                          <CustomButton 
                            variant="outline" 
                            size="sm"
                            className="border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 dark:bg-red-950/30"
                            onClick={() => handleProfileApproval(profile._id, 'reject')}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </CustomButton>
                          <CustomButton 
                            variant="outline" 
                            size="sm"
                            className="border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 dark:bg-green-950/30"
                            onClick={() => handleProfileApproval(profile._id, 'approve')}
                            disabled={loading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </CustomButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CustomCard>
          </div>
        )}
        
        {/* No Pending Profiles Message */}
        {!loading && !error && pendingProfiles.length === 0 && (
          <div className="mb-6">
            <CustomCard className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No Pending Profiles</h3>
                  <p className="text-muted-foreground">All student profiles have been reviewed. Check back later for new submissions.</p>
                </div>
              </div>
            </CustomCard>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <CustomCard>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Frequently used actions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <CustomButton 
                variant="secondary" 
                className="justify-start"
                onClick={() => navigate('/admin/students')}
              >
                <Users className="mr-2 h-4 w-4" />
                View All Students
              </CustomButton>
              
              <CustomButton 
                variant="secondary" 
                className="justify-start"
                onClick={() => navigate('/admin/attendance')}
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                View Attendance Logs
              </CustomButton>
              
              <CustomButton 
                variant="secondary" 
                className="justify-start"
                onClick={() => {
                  window.open(`${API_URL}/admin/face-data`, '_blank');
                }}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                View Face Database
              </CustomButton>
            </div>
          </CustomCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
