/**
 * Application configuration
 * Contains API URLs and other configuration values
 */

// Base API URL - change this based on environment
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Specific API endpoints
export const ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_URL}/api/login`,
  REGISTER: `${API_URL}/api/register`,
  VERIFY_OTP: `${API_URL}/api/verify-otp`,
  
  // Admin endpoints
  ADMIN_STUDENTS: `${API_URL}/api/admin/students`,
  ADMIN_PENDING_PROFILES: `${API_URL}/admin/student-profiles?approved=false`,
  ADMIN_PROFILE_APPROVAL: `${API_URL}/admin/student-profiles`,
  ADMIN_CREATE_STUDENT: `${API_URL}/api/admin/create-student`,
  
  // Student endpoints
  STUDENT_PROFILE: `${API_URL}/api/student/profile`,
  STUDENT_ATTENDANCE: `${API_URL}/api/student/attendance`,
  STUDENT_ALL: `${API_URL}/student/all`,
  
  // Face recognition endpoints
  ANALYZE_FACE: `${API_URL}/api/analyze-face`,
  REGISTER_FACE: `${API_URL}/api/register-face`,
  VERIFY_FACE: `${API_URL}/api/verify-face`,
};
