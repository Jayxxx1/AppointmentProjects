import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// ===== เดิม: สร้างอาจารย์ =====
export const createTeacher = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'username, email, password required' });

  // Enforce minimum password length for teacher accounts.
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already in use' });

  const hash = await bcrypt.hash(password, 10);
  const teacher = await User.create({ username, email, password: hash, role: 'teacher' });
  res.status(201).json({ _id: teacher._id, username: teacher.username, email: teacher.email, role: teacher.role });
};

// ===== เดิม: ลิสต์อาจารย์ =====
export const listTeachersAdmin = async (req, res) => {
  const { q } = req.query;
  const filter = { role: 'teacher' };
  if (q) {
    // Escape regex special characters to treat the search string literally
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { username: { $regex: escaped, $options: 'i' } },
      { email:    { $regex: escaped, $options: 'i' } },
    ];
  }
  const items = await User.find(filter).select('_id username email role').sort({ username: 1 });
  res.json(items);
};

// ===== เดิม: ตั้ง role แบบเฉพาะคน =====
export const setRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['student','teacher','admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('_id username email role');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

// ===== ใหม่: ลิสต์ผู้ใช้ทั้งหมด + ค้นหา/กรอง =====
export const listAllUsers = async (req, res) => {
  const { q = "", role } = req.query;
  const filter = {};
  if (role && ['student','teacher','admin'].includes(role)) filter.role = role;
  if (q && q.trim()) {
    // Escape regex special characters to treat the query as a literal string rather than a pattern.  This
    // prevents users from injecting regex expressions which could cause performance issues or match
    // unintended patterns.
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kw = new RegExp(escaped, 'i');
    filter.$or = [{ username: kw }, { email: kw }, { fullName: kw }];
  }
  const items = await User.find(filter)
    .sort({ createdAt: -1 })
    .select('_id username email role fullName studentId status createdAt');
  res.json(items);
};

// ===== ใหม่: สร้างผู้ใช้กำหนด role =====
export const createUserAdmin = async (req, res) => {
  const { username, email, password, role, fullName, studentId } = req.body || {};
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'username, email, password, role required' });
  }

  // Enforce a minimum password length.  Weak or short passwords can compromise security.
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }
  if (!['student','teacher','admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (role === 'student' && !studentId) {
    return res.status(400).json({ message: 'studentId required for role=student' });
  }

  // Ensure studentId, if provided for student role, is exactly a 10-digit numeric string.  
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

//  ลบผู้ใช้ (กันลบ admin) =====
export const deleteUserAdmin = async (req, res) => {
  const { id } = req.params;

  // กันลบตัวเอง (ถ้ามี req.user)
  if (req.user && String(req.user.id) === String(id)) {
    return res.status(400).json({ message: 'cannot delete yourself' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ message: 'cannot delete admin' });

  await user.deleteOne();
  res.json({ message: 'deleted' });
};
