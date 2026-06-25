import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/App';
import { adminService } from '@/services/api';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, CheckCircle, XCircle, Clock, FileText, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define interface for student data
interface Student {
  _id: string;
  name: string;
  email: string;
  registration_number?: string;
  profile_photo?: string;
}

// Define interface for attendance data
interface AttendanceRecord {
  _id: string;
  student_id: string;
  date: string;
  time: string;
  status: 'present' | 'absent' | 'excused';
  marked_by_user?: {
    _id: string;
    name: string;
  };
  course_id?: string;
  course_name?: string;
  created_at: string;
  updated_at: string;
}

// Calendar day interface
interface CalendarDay {
  date: string;
  day: number;
  weekday: string;
  status: 'present' | 'absent' | 'excused' | 'holiday' | 'unknown' | 'not_enrolled';
}

// Attendance summary interface
interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late?: number;
  holidays?: number;
  percentage: number;
}

const StudentAttendanceDetailPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userName } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    total_days: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Month and year state for filtering
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  
  // Generate month and year options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  
  const yearOptions = [];
  const currentYear = currentDate.getFullYear();
  for (let i = currentYear - 2; i <= currentYear; i++) {
    yearOptions.push({ value: i, label: i.toString() });
  }
  
  // Fetch student data and attendance records
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        setError('Missing student ID. Please go back and try again.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch student details
        const studentResponse = await adminService.getStudent(studentId);
        setStudent(studentResponse.data.student);
        
        // Fetch monthly attendance records for this student
        const attendanceResponse = await adminService.getStudentMonthlyAttendance(
          studentId, 
          selectedMonth,
          selectedYear
        );
        
        setAttendanceRecords(attendanceResponse.data.records || []);
        setCalendarDays(attendanceResponse.data.calendar || []);
        setAttendanceSummary(attendanceResponse.data.statistics || {
          total_days: 0,
          present: 0,
          absent: 0,
          percentage: 0
        });
        
      } catch (err) {
        console.error('Error fetching student attendance data:', err);
        setError('Failed to load student attendance data. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load student attendance data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [studentId, selectedMonth, selectedYear, toast]);
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60">
            <CheckCircle className="mr-1 h-3 w-3" /> Present
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60">
            <XCircle className="mr-1 h-3 w-3" /> Absent
          </Badge>
        );

      case 'excused':
        return (
          <Badge className="bg-muted text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:bg-blue-800/40">
            <FileText className="mr-1 h-3 w-3" /> Excused
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Unknown</Badge>
        );
    }
  };
  
  // Get color class based on status
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-600 dark:text-green-400';
      case 'absent':
        return 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-600 dark:text-red-400';
      case 'holiday':
        return 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/60 text-orange-600 dark:text-orange-400';
      case 'excused':
        return 'bg-muted hover:bg-blue-200 dark:bg-blue-800/40';
      default:
        return 'bg-background hover:bg-muted text-muted-foreground';
    }
  };
  
  return (
    <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="mb-6">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/attendance-records')}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to Attendance Records
              </CustomButton>
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
                      <h3 className="font-semibold text-lg">Error Loading Data</h3>
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
            
            {!loading && student && (
              <>
                {/* Student Info */}
                <CustomCard className="mb-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="flex-shrink-0">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={student.profile_photo} />
                        <AvatarFallback className="bg-muted text-primary text-2xl">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-grow text-center md:text-left">
                      <h1 className="text-2xl font-bold">{student.name}</h1>
                      <p className="text-muted-foreground mb-2">{student.email}</p>
                      {student.registration_number && (
                        <p className="text-sm"><span className="font-medium">ID:</span> {student.registration_number}</p>
                      )}
                    </div>
                  </div>
                </CustomCard>
                
                {/* Month and Year Selection */}
                <CustomCard className="mb-6">
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Monthly Attendance</h2>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <CustomButton
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </CustomButton>
                      
                      <div className="flex gap-2">
                        <Select 
                          value={selectedMonth.toString()} 
                          onValueChange={(value) => setSelectedMonth(parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthOptions.map((month) => (
                              <SelectItem key={month.value} value={month.value.toString()}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={selectedYear.toString()} 
                          onValueChange={(value) => setSelectedYear(parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((year) => (
                              <SelectItem key={year.value} value={year.value.toString()}>
                                {year.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <CustomButton
                        variant="outline"
                        size="sm"
                        onClick={goToNextMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </CustomButton>
                    </div>
                  </div>
                </CustomCard>
                
                {/* Attendance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <CustomCard className="bg-green-50 dark:bg-green-950/30">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Present</p>
                          <h3 className="text-2xl font-bold">{attendanceSummary.present}</h3>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full">
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                  
                  <CustomCard className="bg-red-50 dark:bg-red-950/30">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Absent</p>
                          <h3 className="text-2xl font-bold">{attendanceSummary.absent}</h3>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                  
                  <CustomCard className="bg-orange-50 dark:bg-orange-950/30">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Holidays</p>
                          <h3 className="text-2xl font-bold">{attendanceSummary.holidays || 0}</h3>
                        </div>
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-full">
                          <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                  

                  
                  <CustomCard className="bg-muted">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Attendance Rate</p>
                          <h3 className="text-2xl font-bold">{attendanceSummary.percentage}%</h3>
                        </div>
                        <div className="bg-muted p-2 rounded-full">
                          <BarChart className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                </div>
                
                {/* Calendar View */}
                <CustomCard className="mb-6">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Attendance Calendar</h2>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="font-medium text-sm py-2">{day}</div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {/* Generate empty cells for days before the first of the month */}
                      {calendarDays.length > 0 && new Date(calendarDays[0].date).getDay() > 0 && (
                        Array.from({ length: new Date(calendarDays[0].date).getDay() }).map((_, index) => (
                          <div key={`empty-${index}`} className="h-12 rounded-md"></div>
                        ))
                      )}
                      
                      {calendarDays.map((day) => (
                        <div
                          key={day.date}
                          className={`h-12 flex flex-col items-center justify-center rounded-md p-2 text-center ${getStatusColorClass(day.status)}`}
                        >
                          <div className="font-medium">{day.day}</div>
                          <div className="text-xs">
                            {day.status !== 'unknown' && day.status !== 'not_enrolled' && (
                              <span className="capitalize">
                                {day.status === 'present' && <CheckCircle className="h-3 w-3 inline" />}
                                {day.status === 'absent' && <XCircle className="h-3 w-3 inline" />}
                                {day.status === 'excused' && <Clock className="h-3 w-3 inline" />}
                                {day.status === 'holiday' && <Calendar className="h-3 w-3 inline" />}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CustomCard>
                
                {/* Attendance History */}
                <CustomCard>
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Attendance Records</h2>
                  </div>
                  
                  <div className="rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Marked By</TableHead>
                          <TableHead>Course</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.length > 0 ? (
                          attendanceRecords.map((record) => (
                            <TableRow key={record._id}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>
                                {record.time || format(new Date(record.created_at), 'HH:mm:ss')}
                              </TableCell>
                              <TableCell>
                                {renderStatusBadge(record.status)}
                              </TableCell>
                              <TableCell>
                                {record.marked_by_user ? record.marked_by_user.name : 'System'}
                              </TableCell>
                              <TableCell>
                                {record.course_name || 'General'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No attendance records found for this student in {monthOptions.find(m => m.value === selectedMonth)?.label} {selectedYear}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CustomCard>
              </>
            )}
          </div>
        </DashboardLayout>
  );
};

export default StudentAttendanceDetailPage; 