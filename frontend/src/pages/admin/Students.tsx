import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import axios from 'axios';
import { getToken } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { API_URL, ENDPOINTS } from '@/config';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Plus, Upload, UserPlus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Student interface definition
interface Student {
  _id: string;
  name: string;
  email: string;
  registration_number?: string;
  course?: string;
  year_of_study?: number;
  college_name?: string;
  has_face_data: boolean;
  profile_photo?: string;
  approval_status: 'approved' | 'pending' | 'not_applied';
  phone_number?: string;
  has_profile: boolean; // Added to indicate if student has created a profile
}

const StudentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [faceDataFilter, setFaceDataFilter] = useState('all');
  const [profileStatusFilter, setProfileStatusFilter] = useState('all');
  
  // Add state for students data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch students from backend
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Get all students with their profile data merged from the backend
        const response = await axios.get(`${API_URL}/student/all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Process student data coming from backend which now includes profile data
        const mergedStudents: Student[] = response.data.map((student: any) => {
          return {
            _id: student._id,
            name: student.name,
            email: student.email,
            phone_number: student.phone_number || '',
            registration_number: student.registration_number || '',
            course: student.course || '',
            year_of_study: student.year_of_study || undefined,
            college_name: student.college_name || '',
            has_face_data: !!student.has_face_data,
            profile_photo: student.profile_photo || '',
            approval_status: student.has_profile 
              ? (student.is_approved ? 'approved' : 'pending') 
              : 'not_applied',
            has_profile: !!student.has_profile
          };
        });
        
        setStudents(mergedStudents);
        setError(null);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students data. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load students data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [navigate, toast]);
  
  // Derived state for filters
  const uniqueCourses = [...new Set(
    students
      .filter(student => student.course)
      .map(student => student.course as string)
  )];
  
  const uniqueYears = [...new Set(
    students
      .filter(student => student.year_of_study)
      .map(student => student.year_of_study as number)
  )];
  
  // Apply filters to student list
  const filteredStudents = students.filter(student => {
    // Search filter
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Course filter
    const matchesCourse = 
      courseFilter === 'all' || 
      (student.course === courseFilter);
    
    // Year filter
    const matchesYear = 
      yearFilter === 'all' || 
      (student.year_of_study && student.year_of_study.toString() === yearFilter);
    
    // Face data filter
    const matchesFaceData = 
      faceDataFilter === 'all' || 
      (faceDataFilter === 'yes' && student.has_face_data) || 
      (faceDataFilter === 'no' && !student.has_face_data);
    
    // Profile status filter
    const matchesProfileStatus = 
      profileStatusFilter === 'all' || 
      (profileStatusFilter === 'completed' && student.has_profile) ||
      (profileStatusFilter === 'incomplete' && !student.has_profile) ||
      (profileStatusFilter === 'approved' && student.approval_status === 'approved') ||
      (profileStatusFilter === 'pending' && student.approval_status === 'pending') ||
      (profileStatusFilter === 'not_applied' && student.approval_status === 'not_applied');
    
    return matchesSearch && matchesCourse && matchesYear && matchesFaceData && matchesProfileStatus;
  });
  
  // Helper function to safely convert student ID to string
  const safeGetStudentId = (studentObj: any): string => {
    let studentId: string = '';
    
    try {
      // Case 1: If it's already a string
      if (typeof studentObj._id === 'string') {
        studentId = studentObj._id;
      }
      // Case 2: MongoDB ObjectId in $oid format: {$oid: 'actualId'}
      else if (typeof studentObj._id === 'object' && studentObj._id !== null && '$oid' in studentObj._id) {
        console.log("Found MongoDB $oid format:", studentObj._id);
        studentId = studentObj._id.$oid;
      }
      // Case 3: Regular object that can be converted to string
      else {
        studentId = String(studentObj._id);
        
        // If conversion resulted in [object Object], it failed
        if (studentId === '[object Object]') {
          console.error("Failed to convert object to string:", studentObj._id);
          
          // Try to extract ID from the object in other ways
          if (studentObj._id && typeof studentObj._id.toString === 'function') {
            const objString = studentObj._id.toString();
            if (objString !== '[object Object]') {
              studentId = objString;
            }
          }
        }
      }
      
      console.log("Original ID:", studentObj._id, "Converted ID:", studentId);
    } catch (error) {
      console.error("Error converting student ID:", error);
      studentId = '';
    }
    
    // Final validation check
    if (!studentId || studentId === '[object Object]') {
      console.error("Failed to extract valid ID:", studentObj._id);
      return '';
    }
    
    return studentId;
  };

  // Handle student edit
  const handleEditStudent = (student: Student) => {
    // Navigate to edit page with student ID
    const studentId = safeGetStudentId(student);
    
    if (!studentId) {
      toast({
        title: "Error",
        description: "Could not edit student due to invalid ID",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/admin/students/${studentId}/edit`);
  };

  // Handle student deletion
  const handleDeleteStudent = (student: Student) => {
    const studentId = safeGetStudentId(student);
    
    if (!studentId) {
      toast({
        title: "Error",
        description: "Could not delete student due to invalid ID",
        variant: "destructive"
      });
      return;
    }
    
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone and will remove all student data including attendance records.`)) {
      // Delete the student
      const token = getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      setLoading(true);
      
      axios.delete(`${API_URL}/api/admin/delete-student/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        toast({
          title: "Success",
          description: response.data.message || "Student deleted successfully",
          variant: "default"
        });
        
        // Remove the deleted student from the state
        setStudents(prevStudents => prevStudents.filter(s => safeGetStudentId(s) !== studentId));
      })
      .catch(error => {
        console.error('Error deleting student:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to delete student",
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
    }
  };

  // Handle adding a new student
  const handleAddStudent = () => {
    navigate('/admin/students/new');
  };

  // Function to extract initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Function to render status badge
  const renderStatusBadge = (student: Student) => {
    if (!student.has_profile) {
      return (
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:bg-slate-900/40">
          <AlertCircle className="mr-1 h-3 w-3" /> Not Applied
        </Badge>
      );
    } else if (student.approval_status === 'approved') {
      return (
        <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60">
          <CheckCircle className="mr-1 h-3 w-3" /> Approved
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 dark:bg-amber-900/40">
          <XCircle className="mr-1 h-3 w-3" /> Pending
        </Badge>
      );
    }
  };

  return (

        <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header">
              <div>
                <h1 className="page-title">Students</h1>
                <p className="page-subtitle">Manage and view all students in the system</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                
                
                <CustomButton
                  variant="primary"
                  size="sm"
                  onClick={handleAddStudent}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Add Student
                </CustomButton>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-6">
                <CustomCard className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Error Loading Students</h3>
                      <p className="text-muted-foreground">{error}</p>
                      <CustomButton 
                        variant="outline" 
                        className="mt-2" 
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        Try Again
                      </CustomButton>
                    </div>
                  </div>
                </CustomCard>
              </div>
            )}
            
            {/* Loading State */}
            {loading && !error && (
              <div className="mb-6">
                <CustomCard>
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-muted mb-3"></div>
                      <div className="h-4 w-48 bg-muted rounded mb-3"></div>
                      <div className="h-3 w-36 bg-muted rounded"></div>
                    </div>
                  </div>
                </CustomCard>
              </div>
            )}
            
            <CustomCard className="mb-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID or email..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {uniqueCourses.map((course) => (
                        <SelectItem key={String(course)} value={String(course)}>{course}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {uniqueYears.map((year) => (
                        <SelectItem key={String(year)} value={String(year)}>Year {year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={faceDataFilter} onValueChange={setFaceDataFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Face Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="yes">Has Face Data</SelectItem>
                      <SelectItem value="no">No Face Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4">
                <Select value={profileStatusFilter} onValueChange={setProfileStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Profile Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profile Status</SelectItem>
                    <SelectItem value="completed">Profile Completed</SelectItem>
                    <SelectItem value="incomplete">Profile Incomplete</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="not_applied">Not Applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CustomCard>
            
            <CustomCard>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Face Data</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        // Generate a unique, stable key for each row
                        const rowKey = safeGetStudentId(student) || `student-${student.email.replace(/[^a-z0-9]/gi, '')}`;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={student.profile_photo} />
                                  <AvatarFallback className="bg-muted text-primary">
                                    {getInitials(student.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{student.name}</div>
                                  <div className="text-sm text-muted-foreground">{student.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{student.registration_number || 'Not Set'}</TableCell>
                            <TableCell>{student.course || 'Not Set'}</TableCell>
                            <TableCell>{student.year_of_study ? `Year ${student.year_of_study}` : 'Not Set'}</TableCell>
                            <TableCell>
                              {renderStatusBadge(student)}
                            </TableCell>
                            <TableCell>
                              {student.has_face_data ? (
                                <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60">
                                  <CheckCircle className="mr-1 h-3 w-3" /> Uploaded
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 dark:bg-amber-900/40">
                                  <XCircle className="mr-1 h-3 w-3" /> Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded-md hover:bg-accent">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {student.has_profile ? (
                                    <>
                                      <DropdownMenuItem onClick={() => {
                                        const studentId = safeGetStudentId(student);
                                        if (!studentId) {
                                          toast({
                                            title: "Error",
                                            description: "Could not view student profile due to invalid ID",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        console.log("Navigating to student profile:", studentId);
                                        navigate(`/admin/students/${studentId}`);
                                      }}>View Profile</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        const studentId = safeGetStudentId(student);
                                        if (!studentId) {
                                          toast({
                                            title: "Error",
                                            description: "Could not view attendance due to invalid ID",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        navigate(`/admin/students/${studentId}/attendance`);
                                      }}>View Attendance</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleEditStudent(student)}>Edit Student</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteStudent(student)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 dark:bg-red-950/30">
                                        Delete Student
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <>
                                      <DropdownMenuItem onClick={() => {
                                        const studentId = safeGetStudentId(student);
                                        if (!studentId) {
                                          toast({
                                            title: "Error",
                                            description: "Could not create profile due to invalid ID",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        navigate(`/admin/students/${studentId}/create-profile`);
                                      }}>Create Profile</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleEditStudent(student)}>Edit Basic Info</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteStudent(student)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 dark:bg-red-950/30">
                                        Delete Student
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {!student.has_face_data && (
                                    <>
                                      {/* Upload face data option removed as requested */}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No students found matching the filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CustomCard>
          </div>
        </DashboardLayout>
  );
};

export default StudentsPage;
