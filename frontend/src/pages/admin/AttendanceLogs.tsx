import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import { attendanceRecords } from '@/lib/dummyData';
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
import { Calendar as CalendarIcon, Search, Download, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const AttendanceLogsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Get unique course list from attendance records
  const uniqueCourses = [...new Set(attendanceRecords.map(record => record.course))];
  
  // Apply filters to attendance records
  const filteredRecords = attendanceRecords.filter(record => {
    // Search filter
    const matchesSearch = 
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Course filter
    const matchesCourse = courseFilter === 'all' || record.course === courseFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    // Date filter
    const matchesDate = !date || record.date === format(date, 'yyyy-MM-dd');
    
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

  return (
    <DashboardLayout userType="admin">
      <div className="page-container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
          <div>
            <h1 className="page-title">Attendance Logs</h1>
            <p className="page-subtitle">View all attendance records in the system</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
        
        <CustomCard className="mb-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or ID..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {uniqueCourses.map((course) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchQuery || courseFilter !== 'all' || statusFilter !== 'all' || date) && (
              <div className="md:col-span-4 flex items-center justify-between mt-2">
                <div className="text-sm text-muted-foreground">
                  {filteredRecords.length} records found
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery('');
                    setCourseFilter('all');
                    setStatusFilter('all');
                    setDate(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CustomCard>
        
        <CustomCard>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.time}</TableCell>
                      <TableCell>{record.studentId}</TableCell>
                      <TableCell>
                        <div className="font-medium">{record.studentName}</div>
                      </TableCell>
                      <TableCell>{record.course}</TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
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
        </CustomCard>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceLogsPage;
