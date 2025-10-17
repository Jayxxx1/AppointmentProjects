import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';
import { listAttachments, uploadAttachments, downloadAttachment, deleteAttachment } from '../controllers/attachmentController.js';

const router = express.Router();
router.use(protect);

// Download and delete routes should come before the dynamic ownerType/ownerId
// routes. Otherwise the `:ownerType/:ownerId` pattern will match "download"
// as ownerType, causing 400 responses when trying to download an attachment.
router.get('/download/:id', downloadAttachment);
router.delete('/:id', deleteAttachment);

// Routes for listing and uploading attachments by owner
router.get('/:ownerType/:ownerId', listAttachments);
router.post('/:ownerType/:ownerId', upload.array('files', 10), uploadAttachments);

export default router;