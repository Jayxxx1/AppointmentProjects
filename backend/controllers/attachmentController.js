import mongoose from 'mongoose';
import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';

export const listAttachments = async (req, res, next) => {
  try {
    const { ownerType, ownerId } = req.params;
    const allowed = ['project','appointment'];
    if (!allowed.includes(ownerType) || !mongoose.Types.ObjectId.isValid(String(ownerId || ''))) {
      return res.status(400).json({ message: 'พารามิเตอร์ไม่ถูกต้อง' });
    }
    const q = { ownerType, ownerId: new mongoose.Types.ObjectId(ownerId) };
    const items = await Attachment.find(q).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) { next(err); }
};

export const uploadAttachments = async (req, res, next) => {
  try {
    const { ownerType, ownerId } = req.params;
    if (!['project','appointment'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType ไม่ถูกต้อง' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(ownerId || ''))) {
      return res.status(400).json({ message: 'ownerId ไม่ถูกต้อง' });
    }
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: 'ไม่พบไฟล์อัปโหลด' });
    }

    const bucket = getBucket();
    const results = [];
    for (const f of req.files) {
      const up = bucket.openUploadStream(f.originalname, {
        contentType: f.mimetype,
        metadata: { ownerType, ownerId: new mongoose.Types.ObjectId(ownerId) },
      });
      up.end(f.buffer);
      const fileId = await new Promise((resolve, reject) => {
        up.on('finish', () => resolve(up.id));
        up.on('error', reject);
      });

      const doc = await Attachment.create({
        ownerType,
        ownerId,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        gridFsFileId: fileId,
        uploadedBy: req.user.id,
        expireAt: ownerType === 'appointment' ? new Date(Date.now()+7*24*60*60*1000) : undefined,
      });
      results.push(doc);
    }
    res.status(201).json({ uploaded: results.length, items: results });
  } catch (err) { next(err); }
};

export const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const at = await Attachment.findById(id).lean();
    if (!at) return res.status(404).json({ message: 'ไม่พบไฟล์' });
    const bucket = getBucket();
    res.setHeader('Content-Type', at.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(at.originalName)}"`);
    const stream = bucket.openDownloadStream(at.gridFsFileId);
    stream.on('error', next);
    stream.pipe(res);
  } catch (err) { next(err); }
};
