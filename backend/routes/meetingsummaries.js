import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listMeetingSummaries, getMeetingSummaryById, updateMeetingSummary } from '../controllers/meetingSummaryController.js';

const router = express.Router();
router.use(protect);
router.get('/', listMeetingSummaries);
router.get('/:id', getMeetingSummaryById);
router.patch('/:id', updateMeetingSummary);

export default router;
