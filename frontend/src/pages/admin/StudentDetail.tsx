import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import { ENDPOINTS } from '@/config';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  BookOpen,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface StudentData {
  user: {
    _id: string;
    name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_verified: boolean;
  };
  has_profile: boolean;
  profile?: {
    _id: string;
    user_id: string;
    college_name: string;
    course: string;
    year_of_study: string;
    registration_number: string;
    profile_photo: string;
    face_images?: {
      front?: string;
    };
    is_approved: boolean;
    created_at: string;
    updated_at: string;
  };
  has_face_data: boolean;
  recent_attendance?: Array<{
    _id: string;
    student_id: string;
    date: string;
    time?: string;
    status: 'present' | 'absent';
    marked_by: string;
    marked_method?: string;
    created_at: string;
  }>;
}

const StudentDetail = () => {
  const params = useParams<{ id: string }>();
  
  // Extract and validate ID
  const rawId = params.id;
  console.log("Raw ID from params:", rawId);
  
  // Ensure ID is properly extracted and sanitized
  const id = rawId ? String(rawId).trim() : '';
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Ensure ID is valid before making API call
        if (!id || id === 'undefined' || id === 'null') {
          console.error('Missing or invalid student ID:', id);
          setError('Invalid student ID provided. Please go back and try again.');
          setLoading(false);
          return;
        }
        
        // Check if ID matches MongoDB ObjectId pattern
        if (!/^[0-9a-f]{24}$/i.test(id)) {
          console.error('Student ID does not match MongoDB ObjectId format:', id);
          setError('Invalid student ID format. Please go back and try again.');
          setLoading(false);
          return;
        }
        
        console.log('Fetching student with validated ID:', id);
        
        const response = await axios.get(ENDPOINTS.STUDENT_DETAILS(id), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.data) {
          throw new Error('No data returned from server');
        }
        
        setStudentData(response.data);
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError('Failed to load student details.');
        toast({
          title: 'Error',
          description: 'Failed to load student details',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchStudentData();
    } else {
      setError('No student ID provided. Please go back and try again.');
      setLoading(false);
    }
  }, [id, navigate, toast]);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };
  
  const renderStatusBadge = () => {
    if (!studentData?.has_profile) {
      return (
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800/50">
          <AlertCircle className="mr-1 h-3 w-3" /> Not Applied
        </Badge>
      );
    } else if (studentData.profile?.is_approved) {
      return (
        <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
          <CheckCircle className="mr-1 h-3 w-3" /> Approved
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50">
          <XCircle className="mr-1 h-3 w-3" /> Pending
        </Badge>
      );
    }
  };

  return (

        <DashboardLayout userType="admin">
          <div className="flex items-center mb-6">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/students')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </CustomButton>
            
            <h1 className="text-2xl font-semibold">Student Profile</h1>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <CustomCard className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Error</h3>
                  <p>{error}</p>
                  <CustomButton
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </CustomButton>
                </div>
              </div>
            </CustomCard>
          ) : studentData ? (
            <>
              {/* Student Header */}
              <CustomCard className="mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-2 border-muted">
                        <AvatarImage src={studentData.profile?.profile_photo} />
                        <AvatarFallback className="bg-muted text-primary text-xl">
                          {getInitials(studentData.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {renderStatusBadge()}
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <h2 className="text-2xl font-bold">{studentData.user.name}</h2>
                      <div className="flex items-center space-x-2">
                        {studentData.has_face_data ? (
                          <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                            <CheckCircle className="mr-1 h-3 w-3" /> Face Data Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50">
                            <XCircle className="mr-1 h-3 w-3" /> Face Data Incomplete
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {studentData.has_profile ? (
                      <div>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>{studentData.profile?.course || 'N/A'}</span>
                          {studentData.profile?.year_of_study && (
                            <span>• Year {studentData.profile.year_of_study}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>{studentData.profile?.college_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-muted-foreground mt-1">
                          <User className="h-4 w-4" />
                          <span>ID: {studentData.profile?.registration_number || 'N/A'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-amber-600 dark:text-amber-400 mt-1">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Student has not completed their profile
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mt-4">
                      {studentData.user.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${studentData.user.email}`} className="text-sm underline">{studentData.user.email}</a>
                        </div>
                      )}
                      
                      {studentData.user.phone_number && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{studentData.user.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 flex flex-col space-y-2">
                    <CustomButton
                      onClick={() => navigate(`/admin/students/${id}/attendance`)}
                      size="sm"
                      variant="outline"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View Attendance
                    </CustomButton>
                    
                    <CustomButton
                      onClick={() => navigate(`/admin/students/${id}/edit`)}
                      size="sm"
                    >
                      Edit Profile
                    </CustomButton>
                  </div>
                </div>
              </CustomCard>
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="face-data">Face Data</TabsTrigger>
                  <TabsTrigger value="attendance">Recent Attendance</TabsTrigger>
                </TabsList>
                
                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <CustomCard className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                      <dl className="divide-y divide-gray-100">
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium">Full name</dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.user.name}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium">Email address</dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.user.email}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium">Phone number</dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.user.phone_number || 'Not provided'}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium">Account status</dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                            {studentData.user.is_verified ? (
                              <span className="text-green-600 dark:text-green-400 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" /> Verified
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center">
                                <XCircle className="h-4 w-4 mr-1" /> Not Verified
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </CustomCard>
                    
                    {/* Academic Information */}
                    {studentData.has_profile ? (
                      <CustomCard className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Academic Information</h3>
                        <dl className="divide-y divide-gray-100">
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">College/Institution</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.profile?.college_name}</dd>
                          </div>
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">Course</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.profile?.course}</dd>
                          </div>
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">Year of Study</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.profile?.year_of_study}</dd>
                          </div>
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">Registration Number</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.profile?.registration_number}</dd>
                          </div>
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">Profile Status</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                              {studentData.profile?.is_approved ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approved
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center">
                                  <XCircle className="h-4 w-4 mr-1" /> Pending Approval
                                </span>
                              )}
                            </dd>
                          </div>
                          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium">Profile Created</dt>
                            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{studentData.profile?.created_at}</dd>
                          </div>
                        </dl>
                      </CustomCard>
                    ) : (
                      <CustomCard className="p-6">
                        <div className="flex flex-col items-center justify-center h-full py-6">
                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-full p-4">
                            <AlertCircle className="h-10 w-10 text-amber-500" />
                          </div>
                          <h3 className="text-lg font-medium mt-4">No Profile Created</h3>
                          <p className="text-center text-muted-foreground mt-2">
                            This student hasn't completed their profile information yet.
                          </p>
                          <CustomButton
                            className="mt-4"
                            size="sm"
                            onClick={() => navigate(`/admin/students/${id}/create-profile`)}
                          >
                            Create Profile
                          </CustomButton>
                        </div>
                      </CustomCard>
                    )}
                  </div>
                </TabsContent>
                
                {/* Face Data Tab */}
                <TabsContent value="face-data">
                  <CustomCard className="p-6">
                    <h3 className="text-lg font-semibold mb-6">Face Recognition Data</h3>
                    
                    {!studentData.has_profile ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-full p-4">
                          <AlertCircle className="h-10 w-10 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-medium mt-4">No Profile Created</h3>
                        <p className="text-center text-muted-foreground mt-2">
                          This student hasn't completed their profile information yet.
                        </p>
                      </div>
                    ) : !studentData.has_face_data ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-full p-4">
                          <Camera className="h-10 w-10 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-medium mt-4">Face Data Incomplete</h3>
                        <p className="text-center text-muted-foreground mt-2">
                          This student hasn't uploaded their face image or the image is invalid.
                        </p>
                        <CustomButton
                          className="mt-4"
                          size="sm"
                          onClick={() => navigate(`/admin/students/${id}/upload-face`)}
                        >
                          Upload Face Data
                        </CustomButton>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        {/* Front Face */}
                        <div className="border rounded-md overflow-hidden max-w-md w-full">
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border-b">
                            <h4 className="font-medium">Front Face</h4>
                          </div>
                          <div className="aspect-square">
                            {studentData.profile?.face_images?.front ? (
                              <img
                                src={studentData.profile.face_images.front}
                                alt="Front Face"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center">
                                <span className="text-slate-400">Not available</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CustomCard>
                </TabsContent>
                
                {/* Attendance Tab */}
                <TabsContent value="attendance">
                  <CustomCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
                    
                    {studentData.recent_attendance && studentData.recent_attendance.length > 0 ? (
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-slate-50 dark:bg-slate-950/30">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Time
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Method
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-gray-200">
                            {studentData.recent_attendance.map((record) => (
                              <tr key={record._id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {record.date}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {record.time || "N/A"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {record.status === 'present' && (
                                    <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Present
                                    </Badge>
                                  )}
                                  {record.status === 'absent' && (
                                    <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50">
                                      <XCircle className="h-3 w-3 mr-1" /> Absent
                                    </Badge>
                                  )}

                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {record.marked_method === 'face_recognition' ? 'Face Recognition' : 'Manual'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-slate-100 dark:bg-slate-900/40 rounded-full p-4">
                          <Calendar className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium mt-4">No Attendance Records</h3>
                        <p className="text-center text-muted-foreground mt-2">
                          This student doesn't have any attendance records yet.
                        </p>
                        <CustomButton
                          className="mt-4"
                          size="sm"
                          onClick={() => navigate(`/admin/attendance`)}
                        >
                          Go to Attendance
                        </CustomButton>
                      </div>
                    )}
                  </CustomCard>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <CustomCard className="p-6">
              <div className="flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-500 mr-3" />
                <h3 className="text-xl">Student not found</h3>
              </div>
            </CustomCard>
          )}
        </DashboardLayout>
  );
};

export default StudentDetail; 