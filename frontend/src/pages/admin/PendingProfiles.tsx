import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  User, 
  School, 
  BookOpen, 
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminService } from '@/services/api';
import { useAuth } from '@/App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentProfile {
  profile: {
    _id: string;
    user_id: string;
    college_name: string;
    course: string;
    year_of_study: number;
    registration_number: string;
    profile_photo: string;
    face_images: {
      front: string;
      left: string;
      right: string;
    };
    is_approved: boolean;
    created_at: string;
    updated_at: string;
  };
  user: {
    _id: string;
    name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_verified: boolean;
    created_at: string;
  };
}

const PendingProfilesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for student profiles
  const [pendingProfiles, setPendingProfiles] = useState<StudentProfile[]>([]);
  
  // State for selected profile for review
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedFaceImage, setSelectedFaceImage] = useState<string | null>(null);
  const [faceImageDialogOpen, setFaceImageDialogOpen] = useState(false);
  
  // Fetch pending profiles
  useEffect(() => {
    const fetchPendingProfiles = async () => {
      try {
        setLoading(true);
        
        // Use adminService to fetch pending profiles
        const response = await adminService.getPendingProfiles();
        
        setPendingProfiles(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching pending profiles:', err);
        setError('Failed to load pending profile requests. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load pending profiles',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingProfiles();
  }, [toast]);
  
  // Handle profile review
  const handleReviewProfile = (profile: StudentProfile) => {
    setSelectedProfile(profile);
    setIsReviewDialogOpen(true);
  };
  
  // Handle profile approval
  const handleApproveProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      setIsApproving(true);
      
      // Use adminService to approve the profile
      await adminService.approveStudentProfile(selectedProfile.profile._id);
      
      // Show success message
      toast({
        title: 'Profile Approved',
        description: `${selectedProfile.user.name}'s profile has been approved successfully`,
        variant: 'default'
      });
      
      // Remove from pending list
      setPendingProfiles(prevProfiles => 
        prevProfiles.filter(p => p.profile._id !== selectedProfile.profile._id)
      );
      
      // Close dialog
      setIsReviewDialogOpen(false);
      setSelectedProfile(null);
    } catch (err: any) {
      console.error('Error approving profile:', err);
      toast({
        title: 'Approval Failed',
        description: err.response?.data?.error || 'Failed to approve profile',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };
  
  // Handle profile rejection
  const handleRejectProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      setIsRejecting(true);
      
      // Use adminService to reject the profile
      await adminService.rejectStudentProfile(selectedProfile.profile._id);
      
      // Show success message
      toast({
        title: 'Profile Rejected',
        description: `${selectedProfile.user.name}'s profile has been rejected`,
        variant: 'default'
      });
      
      // Remove from pending list
      setPendingProfiles(prevProfiles => 
        prevProfiles.filter(p => p.profile._id !== selectedProfile.profile._id)
      );
      
      // Close dialog
      setIsReviewDialogOpen(false);
      setSelectedProfile(null);
    } catch (err: any) {
      console.error('Error rejecting profile:', err);
      toast({
        title: 'Rejection Failed',
        description: err.response?.data?.error || 'Failed to reject profile',
        variant: 'destructive'
      });
    } finally {
      setIsRejecting(false);
    }
  };
  
  // Handle view face image
  const handleViewFaceImage = (imageType: 'front' | 'left' | 'right') => {
    if (selectedProfile && selectedProfile.profile.face_images[imageType]) {
      setSelectedFaceImage(selectedProfile.profile.face_images[imageType]);
      setFaceImageDialogOpen(true);
    }
  };
  
  // Function to extract initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };
  
  // Filter profiles based on search query
  const filteredProfiles = pendingProfiles.filter(profile => 
    profile.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.profile.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
              <div>
                <h1 className="page-title">Pending Profile Requests</h1>
                <p className="page-subtitle">Review and approve student profile submissions</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-center">
                <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 mr-2">
                  {pendingProfiles.length} Pending
                </Badge>
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/students')}
                >
                  View All Students
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
                      <h3 className="font-semibold text-lg">Error Loading Requests</h3>
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
            
            {/* Search Bar */}
            <CustomCard className="mb-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or ID..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CustomCard>
            
            {/* Pending Profiles Table */}
            {!loading && !error && (
              <CustomCard>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Student</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.length > 0 ? (
                        filteredProfiles.map((studentProfile) => (
                          <TableRow key={studentProfile.profile._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={studentProfile.profile.profile_photo} />
                                  <AvatarFallback className="bg-muted text-primary">
                                    {getInitials(studentProfile.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{studentProfile.user.name}</div>
                                  <div className="text-sm text-muted-foreground">{studentProfile.user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{studentProfile.profile.registration_number}</TableCell>
                            <TableCell>{studentProfile.profile.course}</TableCell>
                            <TableCell>Year {studentProfile.profile.year_of_study}</TableCell>
                            <TableCell>
                              {new Date(studentProfile.profile.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <CustomButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewProfile(studentProfile)}
                              >
                                Review <ChevronRight className="ml-1 h-4 w-4" />
                              </CustomButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {pendingProfiles.length === 0 
                              ? "No pending profile requests found" 
                              : "No profiles match your search query"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CustomCard>
            )}
            
            {/* Profile Review Dialog */}
            {selectedProfile && (
              <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review Student Profile</DialogTitle>
                    <DialogDescription>
                      Review the student's profile information before approving or rejecting.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
                    {/* Student Info Card */}
                    <div className="md:col-span-4">
                      <div className="flex flex-col items-center">
                        <Avatar className="w-24 h-24 mb-4">
                          <AvatarImage src={selectedProfile.profile.profile_photo} />
                          <AvatarFallback className="text-2xl bg-muted text-primary">
                            {getInitials(selectedProfile.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <h3 className="text-xl font-semibold">{selectedProfile.user.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{selectedProfile.user.email}</p>
                        
                        <div className="w-full space-y-4">
                          <div className="flex items-center p-3 rounded-md bg-background">
                            <User className="h-5 w-5 mr-3 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Student ID</div>
                              <div className="text-sm text-muted-foreground">
                                {selectedProfile.profile.registration_number}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-3 rounded-md bg-background">
                            <School className="h-5 w-5 mr-3 text-primary" />
                            <div>
                              <div className="text-sm font-medium">College</div>
                              <div className="text-sm text-muted-foreground">
                                {selectedProfile.profile.college_name}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-3 rounded-md bg-background">
                            <BookOpen className="h-5 w-5 mr-3 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Course</div>
                              <div className="text-sm text-muted-foreground">
                                {selectedProfile.profile.course}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-3 rounded-md bg-background">
                            <Calendar className="h-5 w-5 mr-3 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Year of Study</div>
                              <div className="text-sm text-muted-foreground">
                                Year {selectedProfile.profile.year_of_study}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Face Images */}
                    <div className="md:col-span-8">
                      <h3 className="text-lg font-medium mb-4">Face Registration Images</h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {/* Front Face */}
                        <div className="space-y-2">
                          <div className="aspect-square overflow-hidden rounded-md border bg-background relative">
                            <img 
                              src={selectedProfile.profile.face_images.front} 
                              alt="Front face" 
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 text-center">
                              Front View
                            </div>
                          </div>
                          <CustomButton 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleViewFaceImage('front')}
                          >
                            View Larger
                          </CustomButton>
                        </div>
                        
                        {/* Left Face */}
                        <div className="space-y-2">
                          <div className="aspect-square overflow-hidden rounded-md border bg-background relative">
                            <img 
                              src={selectedProfile.profile.face_images.left} 
                              alt="Left face" 
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 text-center">
                              Left View
                            </div>
                          </div>
                          <CustomButton 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleViewFaceImage('left')}
                          >
                            View Larger
                          </CustomButton>
                        </div>
                        
                        {/* Right Face */}
                        <div className="space-y-2">
                          <div className="aspect-square overflow-hidden rounded-md border bg-background relative">
                            <img 
                              src={selectedProfile.profile.face_images.right} 
                              alt="Right face" 
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 text-center">
                              Right View
                            </div>
                          </div>
                          <CustomButton 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleViewFaceImage('right')}
                          >
                            View Larger
                          </CustomButton>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Additional Information</h3>
                        <div className="rounded-md bg-background p-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium">Phone Number</div>
                              <div className="text-sm text-muted-foreground">
                                {selectedProfile.user.phone_number || 'Not provided'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Submission Date</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(selectedProfile.profile.created_at).toLocaleDateString()} 
                                {' '}
                                {new Date(selectedProfile.profile.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex justify-between">
                    <CustomButton
                      variant="destructive"
                      onClick={handleRejectProfile}
                      disabled={isRejecting || isApproving}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      {isRejecting ? 'Rejecting...' : 'Reject Profile'}
                    </CustomButton>
                    <CustomButton
                      onClick={handleApproveProfile}
                      disabled={isApproving || isRejecting}
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                    >
                      {isApproving ? 'Approving...' : 'Approve Profile'}
                    </CustomButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            {/* Face Image View Dialog */}
            <Dialog open={faceImageDialogOpen} onOpenChange={setFaceImageDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Face Image</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center py-4">
                  {selectedFaceImage && (
                    <img 
                      src={selectedFaceImage} 
                      alt="Face image" 
                      className="max-h-[70vh] object-contain rounded-md"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </DashboardLayout>
  );
};

export default PendingProfilesPage; 