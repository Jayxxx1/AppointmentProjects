import mongoose from 'mongoose';

// โครงสร้างสำหรับเก็บข้อมูลการขอเลื่อนนัดหมาย
const rescheduleSchema = new mongoose.Schema({
  proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, trim: true },
  date: { type: String, required: true },       // YYYY-MM-DD
  startTime: { type: String, required: true },       // HH:mm
  endTime: { type: String, required: true },       // HH:mm
  startAt: { type: Date, required: true },         // absolute start time
  endAt: { type: Date, required: true },         // absolute end time
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const appointmentSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  reason: { type: String, trim: true },
  date: { type: String, required: true },      // YYYY-MM-DD
  startTime: { type: String, required: true },      // HH:mm
  endTime: { type: String, required: true },      // HH:mm
  startAt: { type: Date, index: true },           // computed at create/update
  endAt: { type: Date, index: true },

  meetingType: { type: String, enum: ['online', 'offline'], default: 'online' },
  location: { type: String, trim: true, default: '' },
  meetingNotes: { type: String, trim: true, default: '' },

  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'reschedule_requested', 'rejected', 'cancelled', 'expired', 'completed'],
    default: 'pending',
    index: true,
  },

  // Field ใหม่สำหรับเก็บข้อมูลการขอเลื่อนนัด
  reschedule: { type: rescheduleSchema, default: null },

  // Field ใหม่สำหรับเช็คว่าส่งอีเมลแจ้งเตือนไปแล้วหรือยัง
  reminderSent: { type: Boolean, default: false },

  activity: [
    {
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String },
      note: { type: String },
    },
  ],
}, { timestamps: true });

appointmentSchema.index({ project: 1, startAt: 1, endAt: 1, status: 1 });

appointmentSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    return next(new Error('เวลาเริ่ม ไม่ควรน้อยกว่า เวลาสิ้นสุด !'));
  }
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
