import axios from 'axios';
import { API_URL } from '@/config';

console.log('Using API URL:', API_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for CORS
  withCredentials: true
});

// Add request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error Response:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    // Network error handling
    if (error.message === 'Network Error') {
      console.error('Network Error: The server is not reachable. Please check if the backend is running.');
    }
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email });
      const response = await api.post('/auth/login', { email, password });
      console.log('Login successful:', response.data);
      
      // Check if this is an unverified email response
      if (response.data.status === 'unverified_email') {
        console.log('Email not verified, returning data for verification process');
        return response.data;
      }
      
      // Store token and user info in localStorage
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  register: async (name: string, email: string, password: string, role: 'student' | 'admin', phoneNumber?: string) => {
    try {
      console.log('Registering user:', { name, email, role, phoneNumber });
      const response = await api.post('/auth/register', { name, email, password, role, phone_number: phoneNumber });
      console.log('Registration request successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Check if it's a network error
      if (error.message === 'Network Error') {
        throw new Error('Unable to connect to the server. Please check if the backend is running and try again.');
      }
      
      throw error;
    }
  },
  
  verifyOtp: async (email: string, otp: string) => {
    try {
      console.log('Verifying OTP for:', email);
      const response = await api.post('/auth/verify-otp', { email, otp });
      console.log('OTP verification successful:', response.data);
      
      // If verification includes token and user data, store them
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  },
  
  resendOtp: async (email: string) => {
    try {
      console.log('Resending OTP for:', email);
      const response = await api.post('/auth/resend-otp', { email });
      console.log('OTP resent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Resend OTP failed:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  forgotPassword: async (email: string) => {
    try {
      console.log('Requesting password reset for:', email);
      const response = await api.post('/auth/forgot-password', { email });
      console.log('Password reset response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  },
  
  verifyResetOtp: async (email: string, otp: string) => {
    try {
      console.log('Verifying reset OTP for:', email);
      const response = await api.post('/auth/verify-reset-otp', { email, otp });
      console.log('Reset OTP verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Reset OTP verification failed:', error);
      throw error;
    }
  },
  
  resetPassword: async (token: string, password: string) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      console.log('Password reset successful');
      return response.data;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  },
};

// Student services
export const studentService = {
  getProfile: async () => {
    return await api.get('/auth/profile');
  },
  
  getEnrollments: async () => {
    return await api.get('/student/enrollments');
  },
  
  requestEnrollment: async (courseId: number) => {
    return await api.post('/student/enroll', { course_id: courseId });
  },
  
  getAttendance: async (startDate?: string, endDate?: string) => {
    let url = '/student/attendance';
    
    // Add query parameters if provided
    if (startDate || endDate) {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      url += `?${params.toString()}`;
    }
    
    return await api.get(url);
  },

  getMonthlyAttendance: async (month?: number, year?: number) => {
    let url = '/student/attendance';
    
    // Add query params if provided
    if (month !== undefined || year !== undefined) {
      const params = new URLSearchParams();
      if (month !== undefined) params.append('month', month.toString());
      if (year !== undefined) params.append('year', year.toString());
      url += `?${params.toString()}`;
    }
    
    return await api.get(url);
  },

  getStudentProfile: async () => {
    return await api.get('/student/profile');
  },
  
  createStudentProfile: async (profileData: {
    college_name: string;
    course: string;
    year_of_study: string;
    registration_number: string;
    profile_photo?: string;
    face_images?: Record<string, string>;
  }) => {
    return await api.post('/student/profile', profileData);
  },
  
  updateStudentProfile: async (profileData: {
    college_name?: string;
    course?: string;
    year_of_study?: string;
    registration_number?: string;
    profile_photo?: string;
    face_images?: Record<string, string>;
  }) => {
    return await api.put('/student/profile', profileData);
  }
};

// Admin services
export const adminService = {
  getStudents: async () => {
    return await api.get('/student/all');
  },
  
  getCourses: async () => {
    return await api.get('/course/all');
  },
  
  getEnrollmentRequests: async () => {
    return await api.get('/course/enrollment-requests');
  },
  
  approveEnrollment: async (enrollmentId: number) => {
    return await api.put(`/course/enrollments/${enrollmentId}/approve`);
  },
  
  rejectEnrollment: async (enrollmentId: number) => {
    return await api.put(`/course/enrollments/${enrollmentId}/reject`);
  },
  
  getAttendanceReports: async () => {
    return await api.get('/attendance/reports');
  },
  
  getStudentProfiles: async (approved?: boolean) => {
    const query = approved !== undefined ? `?approved=${approved}` : '';
    return await api.get(`/admin/student-profiles${query}`);
  },
  
  approveStudentProfile: async (profileId: string) => {
    return await api.put(`/admin/student-profiles/${profileId}/approve`);
  },
  
  rejectStudentProfile: async (profileId: string) => {
    return await api.put(`/admin/student-profiles/${profileId}/reject`);
  },
  
  updateProfile: async (profileData: {
    name: string;
    email: string;
    phone_number?: string;
  }) => {
    return await api.put('/api/admin/profile', profileData);
  },
  
  changePassword: async (passwordData: {
    current_password: string;
    new_password: string;
  }) => {
    return await api.put('/api/admin/change-password', passwordData);
  },
  
  createAdmin: async (adminData: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    password: string;
  }) => {
    return await api.post('/api/admin/create-admin', adminData);
  },
  
  getPendingProfiles: async () => {
    return await api.get('/admin/student-profiles?approved=false');
  },
  
  getApprovedProfiles: async () => {
    return await api.get('/admin/student-profiles?approved=true');
  },
  
  // New methods for attendance marking
  recognizeFace: async (imageData: string, date: string) => {
    return await api.post('/api/attendance/recognize-face', { image: imageData, date });
  },
  
  markAttendance: async (studentId: string, date: string = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], status: string = 'present') => {
    return await api.post('/api/attendance/mark', { student_id: studentId, date, status });
  },
  
  getAttendanceLogs: async (filters?: { date?: string, student_id?: string, course_id?: string }) => {
    // Use the correct endpoint that works on the backend
    let url = '/api/admin/attendance/logs';
    
    // Add query params if provided
    if (filters) {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.student_id) params.append('student_id', filters.student_id);
      if (filters.course_id) params.append('course_id', filters.course_id);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return await api.get(url);
  },
  
  getStudent: async (studentId: string) => {
    return await api.get(`/api/admin/students/${studentId}`);
  },
  
  getStudentMonthlyAttendance: async (studentId: string, month?: number, year?: number) => {
    let url = `/api/admin/student/${studentId}/attendance`;
    
    // Add query params if provided
    if (month !== undefined || year !== undefined) {
      const params = new URLSearchParams();
      if (month !== undefined) params.append('month', month.toString());
      if (year !== undefined) params.append('year', year.toString());
      url += `?${params.toString()}`;
    }
    
    return await api.get(url);
  },
  
  getMonthlyAttendanceSummary: async (month?: number, year?: number) => {
    let url = '/api/admin/attendance/monthly-summary';
    
    // Add query params if provided
    if (month !== undefined || year !== undefined) {
      const params = new URLSearchParams();
      if (month !== undefined) params.append('month', month.toString());
      if (year !== undefined) params.append('year', year.toString());
      url += `?${params.toString()}`;
    }
    
    return await api.get(url);
  },
  
  getOffWeekdays: async () => {
    return await api.get('/api/admin/settings/off-weekdays');
  },
  
  updateOffWeekdays: async (offWeekdays: number[]) => {
    return await api.put('/api/admin/settings/off-weekdays', { off_weekdays: offWeekdays });
  },
  
  getHolidays: async () => {
    return await api.get('/api/admin/holidays');
  },
  
  addHoliday: async (date: string, name: string) => {
    return await api.post('/api/admin/holidays', { date, name });
  },
  
  deleteHoliday: async (holidayId: string) => {
    return await api.delete(`/api/admin/holidays/${holidayId}`);
  },
};

// Contact services
export const contactService = {
  submitContactForm: async (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    return await api.post('/api/contact/submit', formData);
  },
  
  // Admin methods for contact form management
  getContactSubmissions: async (page: number = 1, limit: number = 10, isRead?: boolean) => {
    let url = '/api/admin/contact-submissions';
    
    // Add query params
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (isRead !== undefined) {
      params.append('is_read', isRead.toString());
    }
    url += `?${params.toString()}`;
    
    return await api.get(url);
  },
  
  markSubmissionAsRead: async (submissionId: string, isRead: boolean) => {
    return await api.put(`/api/admin/contact-submissions/${submissionId}`, { is_read: isRead });
  },
  
  deleteSubmission: async (submissionId: string) => {
    return await api.delete(`/api/admin/contact-submissions/${submissionId}`);
  }
};

export default api; 