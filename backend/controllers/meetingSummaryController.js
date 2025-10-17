import MeetingSummary from '../models/MeetingSummary.js';
import Project from '../models/Project.js';

export const listMeetingSummaries = async (req, res, next) => {
  try {
    const user = req.user;

    let query = {};

    if (user.role !== 'admin') {
      const myProjectIds = await Project.find({ $or: [{ members: user.id }, { advisor: user.id }] }).distinct('_id');
      query = {
        $or: [
          { createdBy: user.id },
          { project: { $in: myProjectIds } }
        ]
      };
    }

    const items = await MeetingSummary.find(query)
      .sort({ createdAt: -1 })
      .populate('appointment')
      .populate({ path: 'project', select: 'name group academicYear advisor', populate: { path: 'advisor', select: '_id username fullName email' } })
      .populate('createdBy', '_id username fullName role')
      .populate('attachments')
      .lean();

    res.json(items);
  } catch (e) { next(e); }
};

export const getMeetingSummaryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await MeetingSummary.findById(id)
      .populate('appointment')
      .populate({ path: 'project', select: 'name group academicYear advisor', populate: { path: 'advisor', select: '_id username fullName email' } })
      .populate('createdBy', '_id username fullName role')
      .populate('attachments')
      .lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateMeetingSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await MeetingSummary.findById(id).populate('project');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const userId = req.user.id;
    const isAdvisor = doc.project?.advisor?.toString() === String(userId);
    const isCreator = doc.createdBy?.toString() === String(userId);
    if (!(isAdvisor || isCreator || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' });
    }
    const updates = {};
    if (req.body.summary !== undefined) updates.summary = req.body.summary;
    if (req.body.homework !== undefined) updates.homework = req.body.homework;
    if (req.body.nextMeetingDate !== undefined) updates.nextMeetingDate = req.body.nextMeetingDate ? new Date(req.body.nextMeetingDate) : undefined;
    if (Array.isArray(req.body.attachments)) updates.attachments = req.body.attachments;
    const updated = await MeetingSummary.findByIdAndUpdate(id, updates, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
};

export default { listMeetingSummaries, getMeetingSummaryById };
