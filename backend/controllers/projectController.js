import mongoose from 'mongoose';
import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';

//helper
const asObjectIdOrNull = (v) => {
  const s = String(v ?? '').trim();
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
};
const toStrId = (v) => String((v?._id || v?.id || v) ?? '').trim();

const isTeacher = async (id) => {
  if (!id) return false;
  const u = await User.findById(id).select('_id role');
  return !!u && u.role === 'teacher';
};
const isStudent = async (id) => {
  if (!id) return false;
  const u = await User.findById(id).select('_id role');
  return !!u && u.role === 'student';
};

/** แปลงอะไรก็ได้ -> Array<ObjectId> (รองรับ JSON-string/CSV/FormData) */
function normalizeIdArray(input) {
  let arr = [];
  if (input == null) arr = [];
  else if (Array.isArray(input)) arr = input;
  else if (typeof input === 'string') {
    const s = input.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { arr = JSON.parse(s); } catch { arr = [s]; }
    } else {
      arr = s.split(',');
    }
  } else {
    arr = [input];
  }
  const uniq = Array.from(new Set(arr.map(v => String(v ?? '').trim()).filter(Boolean)));
  return uniq
    .filter(v => mongoose.Types.ObjectId.isValid(v))
    .map(v => new mongoose.Types.ObjectId(v));
}

// ===== สร้างโปรเจคใหม่ =====
export const createProject = async (req, res, next) => {
  try {
    const {
      name,
      description = '',
      advisorId,
      memberIds = [],
      academicYear,
    } = req.body;

    const currentUserId = asObjectIdOrNull(req.user?._id || req.user?.id);
    if (!currentUserId) return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ที่เข้าสู่ระบบ' });

    // validate advisor
    const advisorObjId = asObjectIdOrNull(advisorId);
    if (!advisorObjId) return res.status(400).json({ message: 'advisorId ไม่ถูกต้อง' });
    if (!(await isTeacher(advisorObjId))) return res.status(400).json({ message: 'ที่ปรึกษาต้องเป็นครู/อาจารย์' });

    // normalize members
    let members = [];
    const raw = Array.isArray(memberIds) ? memberIds : String(memberIds || '').split(',');
    for (const it of raw) {
      const oid = asObjectIdOrNull(it);
      if (oid) members.push(oid);
    }
    // ใส่ผู้สร้างเป็นสมาชิกอัตโนมัติ (ถ้ายังไม่มี)
    if (!members.some(m => toStrId(m) === toStrId(currentUserId))) {
      members.push(currentUserId);
    }

    const doc = await Project.create({
      name: String(name || '').trim(),
      description: String(description || '').trim(),
      advisor: advisorObjId,
      academicYear: String(academicYear || '').trim(),
      members,
      createdBy: currentUserId,
    });

    // แนบไฟล์ผ่าน GridFS (ถ้ามี)
    if (Array.isArray(req.files) && req.files.length) {
      const bucket = getBucket();
      for (const f of req.files) {
        const up = bucket.openUploadStream(f.originalname, {
          contentType: f.mimetype,
          metadata: { ownerType: 'project', ownerId: doc._id },
        });
        up.end(f.buffer);
        const fileId = await new Promise((resolve, reject) => {
          up.on('finish', () => resolve(up.id));
          up.on('error', reject);
        });
        await Attachment.create({
          ownerType: 'project',
          ownerId: doc._id,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          gridFsFileId: fileId,
          uploadedBy: currentUserId,
        });
      }
    }

    const populated = await Project.findById(doc._id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// ดึงโปรเจคทั้งหมด 
export const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const proj = await Project.findById(id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId');

    if (!proj) return res.status(404).json({ message: 'Project not found' });
    res.json(proj);
  } catch (err) { next(err); }
};

// ดึงโปรเจคที่เกี่ยวข้องกับผู้ใช้ 
export const listMyProjects = async (req, res, next) => {
  try {
    const uid = String(req.user.id);
    const items = await Project.find({
      $or: [
        { members: uid },
        { advisor: uid },
        { createdBy: uid },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();

    res.json(items);
  } catch (err) { next(err); }
};


// ดึงข้อมูลโปรเจคแต่ละรายการ
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
};

// แก้ไขโปรเจค 
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const proj = await Project.findById(id);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const isCreator = toStrId(proj.createdBy) === toStrId(req.user?._id || req.user?.id);
    const isAdmin = req.user?.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขโปรเจคนี้' });
    }


    const { name, description, advisorId, memberIds, academicYear } = req.body;

    if (typeof name === 'string') proj.name = name.trim();
    if (typeof description === 'string') proj.description = description.trim();

    if (advisorId) {
      const adv = asObjectIdOrNull(advisorId);
      if (!adv) return res.status(400).json({ message: 'advisorId ไม่ถูกต้อง' });
      if (!(await isTeacher(adv))) return res.status(400).json({ message: 'ที่ปรึกษาต้องเป็นครู/อาจารย์' });
      proj.advisor = adv;
    }

    if (memberIds != null) {
      const arr = Array.isArray(memberIds) ? memberIds : String(memberIds).split(',');
      const members = [];
      for (const it of arr) {
        const oid = asObjectIdOrNull(it);
        if (oid) members.push(oid);
      }
      // คงผู้สร้างไว้เสมอ
      if (!members.some(m => toStrId(m) === toStrId(proj.createdBy))) {
        members.push(proj.createdBy);
      }
      proj.members = members;
    }

    // Only admin can change academicYear
    if (academicYear !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนปีการศึกษาได้' });
      }
      proj.academicYear = academicYear;
    }

    // Validate before saving
    try {
      await proj.validate();
    } catch (validationErr) {
      return res.status(400).json({ message: validationErr.message });
    }

    await proj.save();

    const populated = await Project.findById(id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();

    res.json(populated);
  } catch (err) { next(err); }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proj = await Project.findById(id);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const isCreator = toStrId(proj.createdBy) === toStrId(req.user?._id || req.user?.id);
    const isAdmin = req.user?.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบโปรเจคนี้' });
    }


    const bucket = getBucket();
    const projectAttachments = await Attachment.find({ ownerType: 'project', ownerId: proj._id }).lean();
    for (const a of projectAttachments) {
      try { await bucket.delete(a.gridFsFileId); } catch { }
    }
    await Attachment.deleteMany({ ownerType: 'project', ownerId: proj._id });

    const apptIds = await Appointment.find({ project: proj._id }).distinct('_id');
    const apptAttachments = await Attachment.find({ ownerType: 'appointment', ownerId: { $in: apptIds } }).lean();
    for (const a of apptAttachments) {
      try { await bucket.delete(a.gridFsFileId); } catch { }
    }
    await Attachment.deleteMany({ ownerType: 'appointment', ownerId: { $in: apptIds } });


    await proj.deleteOne();

    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// List all projects (admin)
export const listAllProjects = async (req, res, next) => {
  try {
    const items = await Project.find({})
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) { next(err); }
};


// ค้นหา user เพื่อเพิ่มสมาชิก
export const searchUsers = async (req, res, next) => {
  try {
    const qRaw = (req.query.q || '').trim();
    let role = (req.query.role || 'student').trim().toLowerCase();
    if (!['student', 'teacher', 'admin'].includes(role)) role = 'student';
    const parsedLimit = parseInt(req.query.limit, 10);
    let limit = 10;
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 50);
    }
    const q = qRaw;
    const academicYear = req.query.academicYear;
    const excludeProject = req.query.excludeProject;
    const excludeIds = req.query.excludeIds
      ? req.query.excludeIds.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const filter = {};
    if (role) filter.role = role;
    if (q) {
      const safePattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { username: new RegExp(safePattern, 'i') },
        { email: new RegExp(safePattern, 'i') },
        { fullName: new RegExp(safePattern, 'i') },
        { studentId: new RegExp(safePattern, 'i') },
      ];
    }

    const combinedExcludeIds = new Set(excludeIds);
    const currentUserId = toStrId(req.user.id);
    combinedExcludeIds.add(currentUserId);

    if (excludeProject) {
      const p = await Project.findById(excludeProject).select('members advisor').lean();
      if (p?.advisor) combinedExcludeIds.add(toStrId(p.advisor));
      (p?.members || []).map(toStrId).forEach(id => combinedExcludeIds.add(id));
    }
    if (academicYear) {
      const conflicts = await Project.find({ academicYear }).select('members');
      conflicts.forEach(doc => (doc.members || []).map(toStrId).forEach(id => combinedExcludeIds.add(id)));
    }

    if (combinedExcludeIds.size > 0) {
      const ninIds = [...combinedExcludeIds]
        .map(id => (typeof id === 'string' ? id.trim() : toStrId(id)))
        .filter(Boolean)
        .filter(id => mongoose.isValidObjectId(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (ninIds.length) filter._id = { $nin: ninIds };
    }

    const users = await User.find(filter)
      .select('_id username email role fullName studentId')
      .limit(limit)
      .lean();

    res.json(users);
  } catch (err) { next(err); }
};

// เพิ่มสมาชิก
export const addMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // **[BUG FIX]** แก้ไขการตรวจสอบสิทธิ์ให้แม่นยำขึ้น
    // ตรวจสอบสิทธิ์: ผู้สร้าง, อาจารย์ที่ปรึกษา, หรือ admin เท่านั้นที่เพิ่มสมาชิกได้
    const currentUserIdStr = req.user.id.toString();
    const createdByIdStr = project.createdBy.toString();
    const advisorIdStr = project.advisor.toString();

    const isCreator = currentUserIdStr === createdByIdStr;
    const isAdvisor = currentUserIdStr === advisorIdStr;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdvisor && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เพิ่มสมาชิกในโปรเจคนี้' });
    }

    const addList = [];
    for (const mid of memberIds.map(toStrId)) {
      if (!mid) continue;
      if (toStrId(project.advisor) === mid) continue;
      if (project.members.map(toStrId).includes(mid)) continue;
      if (!(await isStudent(mid))) continue;
      const exists = await Project.exists({ academicYear: project.academicYear, members: mid });
      if (exists) continue;
      addList.push(mid);
    }
    if (addList.length) {
      await Project.updateOne({ _id: id }, { $addToSet: { members: { $each: addList } } });
    }
    const populated = await Project.findById(id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();
    res.json(populated);
  } catch (err) { next(err); }
};

// ลบสมาชิก 
export const removeMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // **[BUG FIX]** แก้ไขการตรวจสอบสิทธิ์ให้แม่นยำขึ้น
    // ตรวจสอบสิทธิ์: ผู้สร้าง, อาจารย์ที่ปรึกษา, หรือ admin เท่านั้นที่ลบสมาชิกได้
    const currentUserIdStr = req.user.id.toString();
    const createdByIdStr = project.createdBy.toString();
    const advisorIdStr = project.advisor.toString();

    const isCreator = currentUserIdStr === createdByIdStr;
    const isAdvisor = currentUserIdStr === advisorIdStr;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCreator && !isAdvisor && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบสมาชิกในโปรเจคนี้' });
    }

    const removeList = memberIds.map(toStrId).filter(mid => mid && mid !== toStrId(project.createdBy));
    if (removeList.length) {
      await Project.updateOne({ _id: id }, { $pull: { members: { $in: removeList } } });
    }
    const populated = await Project.findById(id)
      .populate('advisor', '_id username email role fullName studentId')
      .populate('members', '_id username email role fullName studentId')
      .populate('createdBy', '_id username email role fullName studentId')
      .lean();
    res.json(populated);
  } catch (err) { next(err); }
};

