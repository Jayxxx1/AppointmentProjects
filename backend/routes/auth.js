import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, role, studentId, fullName = '' } = req.body;
  // ตรวจสอบข้อมูลเบื้องต้น
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่านให้ครบถ้วน' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }
  // กำหนดบทบาท: ถ้าไม่ระบุถือว่าเป็น student
  const userRole = role || 'student';
  // ไม่อนุญาตให้สมัครเป็น teacher หรือ admin ด้วยตนเอง
  if (userRole !== 'student') {
    return res.status(403).json({ message: 'ไม่สามารถสมัครบทบาทนี้ได้ กรุณาติดต่อผู้ดูแลระบบ' });
  }
  // นักศึกษาต้องมี studentId และต้องเป็นตัวเลข 10 หลัก
  if (userRole === 'student') {
    if (!studentId) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสนักศึกษา' });
    }
    const idStr = String(studentId).trim();
    if (!/^\d{10}$/.test(idStr)) {
      return res.status(400).json({ message: 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก' });
    }
  }
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }
    // ตรวจสอบ studentId ซ้ำสำหรับนักศึกษา
    if (userRole === 'student' && await User.findOne({ studentId })) {
      return res.status(400).json({ message: 'รหัสนักศึกษานี้ถูกใช้งานแล้ว' });
    }
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newUser = await User.create({
      username,
      email,
      password: hashed,
      role: userRole,
      studentId: userRole === 'student' ? studentId : undefined,
      fullName: fullName.trim() || '',
    });
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName || '',
        studentId: newUser.studentId || null,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Register error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์', error: error.message });
  }
});


// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });
  }

  try {
    const user = await User.findOne({ email });
    // console.log('Raw login body:', JSON.stringify(req.body));
    // console.log('Password from client:', JSON.stringify(password));
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // console.log('User found:', user);
      // console.log('Comparing password:', password, '=>', user.password);
      // console.log('Compare result:', await bcrypt.compare(password, user.password));
      return res
        .status(401)
        .json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '99d',
    });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName || '',
        studentId: user.studentId || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res
      .status(500)
      .json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์', error: error.message });
  }
});

export default router;
