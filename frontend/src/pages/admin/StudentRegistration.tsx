
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Save, ArrowLeft } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';

const StudentRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    course: '',
    year: '1',
    section: '',
    phone: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setIsCameraOpen(false);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.studentId) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (!capturedImage) {
      toast({
        title: "Missing Face Data",
        description: "Please capture student's face before submitting.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Student Registered Successfully",
        description: `${formData.firstName} ${formData.lastName} has been added to the system.`,
      });
      setIsLoading(false);
      navigate('/admin/students');
    }, 1500);
  };

  return (

        <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="page-title">Register New Student</h1>
                <p className="page-subtitle">Add a new student and capture face data</p>
              </div>
              
              <CustomButton
                variant="outline"
                onClick={() => navigate('/admin/students')}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to Students
              </CustomButton>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CustomCard>
                  <form onSubmit={handleSubmit}>
                    <h2 className="text-lg font-semibold mb-4">Student Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="John"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john.doe@college.edu"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID *</Label>
                        <Input
                          id="studentId"
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleChange}
                          placeholder="STU12345"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="course">Course</Label>
                        <Select
                          value={formData.course}
                          onValueChange={(value) => handleSelectChange('course', value)}
                        >
                          <SelectTrigger id="course">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Information Technology">Information Technology</SelectItem>
                            <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                            <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                            <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Select
                          value={formData.year}
                          onValueChange={(value) => handleSelectChange('year', value)}
                        >
                          <SelectTrigger id="year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Year 1</SelectItem>
                            <SelectItem value="2">Year 2</SelectItem>
                            <SelectItem value="3">Year 3</SelectItem>
                            <SelectItem value="4">Year 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="section">Section</Label>
                        <Input
                          id="section"
                          name="section"
                          value={formData.section}
                          onChange={handleChange}
                          placeholder="A"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <CustomButton
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                        rightIcon={<Save className="h-4 w-4" />}
                      >
                        Register Student
                      </CustomButton>
                    </div>
                  </form>
                </CustomCard>
              </div>
              
              <div className="lg:col-span-1">
                <CustomCard className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Face Data</h2>
                  
                  {isCameraOpen ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Position the student's face in the center and ensure good lighting.
                      </p>
                      <WebcamCapture 
                        onCapture={handleCapture} 
                        isProcessing={false}
                      />
                    </div>
                  ) : capturedImage ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img 
                          src={capturedImage} 
                          alt="Captured Face" 
                          className="w-full aspect-video object-cover rounded-md"
                        />
                      </div>
                      <div className="flex gap-2">
                        <CustomButton 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setIsCameraOpen(true)}
                          leftIcon={<Camera className="h-4 w-4" />}
                        >
                          Retake
                        </CustomButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center text-center">
                        <div className="bg-muted p-3 rounded-full mb-2">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No face data captured</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Capture student's face for recognition
                        </p>
                        <div className="flex gap-2 w-full">
                          <CustomButton 
                            variant="secondary" 
                            className="flex-1"
                            onClick={() => setIsCameraOpen(true)}
                            leftIcon={<Camera className="h-4 w-4" />}
                          >
                            Capture Face
                          </CustomButton>
                          <CustomButton 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {}}
                            leftIcon={<Upload className="h-4 w-4" />}
                          >
                            Upload
                          </CustomButton>
                        </div>
                      </div>
                    </div>
                  )}
                </CustomCard>
                
                <CustomCard>
                  <h2 className="text-lg font-semibold mb-2">Instructions</h2>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">1</div>
                      <span>Fill all the required student information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">2</div>
                      <span>Capture a clear image of the student's face</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">3</div>
                      <span>Ensure proper lighting and neutral expression</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="min-w-5 min-h-5 rounded-full bg-muted text-primary flex items-center justify-center text-xs font-semibold">4</div>
                      <span>Click on "Register Student" to save</span>
                    </li>
                  </ul>
                </CustomCard>
              </div>
            </div>
          </div>
        </DashboardLayout>
  );
};

export default StudentRegistration;
