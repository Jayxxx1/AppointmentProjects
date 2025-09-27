import mongoose from 'mongoose';

// โครงสร้างข้อมูลสำหรับการแจ้งเตือน (Notification)
// สามารถใช้ในอนาคตเพื่อส่งข้อความหรือแจ้งเตือนผู้ใช้ภายในระบบ
const notificationSchema = new mongoose.Schema(
  {
    // ผู้รับการแจ้งเตือน
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // หัวข้อการแจ้งเตือน
    title: {
      type: String,
      required: [true, 'กรุณาระบุหัวข้อการแจ้งเตือน'],
      trim: true,
    },
    // เนื้อหาการแจ้งเตือน
    message: {
      type: String,
      trim: true,
      default: '',
    },
    // ระบุว่าอ่านแล้วหรือไม่
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);