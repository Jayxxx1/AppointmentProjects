import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * PATCH /api/users/me
 * Update current user's profile (no role changes allowed)
 */
router.patch('/me', protect, async (req, res, next) => {
  try {
    const id = req.user?.id || req.user?._id;
    if (!id) return res.status(401).json({ message: 'ไม่พบผู้ใช้' });

    const updates = req.body || {};

    // Disallow role changes from this endpoint
    if (updates.role) return res.status(403).json({ message: 'ไม่อนุญาตให้เปลี่ยนบทบาท' });

    // Validate studentId if provided
    if (updates.studentId !== undefined) {
      const sidStr = String(updates.studentId).trim();
      if (sidStr && !/^\d{10}$/.test(sidStr)) {
        return res.status(400).json({ message: 'studentId ต้องเป็นตัวเลข 10 หลัก' });
      }
      // Check duplicate studentId
      if (sidStr) {
        const dup = await User.findOne({ studentId: sidStr, _id: { $ne: id } });
        if (dup) return res.status(409).json({ message: 'รหัสนักศึกษาไม่สามารถซ้ำได้ !' });
      }
      updates.studentId = sidStr || undefined;
    }

    // If updating password enforce length and hash
    if (updates.password !== undefined) {
      const pwd = String(updates.password);
      if (pwd && pwd.length < 6) {
        return res.status(400).json({ message: 'password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
      }
      if (pwd) updates.password = await bcrypt.hash(pwd, 10);
      else delete updates.password;
    }

    // Trim fields
    if (updates.username !== undefined) updates.username = String(updates.username).trim();
    if (updates.email !== undefined) updates.email = String(updates.email).trim();
    if (updates.fullName !== undefined) updates.fullName = String(updates.fullName).trim();

    // Check duplicates for username/email
    if (updates.username) {
      const dup = await User.findOne({ username: updates.username, _id: { $ne: id } });
      if (dup) return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }
    if (updates.email) {
      const dup = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (dup) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true })
      .select('_id username email role fullName studentId createdAt');

    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
