import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'กรุณากรอกชื่อโปรเจค'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, 'กรุณาระบุปีการศึกษา เช่น 2567'],
      trim: true,
      index: true,
      match: [/^\d{4}$/, 'ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2567'],
      validate: {
        validator: function(v) {
          const year = parseInt(v, 10);
          return !isNaN(year) && year >= 2567 && year <= 2570;
        },
        message: 'ปีต่ำไปกว่าที่กำหนด (2567-2570)', //error แสดงใน frontend แล้วจ้า
      }
    },
    files: [
      {
        type: String,
        trim: true,
      },
    ],
    advisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // status: {
    //   type: String,
    //   enum: ['active', 'archived'],
    //   default: 'active',
    //   index: true,
    // },
  },
  { timestamps: true }
);

// ค้นหาด้วยชื่อและผู้สร้าง, ปีการศึกษา
projectSchema.index({ name: 1, createdBy: 1 });
projectSchema.index({ createdBy: 1, academicYear: 1 });

export default mongoose.model('Project', projectSchema);
