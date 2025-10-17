import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = { role: 'teacher' };
  if (q) filter.$or = [
    { username: { $regex: q, $options: 'i' } },
    { email:    { $regex: q, $options: 'i' } },
  ];
  const items = await User.find(filter).select('_id username email').sort({ username: 1 });
  res.json(items);
});

export default router;
