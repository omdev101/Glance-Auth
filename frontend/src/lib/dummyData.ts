export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  course: string;
  year: number;
  hasFaceData: boolean;
  imageUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  course: string;
  status: 'present' | 'absent';
}

export interface EnrollmentRequest {
  id: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const students: Student[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@college.edu',
    studentId: 'STU001',
    course: 'Computer Science',
    year: 3,
    hasFaceData: true,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@college.edu',
    studentId: 'STU002',
    course: 'Data Science',
    year: 2,
    hasFaceData: true,
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
  },
  {
    id: '3',
    name: 'Michael Johnson',
    email: 'michael.j@college.edu',
    studentId: 'STU003',
    course: 'Software Engineering',
    year: 4,
    hasFaceData: false
  },
  {
    id: '4',
    name: 'Emily Williams',
    email: 'emily.w@college.edu',
    studentId: 'STU004',
    course: 'Artificial Intelligence',
    year: 3,
    hasFaceData: true,
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david.b@college.edu',
    studentId: 'STU005',
    course: 'Cybersecurity',
    year: 2,
    hasFaceData: false
  },
];

// Empty attendance records to start
export const attendanceRecords: AttendanceRecord[] = [];

export const upcomingClasses = [
  {
    id: '1',
    courseName: 'Advanced Algorithms',
    instructor: 'Dr. Alan Turing',
    time: '09:00 - 10:30',
    room: 'CS-301',
    day: 'Monday'
  },
  {
    id: '2',
    courseName: 'Web Development',
    instructor: 'Prof. Ada Lovelace',
    time: '11:00 - 12:30',
    room: 'CS-205',
    day: 'Monday'
  },
  {
    id: '3',
    courseName: 'Machine Learning',
    instructor: 'Dr. Andrew Ng',
    time: '14:00 - 15:30',
    room: 'CS-402',
    day: 'Tuesday'
  },
];

export const courseList = [
  'Advanced Algorithms',
  'Web Development',
  'Machine Learning',
  'Database Systems',
  'Computer Networks',
  'Operating Systems',
  'Software Engineering',
  'Artificial Intelligence',
  'Data Science',
  'Cybersecurity'
];

export const enrollmentRequests: EnrollmentRequest[] = [
  {
    id: '1',
    studentName: 'John Doe',
    studentEmail: 'john.doe@college.edu',
    courseId: 'CS101',
    courseName: 'Advanced Algorithms',
    requestDate: '2025-05-14',
    status: 'pending'
  },
  {
    id: '2',
    studentName: 'John Doe',
    studentEmail: 'john.doe@college.edu',
    courseId: 'CS205',
    courseName: 'Web Development',
    requestDate: '2025-05-13',
    status: 'approved'
  },
  {
    id: '3',
    studentName: 'Michael Brown',
    studentEmail: 'michael.b@student.edu',
    courseId: 'CS302',
    courseName: 'Machine Learning',
    requestDate: '2025-05-12',
    status: 'approved'
  },
  {
    id: '4',
    studentName: 'Emma Davis',
    studentEmail: 'emma.d@student.edu',
    courseId: 'CS401',
    courseName: 'Database Systems',
    requestDate: '2025-05-10',
    status: 'rejected'
  }
];

// Helper function to add a new enrollment request
export const addEnrollmentRequest = (
  studentName: string,
  studentEmail: string,
  courseName: string
): EnrollmentRequest => {
  const newRequest: EnrollmentRequest = {
    id: `${Date.now()}`, // Generate a unique ID
    studentName,
    studentEmail,
    courseId: courseName.substring(0, 2).toUpperCase() + Math.floor(Math.random() * 900 + 100),
    courseName,
    requestDate: new Date().toISOString().split('T')[0],
    status: 'pending'
  };
  
  enrollmentRequests.push(newRequest);
  return newRequest;
};

// Helper function to update an enrollment request status
export const updateEnrollmentRequestStatus = (
  requestId: string,
  status: 'pending' | 'approved' | 'rejected'
): EnrollmentRequest | undefined => {
  const request = enrollmentRequests.find(req => req.id === requestId);
  
  if (request) {
    request.status = status;
  }
  
  return request;
};
