import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';
import { listAttachments, uploadAttachments, downloadAttachment, deleteAttachment } from '../controllers/attachmentController.js';

const router = express.Router();
router.use(protect);
router.get('/:ownerType/:ownerId', listAttachments);
router.post('/:ownerType/:ownerId', upload.array('files', 10), uploadAttachments);
router.get('/download/:id', downloadAttachment);
router.delete('/:id', deleteAttachment);
export default router;