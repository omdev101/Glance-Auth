import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/App';
import { adminService } from '@/services/api';
import { API_URL } from '@/config';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
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
import { Search, Download, FileText, Calendar as CalendarIcon, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

// Define interface for attendance data
interface AttendanceRecord {
  _id: string;
  student_id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    profile_photo?: string;
  };
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

const AttendanceRecordsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userName } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Fetch attendance records
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build filter object
        const filters: {
          date?: string;
          student_id?: string;
          course_id?: string;
        } = {};
        
        if (dateFilter) {
          filters.date = format(dateFilter, 'yyyy-MM-dd');
        }
        
        const response = await adminService.getAttendanceLogs(filters);
        
        setAttendanceRecords(response.data.records || []);
      } catch (err) {
        console.error('Error fetching attendance records:', err);
        setError('Failed to load attendance records. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load attendance records',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceRecords();
  }, [dateFilter, toast]);
  
  // Filter attendance records
  const filteredRecords = attendanceRecords.filter(record => {
    // Search filter
    const matchesSearch = record.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Export to CSV
  const exportToCSV = () => {
    try {
      const escapeCsv = (str: any) => `"${String(str !== undefined && str !== null ? str : '').replace(/"/g, '""')}"`;
      // Define the headers
      const headers = ['Name', 'Email', 'Course', 'Date', 'Time', 'Status', 'Marked By'];
      
      // Convert records to CSV rows
      const rows = filteredRecords.map(record => [
        escapeCsv(record.student?.name || 'Unknown'),
        escapeCsv(record.student?.email || 'N/A'),
        escapeCsv(record.course_name || 'N/A'),
        escapeCsv(record.date || (record.created_at ? format(new Date(record.created_at), 'yyyy-MM-dd') : 'N/A')),
        escapeCsv(record.time || (record.created_at ? format(new Date(record.created_at), 'HH:mm:ss') : 'N/A')),
        escapeCsv((record.status || 'unknown')),
        escapeCsv(record.marked_by_user?.name || 'System')
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-records-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast({
        title: 'Export Failed',
        description: 'Failed to export attendance records to CSV',
        variant: 'destructive'
      });
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
  
  return (
    <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
              <div>
                <h1 className="page-title">Attendance Records</h1>
                <p className="page-subtitle">View and manage student attendance records</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export CSV
                </CustomButton>
                
                <CustomButton
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/admin/live-attendance')}
                  leftIcon={<CalendarIcon className="h-4 w-4" />}
                >
                  Mark Attendance
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
                      <h3 className="font-semibold text-lg">Error Loading Attendance Records</h3>
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
            
            {/* Filters */}
            <CustomCard className="mb-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name or email..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <DatePicker
                    placeholder="Filter by date"
                    date={dateFilter}
                    onDateChange={setDateFilter}
                  />
                </div>
                
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CustomCard>
            
            {/* Attendance Records Table */}
            <CustomCard>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={record.student.profile_photo} />
                                <AvatarFallback className="bg-muted text-primary">
                                  {getInitials(record.student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{record.student.name}</div>
                                <div className="text-sm text-muted-foreground">{record.student.email}</div>
                              </div>
                            </div>
                          </TableCell>
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
                          <TableCell className="text-right">
                            <CustomButton
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/students/${record.student._id}/attendance`)}
                            >
                              View Details
                            </CustomButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Loading records...' : 'No attendance records found'}
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

export default AttendanceRecordsPage; 