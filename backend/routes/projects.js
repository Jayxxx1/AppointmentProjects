import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';
import {
  createProject,
  listMyProjects,
  listAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  searchUsers,
  addMembers,
  removeMembers,
} from '../controllers/projectController.js';

const router = express.Router();

router.use(protect);

// รายการของฉัน
router.get('/mine', listMyProjects);

// Admin: list all projects
router.get('/', requireRole('admin'), listAllProjects);

// สร้างโปรเจค (รองรับไฟล์)
router.post('/', upload.array('files', 20), createProject);

// ค้นหาผู้ใช้สำหรับเพิ่มสมาชิก
router.get('/search-users', searchUsers);

// เพิ่ม/ลบสมาชิก
router.patch('/:id/members/add', addMembers);
router.patch('/:id/members/remove', removeMembers);

// รายการเดี่ยว / แก้ไข / ลบ (แก้ไขรองรับไฟล์)
router.get('/:id', getProjectById);
router.patch('/:id', upload.array('files', 20), updateProject);
router.delete('/:id', deleteProject);

export default router;
