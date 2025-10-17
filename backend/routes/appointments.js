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
  // **[NEW]** Import new controller functions
  updateAppointmentStatus,
  requestReschedule,
  respondToReschedule,
  checkAvailability,
} from "../controllers/appointmentController.js";

const router = express.Router();

// All routes require login
router.use(protect);

// Admin route to get all appointments
router.get("/all", requireRole("admin"), getAllAppointments);

// User routes for their own appointments
router.get("/mine", getMyAppointments);
router.get("/", getMyAppointments);

// Quick availability check for frontend (must be before '/:id' param routes)
router.get('/check-availability', checkAvailability);

// Get a single appointment by ID
router.get("/:id", getAppointmentById);

// Create a new appointment
router.post("/", upload.array("files", 20), createAppointment);

// Update appointment details (title, description etc.)
router.patch("/:id", upload.array("files", 20), updateAppointment);

// **[NEW ROUTES FOR STATUS MANAGEMENT]**

// Route for advisor to approve/reject or student to cancel
router.patch("/:id/status", updateAppointmentStatus);

// Route for advisor to request a reschedule
router.post("/:id/reschedule-request", requestReschedule);

// Route for student to accept/decline a reschedule request
router.post("/:id/reschedule-response", respondToReschedule);

// Admin-only permanent delete
router.delete('/:id', requireRole('admin'), deleteAppointment);

// Quick availability check for frontend
router.get('/check-availability', checkAvailability);


export default router;
