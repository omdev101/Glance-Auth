const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  student_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  marked_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  course_id: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  remarks: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure each student has only one attendance record per day
AttendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema); 