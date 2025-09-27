import mongoose from 'mongoose';

// โครงสร้างข้อมูลสำหรับสรุปการประชุม (MeetingSummary)
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
    // โปรเจคที่เกี่ยวข้อง (เพื่อค้นหาย้อนหลังได้ง่าย)
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
    // ผู้ที่สร้างสรุป (เช่น นักศึกษา หรืออาจารย์)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('MeetingSummary', meetingSummarySchema);