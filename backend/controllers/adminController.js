import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// **[REFACTOR]** ลบโค้ดเก่าที่ไม่ได้ใช้งานออกทั้งหมด เหลือเฉพาะฟังก์ชันที่ export และใช้งานจริง

/**
 * @description List all users with filter and search
 * @route GET /api/admin/users
 * @access Private/Admin
 */
export const listAllUsers = async (req, res) => {
  const { q = "", role } = req.query;
  const filter = {};
  if (role && ['student','teacher','admin'].includes(role)) filter.role = role;
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kw = new RegExp(escaped, 'i');
    filter.$or = [{ username: kw }, { email: kw }, { fullName: kw }];
  }
  const items = await User.find(filter)
    .sort({ createdAt: -1 })
    .select('_id username email role fullName studentId status createdAt');
  res.json(items);
};

/**
 * @description Create a new user with a specific role
 * @route POST /api/admin/users
 * @access Private/Admin
 */
export const createUserAdmin = async (req, res) => {
  const { username, email, password, role, fullName, studentId } = req.body || {};
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'username, email, password, role required' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }
  if (!['student','teacher','admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (role === 'student' && !studentId) {
    return res.status(400).json({ message: 'studentId required for role=student' });
  }

  if (role === 'student' && studentId && !/^\d{10}$/.test(String(studentId).trim())) {
    return res.status(400).json({ message: 'studentId ต้องเป็นตัวเลข 10 หลัก' });
  }

  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) return res.status(409).json({ message: 'username or email already in use' });

  if (role === 'student' && studentId) {
    const stu = await User.findOne({ studentId });
    if (stu) return res.status(409).json({ message: 'studentId already in use' });
  }

  const hash = await bcrypt.hash(password, 10);
  const doc = await User.create({
    username, email, password: hash, role,
    fullName: fullName || '',
    studentId: role === 'student' ? studentId : undefined,
    status: 'active',
  });

  const safe = (({ _id, username, email, role, fullName, studentId, status, createdAt }) =>
    ({ _id, username, email, role, fullName, studentId, status, createdAt }))(doc);

  res.status(201).json(safe);
};

/**
 * @description Delete a user
 * @route DELETE /api/admin/users/:id
 * @access Private/Admin
 */
export const deleteUserAdmin = async (req, res) => {
  const { id } = req.params;

  if (req.user && String(req.user.id) === String(id)) {
    return res.status(400).json({ message: 'cannot delete yourself' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ message: 'cannot delete admin' });

  await user.deleteOne();
  res.json({ message: 'deleted' });
};

