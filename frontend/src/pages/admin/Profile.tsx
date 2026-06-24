import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  UserPlus, 
  X, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { getToken } from '@/lib/auth';
import { API_URL } from '@/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminProfile {
  _id: string;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  created_at: string;
}

interface NewAdminData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

const AdminProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingNewAdmin, setLoadingNewAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile data state
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // New admin state
  const [newAdminData, setNewAdminData] = useState<NewAdminData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: ''
  });
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false);
  
  // Fetch admin profile data
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Fetch admin profile data
        const response = await axios.get(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const profileData = response.data;
        setProfile(profileData);
        setName(profileData.name || '');
        setEmail(profileData.email || '');
        setPhoneNumber(profileData.phone_number || '');
        
        setError(null);
      } catch (err) {
        console.error('Error fetching admin profile:', err);
        setError('Failed to load profile data. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminProfile();
  }, [navigate, toast]);
  
  // Update profile handler
  const handleUpdateProfile = async () => {
    try {
      setLoadingUpdate(true);
      const token = getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Update profile data
      await axios.put(`${API_URL}/api/admin/profile`, {
        name,
        email,
        phone_number: phoneNumber
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success message
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
        variant: 'default'
      });
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          name,
          email,
          phone_number: phoneNumber
        });
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({
        title: 'Update Failed',
        description: err.response?.data?.error || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoadingUpdate(false);
    }
  };
  
  // Change password handler
  const handleChangePassword = async () => {
    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive'
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoadingUpdate(true);
      const token = getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Change password
      await axios.put(`${API_URL}/api/admin/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success message
      toast({
        title: 'Password Changed',
        description: 'Your password has been changed successfully',
        variant: 'default'
      });
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast({
        title: 'Password Change Failed',
        description: err.response?.data?.error || 'Failed to change password',
        variant: 'destructive'
      });
    } finally {
      setLoadingUpdate(false);
    }
  };
  
  // Create new admin handler
  const handleCreateAdmin = async () => {
    // Validate form
    if (newAdminData.password !== newAdminData.confirm_password) {
      toast({
        title: 'Password Mismatch',
        description: 'Password and confirmation do not match',
        variant: 'destructive'
      });
      return;
    }
    
    if (newAdminData.password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoadingNewAdmin(true);
      const token = getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Create new admin account
      await axios.post(`${API_URL}/api/admin/create-admin`, {
        first_name: newAdminData.first_name,
        last_name: newAdminData.last_name,
        email: newAdminData.email,
        phone_number: newAdminData.phone_number,
        password: newAdminData.password
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success message
      toast({
        title: 'Admin Created',
        description: 'New admin account has been created successfully',
        variant: 'default'
      });
      
      // Reset form and close dialog
      setNewAdminData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        confirm_password: ''
      });
      setCreateAdminDialogOpen(false);
    } catch (err: any) {
      console.error('Error creating admin:', err);
      toast({
        title: 'Admin Creation Failed',
        description: err.response?.data?.error || 'Failed to create admin account',
        variant: 'destructive'
      });
    } finally {
      setLoadingNewAdmin(false);
    }
  };
  
  // Handle new admin form changes
  const handleNewAdminChange = (field: keyof NewAdminData, value: string) => {
    setNewAdminData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Function to get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };
  
  return (
    <DashboardLayout userType="admin">
          <div className="page-container">
            <div className="page-header">
              <h1 className="page-title">Admin Profile & Settings</h1>
              <p className="page-subtitle">Manage your profile and admin settings</p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-6">
                <CustomCard className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Error Loading Profile</h3>
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
            
            {/* Profile Content */}
            {!loading && !error && profile && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Profile Summary Card */}
                <div className="md:col-span-4">
                  <CustomCard className="h-full">
                    <div className="flex flex-col items-center p-4">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xl bg-muted text-primary">
                          {getInitials(profile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-semibold">{profile.name}</h3>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <div className="mt-2 py-1 px-3 bg-muted text-primary rounded-full text-xs font-medium">
                        Administrator
                      </div>
                      
                      <div className="w-full mt-6 space-y-3">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{profile.email}</span>
                        </div>
                        {profile.phone_number && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{profile.phone_number}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">Account created on {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Add Admin Button */}
                      <div className="w-full mt-6">
                        <Dialog open={createAdminDialogOpen} onOpenChange={setCreateAdminDialogOpen}>
                          <DialogTrigger asChild>
                            <CustomButton 
                              variant="outline" 
                              className="w-full" 
                              leftIcon={<UserPlus className="h-4 w-4" />}
                            >
                              Create New Admin
                            </CustomButton>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Admin Account</DialogTitle>
                              <DialogDescription>
                                Fill in the details to create a new administrator account.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="first_name">First Name</Label>
                                  <Input 
                                    id="first_name" 
                                    value={newAdminData.first_name}
                                    onChange={(e) => handleNewAdminChange('first_name', e.target.value)}
                                    placeholder="Enter first name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="last_name">Last Name</Label>
                                  <Input 
                                    id="last_name" 
                                    value={newAdminData.last_name}
                                    onChange={(e) => handleNewAdminChange('last_name', e.target.value)}
                                    placeholder="Enter last name"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="admin_email">Email Address</Label>
                                <Input 
                                  id="admin_email" 
                                  type="email"
                                  value={newAdminData.email}
                                  onChange={(e) => handleNewAdminChange('email', e.target.value)}
                                  placeholder="Enter email address"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="admin_phone">Phone Number</Label>
                                <Input 
                                  id="admin_phone" 
                                  value={newAdminData.phone_number}
                                  onChange={(e) => handleNewAdminChange('phone_number', e.target.value)}
                                  placeholder="Enter phone number"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="admin_password">Password</Label>
                                <div className="relative">
                                  <Input 
                                    id="admin_password" 
                                    type={showNewAdminPassword ? "text" : "password"}
                                    value={newAdminData.password}
                                    onChange={(e) => handleNewAdminChange('password', e.target.value)}
                                    placeholder="Enter password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                  >
                                    {showNewAdminPassword ? (
                                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="admin_confirm_password">Confirm Password</Label>
                                <Input 
                                  id="admin_confirm_password" 
                                  type="password"
                                  value={newAdminData.confirm_password}
                                  onChange={(e) => handleNewAdminChange('confirm_password', e.target.value)}
                                  placeholder="Confirm password"
                                />
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <CustomButton
                                variant="outline"
                                onClick={() => setCreateAdminDialogOpen(false)}
                                disabled={loadingNewAdmin}
                                leftIcon={<X className="h-4 w-4" />}
                              >
                                Cancel
                              </CustomButton>
                              <CustomButton
                                onClick={handleCreateAdmin}
                                disabled={loadingNewAdmin}
                                leftIcon={<UserPlus className="h-4 w-4" />}
                              >
                                {loadingNewAdmin ? 'Creating...' : 'Create Admin'}
                              </CustomButton>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CustomCard>
                </div>
                
                {/* Profile Settings Tabs */}
                <div className="md:col-span-8">
                  <CustomCard>
                    <Tabs defaultValue="profile">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile Information</TabsTrigger>
                        <TabsTrigger value="security">Security & Password</TabsTrigger>
                      </TabsList>
                      
                      {/* Profile Information Tab */}
                      <TabsContent value="profile" className="space-y-4 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input 
                            id="email" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Enter your phone number"
                          />
                        </div>
                        
                        <div className="pt-4">
                          <CustomButton
                            onClick={handleUpdateProfile}
                            disabled={loadingUpdate}
                            leftIcon={<Save className="h-4 w-4" />}
                          >
                            {loadingUpdate ? 'Saving...' : 'Save Changes'}
                          </CustomButton>
                        </div>
                      </TabsContent>
                      
                      {/* Security & Password Tab */}
                      <TabsContent value="security" className="space-y-4 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="current_password">Current Password</Label>
                          <div className="relative">
                            <Input 
                              id="current_password" 
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new_password">New Password</Label>
                          <div className="relative">
                            <Input 
                              id="new_password" 
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password">Confirm New Password</Label>
                          <div className="relative">
                            <Input 
                              id="confirm_password" 
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <CustomButton
                            onClick={handleChangePassword}
                            disabled={loadingUpdate}
                            leftIcon={<Lock className="h-4 w-4" />}
                          >
                            {loadingUpdate ? 'Updating...' : 'Change Password'}
                          </CustomButton>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CustomCard>
                </div>
              </div>
            )}
          </div>
        </DashboardLayout>
  );
};

export default AdminProfilePage; 