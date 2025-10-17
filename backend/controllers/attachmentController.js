import mongoose from 'mongoose';
import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';
import MeetingSummary from '../models/MeetingSummary.js';
import Appointment from '../models/Appointment.js';
import Project from '../models/Project.js';

export const listAttachments = async (req, res, next) => {
  try {
    const { ownerType, ownerId } = req.params;
  const allowed = ['project','appointment','meetingSummary'];
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
  if (!['project','appointment','meetingSummary'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType ไม่ถูกต้อง' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(ownerId || ''))) {
      return res.status(400).json({ message: 'ownerId ไม่ถูกต้อง' });
    }
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: 'ไม่พบไฟล์อัปโหลด' });
    }

    // Authorization checks per ownerType
    if (ownerType === 'meetingSummary') {
      const ms = await MeetingSummary.findById(ownerId).populate('project');
      if (!ms) return res.status(404).json({ message: 'ไม่พบสรุปการประชุม' });
      const isCreator = String(ms.createdBy) === String(req.user.id);
      const isAdvisor = ms.project && String(ms.project.advisor) === String(req.user.id);
      if (!(isCreator || isAdvisor || req.user.role === 'admin')) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์แนบไฟล์สำหรับสรุปการประชุมนี้' });
      }
    } else if (ownerType === 'appointment') {
      const ap = await Appointment.findById(ownerId).populate('project');
      if (!ap) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });
      const isCreator = String(ap.createBy) === String(req.user.id);
      const isAdvisor = ap.project && String(ap.project.advisor) === String(req.user.id);
      const isMember = Array.isArray(ap.project?.members) && ap.project.members.some(m => String(m) === String(req.user.id));
      if (!(isCreator || isAdvisor || isMember || req.user.role === 'admin')) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์แนบไฟล์สำหรับนัดหมายนี้' });
      }
    } else if (ownerType === 'project') {
      const proj = await Project.findById(ownerId);
      if (!proj) return res.status(404).json({ message: 'ไม่พบโปรเจค' });
      const isMember = Array.isArray(proj.members) && proj.members.some(m => String(m) === String(req.user.id));
      const isAdvisor = String(proj.advisor) === String(req.user.id);
      if (!(isMember || isAdvisor || req.user.role === 'admin')) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์แนบไฟล์สำหรับโปรเจคนี้' });
      }
    }

    const bucket = getBucket();
    const results = [];
    // cast ownerId once
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    // We'll keep track of created attachments to cleanup on failure
    const createdAttachments = [];

    for (const f of req.files) {
      try {
        const up = bucket.openUploadStream(f.originalname, {
          contentType: f.mimetype,
          metadata: { ownerType, ownerId: ownerObjectId },
        });
        up.end(f.buffer);
        const fileId = await new Promise((resolve, reject) => {
          up.on('finish', () => resolve(up.id));
          up.on('error', reject);
        });

        const doc = await Attachment.create({
          ownerType,
          ownerId: ownerObjectId,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          gridFsFileId: fileId,
          uploadedBy: req.user.id,
          expireAt: ownerType === 'appointment' ? new Date(Date.now()+7*24*60*60*1000) : undefined,
        });
        results.push(doc);
        createdAttachments.push({ attachment: doc, gridFsId: fileId });
      } catch (fileErr) {
        // cleanup any created attachments and their GridFS files
        console.error('Upload single file failed, cleaning up created files:', fileErr?.message || fileErr);
        try {
          for (const ca of createdAttachments) {
            try {
              if (ca.gridFsId) await bucket.delete(ca.gridFsId);
            } catch (gfsDelErr) {
              console.error('Failed to delete gridfs file during cleanup:', gfsDelErr?.message || gfsDelErr);
            }
            try { await Attachment.findByIdAndDelete(ca.attachment._id).exec(); } catch (delAttErr) { console.error('Failed to delete attachment doc during cleanup:', delAttErr); }
          }
        } catch (cleanupErr) {
          console.error('Cleanup after upload failure failed:', cleanupErr);
        }
        return res.status(500).json({ message: 'อัปโหลดไฟล์ล้มเหลว', detail: fileErr?.message || String(fileErr) });
      }
    }
    // If uploading attachments for a MeetingSummary, push the attachment ids into the MeetingSummary.attachments array
    try {
      if (ownerType === 'meetingSummary' && results.length) {
        const ids = results.map(r => r._id);
        // ensure we push ObjectIds
        await MeetingSummary.findByIdAndUpdate(ownerObjectId, { $push: { attachments: { $each: ids } } }).exec();
      }
    } catch (updErr) {
      console.error('Update MeetingSummary attachments failed:', updErr?.message || updErr);
    }
    res.status(201).json({ uploaded: results.length, items: results });
  } catch (err) { next(err); }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id || ''))) return res.status(400).json({ message: 'id ไม่ถูกต้อง' });
    const at = await Attachment.findById(id);
    if (!at) return res.status(404).json({ message: 'ไม่พบไฟล์' });

    // Authorization: uploader, meeting summary creator/advisor/project members/admin
    const ownerType = at.ownerType;
    const ownerId = at.ownerId;
    let allowed = false;
    if (String(at.uploadedBy) === String(req.user.id)) allowed = true;
    if (req.user.role === 'admin') allowed = true;

    if (!allowed) {
      if (ownerType === 'meetingSummary') {
        const ms = await MeetingSummary.findById(ownerId).populate('project');
        if (ms && (String(ms.createdBy) === String(req.user.id) || (ms.project && String(ms.project.advisor) === String(req.user.id)))) allowed = true;
      } else if (ownerType === 'appointment') {
        const ap = await Appointment.findById(ownerId).populate('project');
        if (ap && (String(ap.createBy) === String(req.user.id) || (ap.project && String(ap.project.advisor) === String(req.user.id)) || (Array.isArray(ap.project?.members) && ap.project.members.some(m => String(m) === String(req.user.id))))) allowed = true;
      } else if (ownerType === 'project') {
        const proj = await Project.findById(ownerId);
        if (proj && (String(proj.advisor) === String(req.user.id) || (Array.isArray(proj.members) && proj.members.some(m => String(m) === String(req.user.id))))) allowed = true;
      }
    }

    if (!allowed) return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบไฟล์นี้' });

    // delete GridFS file
    try {
      const bucket = getBucket();
      if (at.gridFsFileId) await bucket.delete(at.gridFsFileId);
    } catch (gfsErr) {
      console.error('GridFS delete failed:', gfsErr?.message || gfsErr);
    }

    // remove reference from meeting summary if needed
    try {
      if (ownerType === 'meetingSummary') {
        await MeetingSummary.findByIdAndUpdate(ownerId, { $pull: { attachments: at._id } }).exec();
      }
    } catch (updErr) {
      console.error('Remove attachment id from owner failed:', updErr?.message || updErr);
    }

    await at.remove();
    res.json({ deleted: true });
  } catch (err) { next(err); }
};

export const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id || ''))) return res.status(400).json({ message: 'id ไม่ถูกต้อง' });
    const at = await Attachment.findById(id).lean();
    if (!at) return res.status(404).json({ message: 'ไม่พบไฟล์แนบ' });
    const bucket = getBucket();
    if (!at.gridFsFileId) return res.status(404).json({ message: 'ไฟล์ที่เก็บอยู่บนเซิร์ฟเวอร์หายไป' });
    res.setHeader('Content-Type', at.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(at.originalName)}"`);
    const stream = bucket.openDownloadStream(at.gridFsFileId);
    stream.on('error', (err) => {
      console.error('GridFS download error:', err?.message || err);
      // If file not found in GridFS, send 404
      if (String(err?.message || '').toLowerCase().includes('file not found')) return res.status(404).json({ message: 'ไม่พบไฟล์บน GridFS' });
      next(err);
    });
    stream.pipe(res);
  } catch (err) { next(err); }
};
