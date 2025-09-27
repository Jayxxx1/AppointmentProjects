import multer from 'multer';
import path from 'path';

const ACCEPT = new Set([
  '.pdf','.doc','.docx','.xls','.xlsx','.txt','.csv',
  '.png','.jpg','.jpeg','.gif','.zip','.rar','.ics',
  '.ppt','.pptx'
]);
const BLOCK = new Set(['.exe','.bat','.cmd','.sh','.js','.msi','.com','.dll']);

function fileFilter(req, file, cb) {
  try {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (BLOCK.has(ext)) return cb(new Error('ชนิดไฟล์นี้ไม่ได้รับอนุญาต'));
    if (!ACCEPT.has(ext)) return cb(new Error('ชนิดไฟล์ไม่รองรับ'));
    cb(null, true);
  } catch (e) { cb(e); }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter
});
