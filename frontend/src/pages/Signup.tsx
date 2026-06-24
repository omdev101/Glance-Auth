import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CustomCard from '@/components/ui/CustomCard';
import CustomButton from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignup = (userType: string) => {
    // Validate inputs
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate signup API call
    setTimeout(() => {
      setIsLoading(false);
      
      // In a real app, you'd handle signup logic and JWT tokens here
      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully. Please log in.',
      });
      navigate('/login');
    }, 1000);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-muted-foreground mt-2">Sign up to start using the attendance system</p>
          </div>
          
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="student">
              <CustomCard className="w-full">
                <form onSubmit={(e) => { e.preventDefault(); handleSignup('student'); }}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-student">Full Name</Label>
                      <Input 
                        id="name-student" 
                        type="text" 
                        placeholder="John Doe" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-student">Email</Label>
                      <Input 
                        id="email-student" 
                        type="email" 
                        placeholder="your.email@college.edu" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-student">Password</Label>
                      <Input 
                        id="password-student" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password-student">Confirm Password</Label>
                      <Input 
                        id="confirm-password-student" 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <CustomButton 
                      variant="primary" 
                      className="w-full" 
                      type="submit"
                      isLoading={isLoading}
                    >
                      Create Student Account
                    </CustomButton>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <a 
                          href="/login" 
                          className="text-primary hover:text-primary font-medium"
                          onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                        >
                          Sign in
                        </a>
                      </p>
                    </div>
                  </div>
                </form>
              </CustomCard>
            </TabsContent>
            
            <TabsContent value="admin">
              <CustomCard className="w-full">
                <form onSubmit={(e) => { e.preventDefault(); handleSignup('admin'); }}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-admin">Full Name</Label>
                      <Input 
                        id="name-admin" 
                        type="text" 
                        placeholder="Admin Name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-admin">Email</Label>
                      <Input 
                        id="email-admin" 
                        type="email" 
                        placeholder="admin@college.edu" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-admin">Password</Label>
                      <Input 
                        id="password-admin" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password-admin">Confirm Password</Label>
                      <Input 
                        id="confirm-password-admin" 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <CustomButton 
                      variant="primary" 
                      className="w-full" 
                      type="submit"
                      isLoading={isLoading}
                    >
                      Create Admin Account
                    </CustomButton>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <a 
                          href="/login" 
                          className="text-primary hover:text-primary font-medium"
                          onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                        >
                          Sign in
                        </a>
                      </p>
                    </div>
                  </div>
                </form>
              </CustomCard>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Signup; 