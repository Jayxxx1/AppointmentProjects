import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';
import Appointment from '../models/Appointment.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/mailer.js';
import { renderAppointmentCreatedEmail, buildIcs } from '../utils/emailTemplates.js';

const toDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00+07:00`);
const parseMaybeArray = (input) => {
  if (input == null) return [];
  if (Array.isArray(input)) return input;
  const s = String(input || '').trim();
  if (!s) return [];
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch { return []; } }
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const pickId = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '';
    if (
      (s.startsWith('{') && s.endsWith('}')) ||
      (s.startsWith('[') && s.endsWith(']')) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      try { return pickId(JSON.parse(s)); } catch { return s; }
    }
    return s;
  }
  if (Array.isArray(v)) return pickId(v[0]);
  if (typeof v === 'object') return pickId(v._id || v.id);
  return String(v || '');
};

/** สร้างนัดหมาย */
export const createAppointment = async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1) ดึงค่า project id ให้ได้ก่อน (ไม่ new ObjectId ตรงนี้)
    const projectStr = pickId(body.project ?? body.projectId);
    if (!projectStr) {
      return res.status(400).json({ message: 'กรุณาระบุโปรเจคที่ถูกต้อง' });
    }

    // 2) ดึงฟิลด์อื่น
    let {
      title,
      description = '',
      reason = '',
      date,
      startTime,
      endTime,
      meetingType = 'online',
      location = '',
      participants = [],
      participantEmails = [],
      status,
      meetingNotes = '',
    } = body;

    participants = parseMaybeArray(participants);
    participantEmails = parseMaybeArray(participantEmails);

    // 3) ตรวจเวลา
    const startAt = toDateTime(date, startTime);
    const endAt   = toDateTime(date, endTime);
    if (isNaN(startAt) || isNaN(endAt) || startAt >= endAt) {
      return res.status(400).json({ message: 'เวลาเริ่ม/สิ้นสุดไม่ถูกต้อง' });
    }
    if (startAt < new Date()) {
      return res.status(400).json({ message: 'ไม่สามารถสร้างนัดหมายในอดีตได้' });
    }

    // 4) ตรวจรูปแบบ meetingType + location
    const mType = String(meetingType || 'online').toLowerCase();
    if (!['online', 'offline'].includes(mType)) {
      return res.status(400).json({ message: 'meetingType ไม่ถูกต้อง' });
    }
    if (mType === 'offline' && !String(location || '').trim()) {
      return res.status(400).json({ message: 'กรุณาระบุสถานที่เมื่อ meetingType เป็น offline' });
    }

    // 5) ให้ Mongoose cast เองตอน query — ถ้า projectStr ไม่ valid จะเกิด CastError ซึ่งเราจับให้เป็น 400 สวยๆ
    let proj;
    try {
      proj = await Project.findById(projectStr).select('_id').lean();
    } catch (e) {
      return res.status(400).json({ message: 'กรุณาระบุโปรเจคที่ถูกต้อง' });
    }
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    // 6) กันช่วงเวลาทับซ้อน
    const overlap = await Appointment.findOne({
      project: projectStr,           // ← ส่งเป็นสตริงได้ Mongoose cast ให้
      startAt: { $lt: endAt },
      endAt:   { $gt: startAt },
    }).lean();
    if (overlap) return res.status(409).json({ message: 'ช่วงเวลานี้ถูกจองแล้ว' });

    const participantIds = Array.isArray(participants)
      ? participants.map(p => (typeof p === 'string' ? p : p?._id)).filter(Boolean)
      : [];

    const allowedStatus = ['pending','approved','reschedule_requested','rejected','cancelled'];
    const setStatus = status && allowedStatus.includes(status) ? status : 'pending';

    // 7) บันทึกนัดหมาย (ปล่อยให้ schema cast project เป็น ObjectId)
    let doc;
    try {
      doc = await Appointment.create({
        title,
        description,
        reason,
        date,
        startTime,
        endTime,
        startAt,
        endAt,
        meetingType: mType,
        location: location ? String(location).trim() : '',
        meetingNotes,
        status: setStatus,
        participantEmails,
        participants: participantIds,
  project: projectStr,       // ← ปล่อยให้ cast เอา
  createBy: req.user.id,
      });
    } catch (e) {
      // CastError: project invalid → ตอบกลับแบบเดิม
      if (e?.name === 'CastError' && e?.path === 'project') {
        return res.status(400).json({ message: 'กรุณาระบุโปรเจคที่ถูกต้อง' });
      }
      throw e;
    }

    // แนบไฟล์ (ถ้ามี) จาก req.files
     if (Array.isArray(req.files) && req.files.length) {
      const bucket = getBucket();
      for (const f of req.files) {
        const up = bucket.openUploadStream(f.originalname, {
          contentType: f.mimetype,
          metadata: { ownerType: 'appointment', ownerId: doc._id },
        });
        up.end(f.buffer);
        const fileId = await new Promise((resolve, reject) => {
          up.on('finish', () => resolve(up.id));
          up.on('error', reject);
        });
        await Attachment.create({
          ownerType: 'appointment',
          ownerId: doc._id,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          gridFsFileId: fileId,
    uploadedBy: req.user.id,
          expireAt: new Date(Date.now() + 7*24*60*60*1000),
        });
      }
    }

    const populated = await Appointment.findById(doc._id)
      .populate('participants', '_id username email role fullName studentId')
      .populate('createBy', '_id username email role fullName studentId')
      .populate({
        path: 'project',
        select: 'name advisor members academicYear',
        populate: [
          { path: 'advisor', select: '_id username email role fullName studentId' },
          { path: 'members', select: '_id username email role fullName studentId' },
        ],
      });

    // ส่งเมล (try/catch ป้องกันล้ม)
    try {
      const FE = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const detailUrl = `${FE}/appointments/${populated._id}`;
      const icsContent = buildIcs({
        title: populated.title || 'Appointment',
        description: populated.description || '',
        startAt: populated.startAt,
        endAt: populated.endAt,
        location: populated.meetingType === 'offline' ? (populated.location || '') : '',
        url: detailUrl,
      });

      const advisorEmail = populated?.project?.advisor?.email;
      const html = renderAppointmentCreatedEmail(populated, icsContent);
      if (advisorEmail) {
        await sendEmail({
          to: advisorEmail,
          subject: `การนัดหมายใหม่: ${populated.title}`,
          html,
          attachments: [
            {
              filename: `${(populated.title || 'appointment').replace(/[^\w.-]+/g, '_')}.ics`,
              content: icsContent,
              contentType: 'text/calendar; charset=UTF-8; method=PUBLISH',
            }
          ],
        });
      }
    } catch (mailErr) {
      console.error('Send email failed:', mailErr?.message || mailErr);
    }

    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
};

/** รายการของฉัน */
export const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const myProjectIds = await Project.find({
      $or: [{ members: userId }, { advisor: userId }],
    }).distinct('_id');

    const items = await Appointment.find({
      $or: [
        { createBy: userId },
        { participants: userId },
        { project: { $in: myProjectIds } },
      ],
    })
      .sort({ startAt: -1 })
      .populate('participants', '_id username email role fullName studentId')
      .populate('createBy', '_id username email role fullName studentId')
      .populate({
        path: 'project',
        select: 'name advisor members',
        populate: [
          { path: 'advisor', select: '_id username email role fullName studentId' },
          { path: 'members', select: '_id username email role fullName studentId' },
        ],
      })
      .lean();

    res.json(items);
  } catch (e) { next(e); }
};

/** getAllAppointments */
export const getAllAppointments = async (req, res, next) => {
  try {
    const items = await Appointment.find({})
      .select('title status project startAt')
      .populate({ path: 'project', select: 'name' })
      .sort({ startAt: -1 })
      .lean();

    const result = items.map((it) => ({
      _id: it._id,
      title: it.title || '',
      status: it.status || 'pending',
      startAt: it.startAt || null,
      project: {
        _id: it.project?._id || null,
        name: it.project?.name || '',
      },
    }));

    res.json(result);
  } catch (e) {
    next(e);
  }
};

/** อ่านรายการเดี่ยว (ยังคง enforce สิทธิ์เหมือนเดิม) */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const doc = await Appointment.findById(id)
      .populate('participants', '_id username email role fullName studentId')
      .populate('createBy', '_id username email role fullName studentId')
      .populate({
        path: 'project',
        select: 'name advisor members',
        populate: [
          { path: 'advisor', select: '_id username email role fullName studentId' },
          { path: 'members', select: '_id username email role fullName studentId' },
        ],
      });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const uid = req.user.id.toString();
    const isParticipant = doc.participants.map(x => x._id.toString()).includes(uid);
    const inProject = doc.project?.members?.map(x => x._id.toString()).includes(uid) || doc.project?.advisor?._id?.toString() === uid;

    if (!(isParticipant || doc.createBy._id.toString() === uid || inProject || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(doc.toObject ? doc.toObject() : doc);
  } catch (e) { next(e); }
};

/** อัปเดตนัดหมาย */
export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const up = req.body;

    const doc = await Appointment.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // อนุญาต ผู้สร้าง หรือ admin
    if (doc.createBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only creator/admin can update' });
    }

    // ตรวจเวลาใหม่
    const date = up.date ?? doc.date;
    const startTime = up.startTime ?? doc.startTime;
    const endTime = up.endTime ?? doc.endTime;

    const startAt = toDateTime(date, startTime);
    const endAt = toDateTime(date, endTime);
    if (!(startAt instanceof Date) || isNaN(startAt)) {
      return res.status(400).json({ message: 'รูปแบบเวลาเริ่มไม่ถูกต้อง' });
    }
    if (!(endAt instanceof Date) || isNaN(endAt)) {
      return res.status(400).json({ message: 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง' });
    }
    if (startAt >= endAt) {
      return res.status(400).json({ message: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' });
    }

    // Prevent updating to a past start time
    const now2 = new Date();
    if (startAt < now2) {
      return res.status(400).json({ message: 'ไม่สามารถตั้งเวลานัดในอดีตได้' });
    }

    // กันทับซ้อน (แก้เป็น AND ที่ถูกต้อง)
    if (doc.project) {
      const projectId = doc.project;
      const conflict = await Appointment.findOne({
        _id: { $ne: doc._id },
        project: projectId,
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
      }).lean();
      if (conflict) return res.status(409).json({ message: 'ช่วงเวลานี้ถูกจองแล้ว' });
    }

    // Validate / assign ฟิลด์อื่นๆ
    doc.title = up.title ?? doc.title;
    doc.description = up.description ?? doc.description;
    doc.reason = up.reason ?? doc.reason;
    doc.date = date;
    doc.startTime = startTime;
    doc.endTime = endTime;
    doc.startAt = startAt;
    doc.endAt = endAt;
    doc.meetingType = up.meetingType ?? doc.meetingType;
    doc.location = up.location ?? doc.location;
    doc.meetingNotes = up.meetingNotes ?? doc.meetingNotes;

    if (Array.isArray(up.participants)) {
      doc.participants = up.participants;
    }

    await doc.save();

    const populated = await Appointment.findById(doc._id)
      .populate('participants', '_id username email role fullName studentId')
      .populate('createBy', '_id username email role fullName studentId')
      .populate({
        path: 'project',
        select: 'name advisor members',
        populate: [
          { path: 'advisor', select: '_id username email role fullName studentId' },
          { path: 'members', select: '_id username email role fullName studentId' },
        ],
      })
      .lean();
    res.json(populated);
  } catch (e) { next(e); }
};

/** ลบนัดหมาย */
export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Appointment.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (doc.createBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only creator/admin can delete' });
    }
    await doc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};
