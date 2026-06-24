import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import axios from 'axios';
import { API_URL } from '@/config';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AddCoursePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    credits: ''
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Form validation
  const validateForm = () => {
    return formData.name.trim() !== '' && 
           formData.code.trim() !== '' && 
           formData.description.trim() !== '';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
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
      
      // Format data for API
      const courseData = {
        ...formData,
        credits: formData.credits ? parseInt(formData.credits) : undefined
      };
      
      // Log token for debugging
      console.log('Using token for API request:', token.substring(0, 20) + '...');
      
      const response = await axios.post(
        `${API_URL}/api/admin/courses`,
        courseData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      toast({
        title: 'Success',
        description: 'Course created successfully',
      });
      
      // Navigate back to courses list
      navigate('/admin/courses');
    } catch (err: any) {
      console.error('Error creating course:', err);
      
      let errorMessage = 'Failed to create course. Please try again.';
      
      // Handle specific error cases
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Authentication error. Please login again.';
          // Redirect to login page after a short delay
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

        <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex items-center mb-6">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/courses')}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Back to Courses
              </CustomButton>
              <h1 className="page-title ml-2">Add New Course</h1>
            </div>
            
            <form onSubmit={handleSubmit}>
              <CustomCard className="mb-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Course Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter course name"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="code">Course Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="e.g. CS101"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="credits">Credits</Label>
                      <Input
                        id="credits"
                        name="credits"
                        type="number"
                        min="0"
                        value={formData.credits}
                        onChange={handleInputChange}
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Course Description <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter course description"
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <CustomButton
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting || !validateForm()}
                      leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Course'}
                    </CustomButton>
                  </div>
                </div>
              </CustomCard>
            </form>
          </div>
        </DashboardLayout>
  );
};

export default AddCoursePage; 