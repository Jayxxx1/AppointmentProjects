import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

// ต้องล็อกอินก่อน
router.use(protect);

// ทั้งระบบ (เฉพาะแอดมิน)
router.get("/all", requireRole("admin"), getAllAppointments);

// ของฉัน
router.get("/mine", getMyAppointments);   // ✅ ให้ตรงกับ service
router.get("/", getMyAppointments);

// รายการเดี่ยว
router.get("/:id", getAppointmentById);

// สร้าง/แก้ไข (รองรับแนบไฟล์)
router.post("/", upload.array("files", 20), createAppointment);
router.patch("/:id", upload.array("files", 20), updateAppointment);

// ลบ
router.delete("/:id", deleteAppointment);

export default router;
