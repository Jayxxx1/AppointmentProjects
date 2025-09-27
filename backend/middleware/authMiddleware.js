import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization || '';
    let token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

    if (!token && req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded._id).select('_id username email role fullName studentId');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'student',
      fullName: user.fullName || '',
      studentId: user.studentId || null,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง !' });
  }
  next();
};
