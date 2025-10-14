import mongoose from 'mongoose';
// ใช้เก็บบันทึกการประชุมหรือสรุปหลังนัดหมายเสร็จสิ้น
const meetingSummarySchema = new mongoose.Schema(
  {
    // อ้างอิงนัดหมายที่สรุปถึง
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
        index: true,
    },
    // โปรเจคที่เกี่ยวข้อง 
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    // รายละเอียดสรุปการประชุม
    summary: {
      type: String,
      required: [true, 'กรุณากรอกสรุปการประชุม'],
      trim: true,
    },
    // งานที่มอบหมายหลังการประชุม
    homework: {
      type: String,
      trim: true,
    },
    // วันที่นัดหมายครั้งถัดไป ถ้ามีอะนะ
    nextMeetingDate: {
      type: Date,
      default: undefined,
    },
    // แนบไฟล์ที่เกี่ยวข้องกับสรุปการประชุม (อ้างอิง Attachment collection)
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
    // ผู้ที่สร้างสรุป (เช่น นักศึกษา หรืออาจารย์)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a single MeetingSummary per appointment at the database level
meetingSummarySchema.index({ appointment: 1 }, { unique: true });

export default mongoose.model('MeetingSummary', meetingSummarySchema);