import mongoose from 'mongoose';

// Define a sub-schema for reschedule requests.  When a meeting is approved and either
// party wants to propose a new time, we create an embedded document under the
// `reschedule` field.  This holds the proposed range and reason so that the
// other party can accept or counter-propose.  The `_id` is disabled because
// there will be at most one pending reschedule at any given time.
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

  // Related project
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantEmails: [{ type: String, trim: true }],

  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Status lifecycle: pending → approved → reschedule_requested → approved, or rejected/cancelled
  status: {
    type: String,
    enum: ['pending', 'approved', 'reschedule_requested', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },

  // Embedded reschedule request (null when none pending)
  reschedule: { type: rescheduleSchema, default: null },

  // Activity log for auditing actions on this appointment
  activity: [
    {
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String },
      note: { type: String },
    },
  ],
}, { timestamps: true });

// Index for fast lookup by project and date range.  We also include status in the
// index so that queries filtering out cancelled or rejected appointments remain
// efficient when checking for conflicts.
appointmentSchema.index({ project: 1, startAt: 1, endAt: 1, status: 1 });
appointmentSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    return next(new Error('เวลาเริ่ม ไม่ควรน้อยกว่า เวลาสิ้นสุด !'));
  }
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
