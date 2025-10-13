import fs from 'fs';
import { renderAppointmentEmail } from '../utils/emailTemplates.js';

const appointment = {
  _id: '64abcdef1234567890',
  project: { name: 'ตัวอย่างโปรเจกต์' },
  title: 'ประชุมทดสอบ',
  date: '2025-10-13',
  startTime: '10:00',
  endTime: '11:00',
  meetingType: 'online',
  description: 'บรรยายหัวข้อการทดลอง\nเตรียมสไลด์และข้อสงสัย',
  meetingNotes: 'นำสไลด์ 5 หน้า และ link การบ้าน',
  location: '',
};

const html = renderAppointmentEmail({ appointment, headline: 'ทดสอบอีเมลนัดหมาย', message: 'โปรดตรวจสอบรายละเอียดด้านล่าง' });

const outDir = 'backend/tmp';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/rendered_email.html`;
fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote', outPath);
