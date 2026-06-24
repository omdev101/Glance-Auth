import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { adminService } from '@/services/api';
import { Calendar as CalendarIcon, Trash2, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WEEKDAYS = [
  { id: 0, label: 'Monday' },
  { id: 1, label: 'Tuesday' },
  { id: 2, label: 'Wednesday' },
  { id: 3, label: 'Thursday' },
  { id: 4, label: 'Friday' },
  { id: 5, label: 'Saturday' },
  { id: 6, label: 'Sunday' },
];

export const HolidaysManager = ({ onSettingsChanged }: { onSettingsChanged: () => void }) => {
  const { toast } = useToast();
  const [offWeekdays, setOffWeekdays] = useState<number[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [offDaysRes, holidaysRes] = await Promise.all([
        adminService.getOffWeekdays(),
        adminService.getHolidays()
      ]);
      setOffWeekdays(offDaysRes.data.off_weekdays || [5, 6]);
      setHolidays(holidaysRes.data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load holidays and off-days.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWeekdayToggle = async (dayId: number) => {
    let newOffDays;
    if (offWeekdays.includes(dayId)) {
      newOffDays = offWeekdays.filter(d => d !== dayId);
    } else {
      newOffDays = [...offWeekdays, dayId];
    }
    setOffWeekdays(newOffDays);
    
    try {
      await adminService.updateOffWeekdays(newOffDays);
      toast({
        title: 'Settings Updated',
        description: 'Off-weekdays have been updated.',
      });
      onSettingsChanged();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update off-weekdays.',
        variant: 'destructive',
      });
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    
    try {
      await adminService.addHoliday(newHolidayDate, newHolidayName);
      setNewHolidayName('');
      setNewHolidayDate('');
      toast({
        title: 'Holiday Added',
        description: 'New holiday has been added successfully.',
      });
      fetchData();
      onSettingsChanged();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add holiday.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await adminService.deleteHoliday(id);
      toast({
        title: 'Holiday Deleted',
        description: 'Holiday has been removed successfully.',
      });
      fetchData();
      onSettingsChanged();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete holiday.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Off-Weekdays</CardTitle>
          <CardDescription>Select which days of the week are considered non-working days. Attendance will not be expected on these days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {WEEKDAYS.map((day) => (
              <div key={day.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`day-${day.id}`} 
                  checked={offWeekdays.includes(day.id)}
                  onCheckedChange={() => handleWeekdayToggle(day.id)}
                />
                <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Holidays</CardTitle>
          <CardDescription>Add specific dates that are off (e.g. National Holidays).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddHoliday} className="flex flex-col gap-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input 
                  id="holiday-name" 
                  placeholder="e.g. Christmas" 
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <Input 
                  id="holiday-date" 
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <CustomButton type="submit" variant="primary" className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Holiday
            </CustomButton>
          </form>

          {holidays.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell className="font-medium">{h.date}</TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell className="text-right">
                        <CustomButton 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleDeleteHoliday(h._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </CustomButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md text-muted-foreground text-sm">
              No custom holidays added yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
