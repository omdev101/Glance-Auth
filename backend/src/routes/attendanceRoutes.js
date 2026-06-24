const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { admin, student } = require('../middleware/role');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { recognizeFace } = require('../services/faceRecognition');

/**
 * @route POST /api/attendance/recognize-face
 * @desc Recognize a face from an image
 * @access Private (Admin only)
 */
router.post('/recognize-face', auth, admin, async (req, res) => {
  try {
    const { image, date } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Call face recognition service
    const result = await recognizeFace(image);
    
    if (!result.recognized) {
      return res.json({
        recognized: false,
        message: 'No recognized face found'
      });
    }
    
    // Get student details
    const student = await User.findById(result.userId).select('-password');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get student profile for additional details
    const studentProfile = await StudentProfile.findOne({ user_id: student._id });
    
    // Check if attendance already marked for today
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const existingAttendance = await Attendance.findOne({
      student_id: student._id,
      date: attendanceDate
    });
    
    return res.json({
      recognized: true,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        registration_number: studentProfile ? studentProfile.registration_number : 'Unknown',
        profile_photo: studentProfile ? studentProfile.profile_photo : null
      },
      already_marked: !!existingAttendance
    });
    
  } catch (error) {
    console.error('Face recognition error:', error);
    return res.status(500).json({ error: 'Error recognizing face' });
  }
});

/**
 * @route POST /api/attendance/mark
 * @desc Mark attendance for a student
 * @access Private (Admin only)
 */
router.post('/mark', auth, admin, async (req, res) => {
  try {
    const { student_id, date, status } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if student exists
    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Format date (use today if not provided)
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    
    // Check if attendance already marked
    const existingAttendance = await Attendance.findOne({
      student_id,
      date: attendanceDate
    });
    
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status || 'present';
      existingAttendance.marked_by = req.user.id;
      existingAttendance.updated_at = Date.now();
      
      await existingAttendance.save();
      
      return res.json({
        message: 'Attendance updated successfully',
        attendance: existingAttendance
      });
    }
    
    // Create new attendance record
    const newAttendance = new Attendance({
      student_id,
      date: attendanceDate,
      status: status || 'present',
      marked_by: req.user.id
    });
    
    await newAttendance.save();
    
    return res.json({
      message: 'Attendance marked successfully',
      attendance: newAttendance
    });
    
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({ error: 'Error marking attendance' });
  }
});

/**
 * @route GET /api/attendance/logs
 * @desc Get attendance logs with optional filters
 * @access Private (Admin only)
 */
router.get('/logs', auth, admin, async (req, res) => {
  try {
    const { date, student_id, course_id } = req.query;
    
    // Build filter query
    const filter = {};
    
    if (date) {
      filter.date = date;
    }
    
    if (student_id) {
      filter.student_id = student_id;
    }
    
    // If course_id is provided, find all students in that course
    if (course_id) {
      // This assumes there's a relationship between students and courses
      // This implementation will depend on your data model
      const studentsInCourse = await StudentProfile.find({ course: course_id })
        .select('user_id');
      
      const studentIds = studentsInCourse.map(s => s.user_id);
      filter.student_id = { $in: studentIds };
    }
    
    // Get attendance logs with populated user data
    const logs = await Attendance.find(filter)
      .populate({
        path: 'student_id',
        select: 'name email',
        model: 'User'
      })
      .populate({
        path: 'marked_by',
        select: 'name',
        model: 'User'
      })
      .sort({ date: -1, created_at: -1 });
    
    return res.json(logs);
    
  } catch (error) {
    console.error('Get attendance logs error:', error);
    return res.status(500).json({ error: 'Error fetching attendance logs' });
  }
});

/**
 * @route GET /api/attendance/reports
 * @desc Generate attendance reports
 * @access Private (Admin only)
 */
router.get('/reports', auth, admin, async (req, res) => {
  try {
    // Implementation will depend on specific reporting requirements
    // This is a placeholder
    return res.json({
      message: 'Attendance reports feature coming soon'
    });
  } catch (error) {
    console.error('Get attendance reports error:', error);
    return res.status(500).json({ error: 'Error generating attendance reports' });
  }
});

module.exports = router; 