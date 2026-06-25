import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import { api as axios } from '@/services/api';
import { API_URL } from '@/config';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Course {
  _id: string;
  name: string;
  code: string;
  description: string;
  department?: string;
  credits?: number;
  created_at: string;
}

const AdminCoursesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'You are not logged in. Please login again.',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/admin/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setCourses(response.data.courses || []);
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to fetch courses',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      
      let errorMessage = 'Failed to fetch courses. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.department && course.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (

        <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h1 className="page-title mb-4 md:mb-0">Courses</h1>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search courses..."
                    className="pl-9 w-full sm:w-[250px]"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                
                <CustomButton
                  variant="primary"
                  onClick={() => navigate('/admin/add-course')}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add New Course
                </CustomButton>
              </div>
            </div>
            
            <CustomCard>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12">
                  {searchQuery ? (
                    <div>
                      <p className="text-muted-foreground mb-2">No courses match your search.</p>
                      <CustomButton 
                        variant="outline" 
                        onClick={() => setSearchQuery('')}
                      >
                        Clear Search
                      </CustomButton>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground mb-2">No courses available.</p>
                      <CustomButton 
                        variant="primary" 
                        onClick={() => navigate('/admin/add-course')}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Add Your First Course
                      </CustomButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-background">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Course Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Credits</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCourses.map((course) => (
                        <tr key={course._id} className="hover:bg-background">
                          <td className="px-4 py-3 text-sm font-medium">{course.code}</td>
                          <td className="px-4 py-3 text-sm">{course.name}</td>
                          <td className="px-4 py-3 text-sm">{course.department || '-'}</td>
                          <td className="px-4 py-3 text-sm">{course.credits || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end space-x-2">
                              <CustomButton
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/courses/${course._id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </CustomButton>
                              <CustomButton
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 dark:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </CustomButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CustomCard>
          </div>
        </DashboardLayout>
  );
};

export default AdminCoursesPage; 