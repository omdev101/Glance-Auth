// Configuration settings for the application

// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// API Endpoints
export const ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_URL}/auth/login`,
  REGISTER: `${API_URL}/auth/register`,
  VERIFY_OTP: `${API_URL}/auth/verify-otp`,
  RESEND_OTP: `${API_URL}/auth/resend-otp`,
  PROFILE: `${API_URL}/auth/profile`,
  
  // Student endpoints
  STUDENT_PROFILE: `${API_URL}/student/profile`,
  STUDENT_ATTENDANCE: `${API_URL}/student/attendance`,
  STUDENT_FETCH: (id: string) => `${API_URL}/api/admin/student/${id}`,
  
  // Admin endpoints
  ADMIN_PENDING_PROFILES: `${API_URL}/admin/student-profiles?approved=false`,
  ADMIN_APPROVED_PROFILES: `${API_URL}/admin/student-profiles?approved=true`,
  ADMIN_ALL_PROFILES: `${API_URL}/admin/student-profiles`,
  ADMIN_APPROVE_PROFILE: (id: string) => `${API_URL}/admin/student-profiles/${id}/approve`,
  ADMIN_REJECT_PROFILE: (id: string) => `${API_URL}/admin/student-profiles/${id}/reject`,
  STUDENT_ALL: `${API_URL}/student/all`,
  STUDENT_CREATE: `${API_URL}/api/admin/create-student`,
  STUDENT_UPDATE: (id: string) => `${API_URL}/api/admin/update-student/${id}`,
  STUDENT_UPDATE_FACE: (id: string) => `${API_URL}/api/admin/update-student-face/${id}`,
  STUDENT_DETAILS: (id: string | number | object | undefined | null) => {
    // Convert to string and validate the ID
    let stringId = '';
    
    try {
      // Handle different types of ID inputs
      if (id === undefined || id === null) {
        console.error('Student ID is undefined or null');
        stringId = '';
      } else if (typeof id === 'string') {
        stringId = id;
      } else if (typeof id === 'object') {
        // Handle MongoDB ObjectId objects or similar
        console.warn('ID is an object, attempting to convert:', id);
        
        // Check for MongoDB $oid format
        const objId = id as any;
        if (objId.$oid) {
          console.log("Found MongoDB $oid format:", objId);
          stringId = String(objId.$oid);
        } else if (objId._id) {
          // Object with _id property
          if (typeof objId._id === 'string') {
            stringId = objId._id;
          } else if (typeof objId._id === 'object' && objId._id.$oid) {
            stringId = objId._id.$oid;
          } else {
            stringId = String(objId._id);
          }
        } else {
          stringId = String(id);
        }
      } else {
        // For numbers or other types
        stringId = String(id);
      }
      
      // Trim any extra whitespace
      stringId = stringId.trim();
      
      // Basic ObjectId validation (24 character hex string)
      const isValidObjectId = /^[0-9a-f]{24}$/i.test(stringId);
      
      if (!stringId || !isValidObjectId) {
        console.error('Invalid student ID format after processing:', id, '→', stringId);
        // Return a path that will trigger a 404 error in the API
        return `${API_URL}/api/admin/student/invalid-id`;
      }
      
      return `${API_URL}/api/admin/student/${stringId}`;
    } catch (e) {
      console.error('Error processing student ID:', e, id);
      return `${API_URL}/api/admin/student/invalid-id`;
    }
  },
  ATTENDANCE_REPORTS: `${API_URL}/attendance/reports`,
  ATTENDANCE_MARK: `${API_URL}/api/attendance/mark`,
  ATTENDANCE_RECOGNIZE: `${API_URL}/api/attendance/recognize-face`,
  ATTENDANCE_LOGS: `${API_URL}/api/admin/attendance/logs`,
  
  // Course endpoints
  COURSES: `${API_URL}/api/admin/courses`,
  COURSE_DETAIL: (id: string) => `${API_URL}/api/admin/courses/${id}`,
  CREATE_COURSE: `${API_URL}/api/admin/courses`,
  UPDATE_COURSE: (id: string) => `${API_URL}/api/admin/courses/${id}`,
  DELETE_COURSE: (id: string) => `${API_URL}/api/admin/courses/${id}`,
};

// Other global configuration
export const APP_NAME = 'Student Attendance System';
export const APP_VERSION = '1.0.0';

// Authentication config
export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

// Feature flags
export const FEATURES = {
  FACE_RECOGNITION: true,
  ATTENDANCE_EXPORT: true,
  REPORTS: true,
};

// Default values
export const DEFAULTS = {
  PAGINATION_LIMIT: 10,
  DATE_FORMAT: 'yyyy-MM-dd',
  TIME_FORMAT: 'HH:mm:ss',
}; 