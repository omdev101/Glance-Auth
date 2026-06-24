import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  LineChart,
  ListFilter,
  Users
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { adminService } from '@/services/api';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolidaysManager } from '@/components/admin/HolidaysManager';

// Shared chart theme styles
const CHART_THEME = {
  cartesianGrid: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))', vertical: false },
  tooltip: { 
    contentStyle: { 
      backgroundColor: 'hsl(var(--card))', 
      borderColor: 'hsl(var(--border))', 
      color: 'hsl(var(--foreground))',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)'
    },
    itemStyle: { color: 'hsl(var(--foreground))' },
    labelStyle: { color: 'hsl(var(--muted-foreground))', fontWeight: 600 }
  },
  axis: { stroke: 'hsl(var(--muted-foreground))', fontSize: 12 },
  legend: { wrapperStyle: { color: 'hsl(var(--foreground))', fontSize: '12px' } }
};

// Status colors (removed Late)
const STATUS_COLORS_CLEAN = {
  present: '#22c55e',
  absent: '#ef4444',
  holiday: '#94a3b8',
  total: '#6366f1',
};

// CHART COMPONENTS
const AttendancePieChart = ({ data }: { data: any }) => {
  const presentVal = (data.present_count || 0) + (data.late_count || 0);
  const absentVal = data.absent_count || 0;
  const chartData = [
    { name: 'Present', value: presentVal, color: STATUS_COLORS_CLEAN.present },
    { name: 'Absent', value: absentVal, color: STATUS_COLORS_CLEAN.absent },
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No attendance data for this period</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={4}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: 'var(--muted-foreground)' }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value}`, 'Students']}
          contentStyle={CHART_THEME.tooltip.contentStyle}
          itemStyle={CHART_THEME.tooltip.itemStyle}
        />
        <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

const DailyAttendanceChart = ({ dailyData }: { dailyData: any[] }) => {
  const filteredData = dailyData
    .filter(day => day.total > 0)
    .map(day => ({ ...day, present: (day.present || 0) }));
  
  if (filteredData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No attendance records this month</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid {...CHART_THEME.cartesianGrid} />
        <XAxis dataKey="day" {...CHART_THEME.axis} />
        <YAxis {...CHART_THEME.axis} allowDecimals={false} />
        <Tooltip {...CHART_THEME.tooltip} />
        <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
        <Bar dataKey="present" fill={STATUS_COLORS_CLEAN.present} name="Present" radius={[3, 3, 0, 0]} />
        <Bar dataKey="absent" fill={STATUS_COLORS_CLEAN.absent} name="Absent" radius={[3, 3, 0, 0]} />
        <Bar dataKey="holiday" fill={STATUS_COLORS_CLEAN.holiday} name="Holiday" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const WeeklyAttendanceChart = ({ weeklyData }: { weeklyData: any[] }) => {
  const themedData = weeklyData.map(w => ({ ...w, present: (w.present || 0) }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={themedData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid {...CHART_THEME.cartesianGrid} />
        <XAxis dataKey="week" {...CHART_THEME.axis} />
        <YAxis {...CHART_THEME.axis} allowDecimals={false} />
        <Tooltip {...CHART_THEME.tooltip} />
        <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
        <Bar dataKey="present" fill={STATUS_COLORS_CLEAN.present} name="Present" radius={[3, 3, 0, 0]} />
        <Bar dataKey="absent" fill={STATUS_COLORS_CLEAN.absent} name="Absent" radius={[3, 3, 0, 0]} />
        <Bar dataKey="holiday" fill={STATUS_COLORS_CLEAN.holiday} name="Holiday" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CourseAttendanceChart = ({ courseData }: { courseData: any[] }) => {
  const sortedData = [...courseData].sort((a, b) => b.attendance_rate - a.attendance_rate);
  
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, sortedData.length * 52)}>
      <BarChart 
        data={sortedData} 
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} {...CHART_THEME.axis} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="course" width={90} {...CHART_THEME.axis} />
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Attendance Rate']}
          contentStyle={CHART_THEME.tooltip.contentStyle}
          itemStyle={CHART_THEME.tooltip.itemStyle}
        />
        <Bar dataKey="attendance_rate" fill={STATUS_COLORS_CLEAN.total} name="Attendance Rate" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// MAIN COMPONENT
const AttendanceReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Report data state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  
  // Month and year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Table data and filters
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to?: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  // Fetch report data
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await adminService.getMonthlyAttendanceSummary(selectedMonth, selectedYear);
        setReportData(response.data);
        
        // Also get recent attendance records for the table
        const recordsResponse = await adminService.getAttendanceLogs();
        if (recordsResponse.data && recordsResponse.data.records) {
          setAttendanceRecords(recordsResponse.data.records);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching report data:', error);
        setError('Failed to load attendance report data. Please try again later.');
        setIsLoading(false);
        
        toast({
          title: 'Error',
          description: 'Failed to load attendance report data.',
          variant: 'destructive',
        });
      }
    };
    
    fetchReportData();
  }, [selectedMonth, selectedYear, refreshTrigger]);
  
  // Get available courses for filter
  const uniqueCourses = reportData?.course_attendance 
    ? [...new Set(reportData.course_attendance.map((item: any) => item.course))]
    : [];
  
  // Filter attendance records
  const filteredAttendance = attendanceRecords.filter(record => {
    // Search filter
    const matchesSearch = 
      (record.student?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.student?._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.student?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Course filter (if we have course data)
    let matchesCourse = true;
    if (courseFilter !== 'all' && record.course) {
      matchesCourse = record.course === courseFilter;
    }
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    // Date range filter
    let matchesDate = true;
    if (dateRange.from) {
      const recordDate = new Date(record.date);
      matchesDate = recordDate >= dateRange.from;
      
      if (dateRange.to) {
        matchesDate = matchesDate && recordDate <= dateRange.to;
      }
    }
    
    return matchesSearch && matchesCourse && matchesStatus && matchesDate;
  });
  
  // Get status badge variant
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
  
  // Month navigation
  const changeMonth = (increment: number) => {
    let newMonth = selectedMonth + increment;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Export data functions
  const exportToCsv = () => {
    if (!reportData || !reportData.daily_trend) {
      toast({
        title: "No Data to Export",
        description: "There is no report data to export.",
        variant: "destructive",
      });
      return;
    }
    
    const escapeCsv = (str: any) => `"${String(str !== undefined && str !== null ? str : '').replace(/"/g, '""')}"`;
    
    // Create CSV header
    const headers = ['Date', 'Total', 'Present', 'Absent'];
    
    // Create CSV content (late is merged into present)
    const csvContent = [
      headers.join(','),
      ...reportData.daily_trend.map((day: any) => 
        [
          escapeCsv(day.date),
          escapeCsv(day.total),
          escapeCsv((day.present || 0)),
          escapeCsv(day.absent)
        ].join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${selectedYear}_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "The attendance report has been exported as CSV.",
    });
  };

  const exportToPdf = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality would be implemented with a library like jsPDF.",
      variant: "default",
    });
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setCourseFilter('all');
    setStatusFilter('all');
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
              <div>
                <h1 className="page-title">Attendance Reports</h1>
                <p className="page-subtitle">Analyze and export attendance data</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <CustomButton 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeMonth(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </CustomButton>
                  
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={value => setSelectedMonth(parseInt(value))}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedYear.toString()} onValueChange={value => setSelectedYear(parseInt(value))}>
                      <SelectTrigger className="w-[90px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <CustomButton 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeMonth(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </CustomButton>
                </div>

                <div className="w-px h-6 bg-border" />

                <CustomButton 
                  variant="outline"
                  onClick={exportToCsv}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </CustomButton>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2">Loading attendance report data...</p>
                </div>
              </div>
            ) : error ? (
              <CustomCard className="p-8 text-center">
                <div className="text-red-500 mb-2">Error Loading Data</div>
                <p>{error}</p>
                <CustomButton 
                  className="mt-4" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </CustomButton>
              </CustomCard>
            ) : reportData ? (
              <>
                {/* Overview Stats */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Registered Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        {reportData.overall_statistics.registered_students}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reportData.overall_statistics.students_with_attendance} students attended
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Present
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {reportData.overall_statistics.present_count}
                        <span className="text-sm text-muted-foreground font-normal ml-2">
                          ({Math.round(((reportData.overall_statistics.present_count) / reportData.overall_statistics.total_attendance_records) * 100) || 0}%)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Overall Attendance
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Absent
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {reportData.overall_statistics.absent_count}
                        <span className="text-sm text-muted-foreground font-normal ml-2">
                          ({Math.round((reportData.overall_statistics.absent_count / reportData.overall_statistics.total_attendance_records) * 100) || 0}%)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Overall Absences
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Charts */}
                <Tabs defaultValue="daily" className="mb-6">
                  <TabsList className="mb-4">
                    <TabsTrigger value="daily">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Daily Trends
                    </TabsTrigger>
                    <TabsTrigger value="weekly">
                      <LineChart className="h-4 w-4 mr-2" />
                      Weekly Summary
                    </TabsTrigger>
                    <TabsTrigger value="courses">
                      <PieChart className="h-4 w-4 mr-2" />
                      By Course
                    </TabsTrigger>
                    <TabsTrigger value="overview">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="holidays">
                      <Calendar className="h-4 w-4 mr-2" />
                      Holidays & Off Days
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="daily" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily Attendance Trends</CardTitle>
                        <CardDescription>
                          Attendance breakdown by day for {reportData.month_name} {reportData.year}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DailyAttendanceChart dailyData={reportData.daily_trend} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="holidays" className="space-y-4">
                    <HolidaysManager onSettingsChanged={() => setRefreshTrigger(prev => prev + 1)} />
                  </TabsContent>
                  
                  <TabsContent value="weekly" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Weekly Attendance Summary</CardTitle>
                        <CardDescription>
                          Attendance aggregated by week for {reportData.month_name} {reportData.year}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <WeeklyAttendanceChart weeklyData={reportData.weekly_trend} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="courses" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attendance by Course</CardTitle>
                        <CardDescription>
                          Course-wise attendance rates for {reportData.month_name} {reportData.year}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CourseAttendanceChart courseData={reportData.course_attendance} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attendance Overview</CardTitle>
                        <CardDescription>
                          Overall attendance distribution for {reportData.month_name} {reportData.year}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center">
                        <AttendancePieChart data={reportData.overall_statistics} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                {/* Attendance Records Table */}
                <CustomCard className="mb-6">
                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or ID..."
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
                          {uniqueCourses.map((course: string) => (
                            <SelectItem key={course} value={course}>{course}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <CustomButton 
                            variant="outline" 
                            className="w-full justify-start"
                            leftIcon={<Calendar className="h-4 w-4" />}
                          >
                            {dateRange.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                                </>
                              ) : (
                                format(dateRange.from, "MMM d, yyyy")
                              )
                            ) : (
                              "Pick a date range"
                            )}
                          </CustomButton>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                          />
                          <div className="p-3 border-t border-border">
                            <CustomButton 
                              variant="secondary" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setDateRange({ from: undefined, to: undefined })}
                            >
                              Clear Date Range
                            </CustomButton>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Reset Filters
                    </CustomButton>
                  </div>
                </CustomCard>
            
                <CustomCard>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendance.length > 0 ? (
                          filteredAttendance.map((record) => (
                            <TableRow key={record._id}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell className="font-medium">{record.student?.name || 'Unknown'}</TableCell>
                              <TableCell>{record.student?._id || 'Unknown'}</TableCell>
                              <TableCell>{record.time || 'N/A'}</TableCell>
                              <TableCell>
                                {getStatusBadge(record.status || 'unknown')}
                              </TableCell>
                              <TableCell className="text-right">
                                <CustomButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/students/${record.student?._id}/attendance`)}
                                >
                                  View Details
                                </CustomButton>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No attendance records found matching the filters
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredAttendance.length} of {attendanceRecords.length} records
                    </div>
                  </div>
                </CustomCard>
              </>
            ) : (
              <CustomCard className="p-8 text-center">
                <p>No report data available for the selected month.</p>
              </CustomCard>
            )}
          </div>
        </DashboardLayout>
  );
};

export default AttendanceReports;
