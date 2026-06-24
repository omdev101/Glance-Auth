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
import { Calendar, ChevronDown, Download, Filter, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, BarChart4 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { studentService } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/App';

interface AttendanceRecord {
  _id: string;
  date: string;
  time?: string;
  status: 'present' | 'absent';
  created_at: string;
  updated_at: string;
}

interface CalendarDay {
  date: string;
  day: number;
  weekday: string;
  status: 'present' | 'absent' | 'excused' | 'unknown';
}

interface AttendanceStatistics {
  total: number;
  total_days: number;
  present: number;
  absent: number;
  late?: number;
  holidays?: number;
  percentage: number;
}

const StudentAttendance = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { userName } = useAuth();
  
  // Attendance data
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [statistics, setStatistics] = useState<AttendanceStatistics>({
    total: 0,
    total_days: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });
  
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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
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
  
  // Fetch attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      setIsLoading(true);
      try {
        // Fetch monthly attendance data
        const response = await studentService.getMonthlyAttendance(selectedMonth, selectedYear);
        
        if (response.data) {
          setAttendanceRecords(response.data.records || []);
          setFilteredRecords(response.data.records || []);
          setCalendarDays(response.data.calendar || []);
          setStatistics({
            total: response.data.statistics?.total_days || 0,
            total_days: response.data.statistics?.total_days || 0,
            present: response.data.statistics?.present || 0,
            absent: response.data.statistics?.absent || 0,
            percentage: response.data.statistics?.percentage || 0
          });
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendance records',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [toast, selectedMonth, selectedYear]);
  
  // Apply filters
  useEffect(() => {
    let filtered = [...attendanceRecords];
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.date.toLowerCase().includes(query) ||
        (record.time && record.time.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    
    setFilteredRecords(filtered);
  }, [attendanceRecords, searchQuery, statusFilter]);
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
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
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
  
  // Export attendance as CSV
  const exportAttendance = () => {
    const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;
    // Create CSV content
    const headers = ['Date', 'Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => 
        [escapeCsv(record.date), escapeCsv(record.time), escapeCsv(record.status)].join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <DashboardLayout userType="student">
          <div className="page-container">
            <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="page-title">Attendance Records</h1>
                <p className="page-subtitle">View and track your attendance history</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex space-x-2">
                <CustomButton
                  onClick={exportAttendance}
                  variant="outline"
                  rightIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </CustomButton>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
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
                
                {/* Attendance Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <CustomCard className="bg-green-50 dark:bg-green-950/30">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Present</p>
                          <h3 className="text-2xl font-bold">{statistics.present}</h3>
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
                          <h3 className="text-2xl font-bold">{statistics.absent}</h3>
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
                          <h3 className="text-2xl font-bold">{statistics.holidays || 0}</h3>
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
                          <h3 className="text-2xl font-bold">{statistics.percentage}%</h3>
                        </div>
                        <div className="bg-muted p-2 rounded-full">
                          <BarChart4 className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </div>
                  </CustomCard>
                </div>
                
                {/* Attendance Percentage */}
                <CustomCard className="p-6 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-lg font-semibold">Attendance Percentage</h3>
                    <p className="text-2xl font-bold">{statistics.percentage}%</p>
                  </div>
                  <Progress value={statistics.percentage} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {statistics.percentage >= 75 ? (
                      <span className="text-green-600 dark:text-green-400">Good standing! Keep it up.</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Your attendance is below the required 75%. Please improve your attendance.</span>
                    )}
                  </p>
                </CustomCard>
                
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
                
                {/* Filters */}
                <CustomCard className="p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Filter Records</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="search">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by date..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Status</Label>
                      <div className="relative">
                        <select
                          className="w-full h-10 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                          value={statusFilter || ''}
                          onChange={(e) => setStatusFilter(e.target.value || null)}
                        >
                          <option value="">All</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <CustomButton
                      onClick={resetFilters}
                      variant="outline"
                      size="sm"
                    >
                      Reset Filters
                    </CustomButton>
                  </div>
                </CustomCard>
                
                {/* Attendance Records Table */}
                <CustomCard>
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Attendance Records</h2>
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
                        {filteredRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                              No attendance records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRecords.map((record) => (
                            <TableRow key={record._id}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>{record.time || 'N/A'}</TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                            </TableRow>
                          ))
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

export default StudentAttendance; 