import express from "express";
import bcrypt from "bcryptjs";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

// ต้องล็อกอินและเป็น admin เท่านั้น
router.use(protect, requireRole("admin"));

/** GET /api/admin/users?q=&role= */
router.get("/users", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const role = (req.query.role || "").trim();

    const cond = {};
    if (role && ["admin", "teacher", "student"].includes(role)) cond.role = role;
    if (q) {
      // Escape regex special characters to avoid regex injection and treat the search query as literal text.
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, "i");
      cond.$or = [{ username: re }, { email: re }, { fullName: re }];
    }

    const list = await User.find(cond)
      .select("_id username email role fullName studentId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (e) { next(e); }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const u = await User.findById(id);
    if (!u) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    // กันลบผู้ดูแลระบบ
    if (u.role === "admin") {
      return res.status(400).json({ message: "ไม่อนุญาตให้ลบผู้ดูแลระบบ" });
    }

    await u.deleteOne();
    res.json({ message: "ลบผู้ใช้แล้ว" });
  } catch (e) {
    next(e);
  }
});

/** POST /api/admin/users */
router.post("/users", async (req, res, next) => {
  try {
    const { username, email, password, role, fullName, studentId } = req.body || {};
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "กรอกข้อมูลให้ครบ (username, email, password, role)" });
    }
    // Trim and normalize basic fields
    const uname = String(username).trim();
    const mail  = String(email).trim();
    const pwd   = String(password);
    const r     = String(role).toLowerCase();

    // Validate role
    if (!["admin", "teacher", "student"].includes(r)) {
      return res.status(400).json({ message: "role ไม่ถูกต้อง" });
    }
    // Validate password strength
    if (pwd.length < 6) {
      return res.status(400).json({ message: "password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
    }
    // Validate studentId when role is student
    if (r === "student") {
      if (!studentId) {
        return res.status(400).json({ message: "role=student ต้องกรอก studentId" });
      }
      const sidStr = String(studentId).trim();
      if (!/^\d{10}$/.test(sidStr)) {
        return res.status(400).json({ message: "studentId ต้องเป็นตัวเลข 10 หลัก" });
      }
    }

    // Check duplicate username or email
    const dup = await User.findOne({ $or: [{ username: uname }, { email: mail }] });
    if (dup) return res.status(409).json({ message: "username หรือ email ถูกใช้แล้ว" });

    // Check duplicate studentId
    if (r === "student" && studentId) {
      const existingStu = await User.findOne({ studentId: String(studentId).trim() });
      if (existingStu) return res.status(409).json({ message: "รหัสนักศึกษาไม่สามารถซ้ำได้ !" });
    }

    const hash = await bcrypt.hash(pwd, 10);
    const doc = await User.create({
      username: uname,
      email: mail,
      password: hash,
      role: r,
      fullName: (fullName || "").trim(),
      studentId: r === "student" ? String(studentId).trim() : undefined,
    });

    res.status(201).json({
      _id: doc._id,
      username: doc.username,
      email: doc.email,
      role: doc.role,
      fullName: doc.fullName || "",
      studentId: doc.studentId || undefined,
      createdAt: doc.createdAt,
    });
  } catch (e) { next(e); }
});

/** GET /api/admin/teachers?q= */
router.get("/teachers", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const cond = { role: "teacher" };
    if (q) {
      // Escape regex special characters for literal matching
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cond.$or = [
        { username: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }
    const list = await User.find(cond).select("_id username email role").lean();
    res.json(list);
  } catch (e) { next(e); }
});

/** POST /api/admin/teachers */
router.post("/teachers", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "กรอกข้อมูลให้ครบ" });
    const uname = String(username).trim();
    const mail  = String(email).trim();
    const pwd   = String(password);
    // Enforce minimum password length for teacher accounts
    if (pwd.length < 6) {
      return res.status(400).json({ message: "password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
    }
    if (await User.findOne({ email: mail })) return res.status(409).json({ message: "อีเมลนี้ถูกใช้แล้ว" });
    const hash = await bcrypt.hash(pwd, 10);
    const u = await User.create({ username: uname, email: mail, password: hash, role: "teacher" });
    res.status(201).json({ _id: u._id, username: u.username, email: u.email, role: u.role });
  } catch (e) { next(e); }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    // Validate role if provided
    if (updates.role && !["admin", "teacher", "student"].includes(updates.role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Validate studentId pattern if provided
    if (updates.studentId !== undefined) {
      const sidStr = String(updates.studentId).trim();
      if (sidStr && !/^\d{10}$/.test(sidStr)) {
        return res.status(400).json({ message: "studentId ต้องเป็นตัวเลข 10 หลัก" });
      }
      // Check duplicate studentId
      if (sidStr) {
        const dupStu = await User.findOne({ studentId: sidStr, _id: { $ne: id } });
        if (dupStu) return res.status(409).json({ message: "รหัสนักศึกษาไม่สามารถซ้ำได้ !" });
      }
      updates.studentId = sidStr || undefined;
    }

    // If updating password enforce length and hash
    if (updates.password !== undefined) {
      const pwd = String(updates.password);
      if (pwd.length < 6) {
        return res.status(400).json({ message: "password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
      }
      updates.password = await bcrypt.hash(pwd, 10);
    }

    // Trim name and email if provided
    if (updates.username !== undefined) updates.username = String(updates.username).trim();
    if (updates.email !== undefined)    updates.email    = String(updates.email).trim();
    if (updates.fullName !== undefined) updates.fullName = String(updates.fullName).trim();

    const user = await User.findByIdAndUpdate(id, updates, { new: true })
      .select("_id username email role fullName studentId createdAt");

    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
