import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';
import Appointment from '../models/Appointment.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/mailer.js';
import { renderAppointmentEmail, buildIcs } from '../utils/emailTemplates.js';

const toDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00+07:00`);

// Helper to get all relevant emails for an appointment
const getRelevantEmails = (populatedAppointment) => {
    const emails = new Set();
    if (populatedAppointment?.project?.advisor?.email) {
        emails.add(populatedAppointment.project.advisor.email);
    }
    if (populatedAppointment?.createBy?.email) {
        emails.add(populatedAppointment.createBy.email);
    }
    (populatedAppointment?.project?.members || []).forEach(member => {
        if (member.email) emails.add(member.email);
    });
    return Array.from(emails);
};


// สร้างนัดหมาย (ปรับปรุงการส่งอีเมล)
export const createAppointment = async (req, res, next) => {
  try {
    const { title, description, date, startTime, endTime, meetingType, location, note, project: projectId } = req.body;
    
    // ... (rest of the creation logic remains the same)
    const startAt = toDateTime(date, startTime);
    const endAt = toDateTime(date, endTime);
    if (isNaN(startAt) || isNaN(endAt) || startAt >= endAt) {
      return res.status(400).json({ message: 'เวลาเริ่ม/สิ้นสุดไม่ถูกต้อง' });
    }
    
    const proj = await Project.findById(projectId);
    if (!proj) return res.status(404).json({ message: 'Project not found' });
    
    const overlap = await Appointment.findOne({ project: projectId, status: { $in: ['pending', 'approved'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } });
    if (overlap) return res.status(409).json({ message: 'ช่วงเวลานี้มีการนัดหมายอื่นอยู่แล้ว' });

    const doc = await Appointment.create({
        title, description, date, startTime, endTime, startAt, endAt, meetingType, location,
        meetingNotes: note,
        project: projectId,
        createBy: req.user.id,
        participants: proj.members, 
    });
    
    // ... (file attachment logic remains the same)

    const populated = await Appointment.findById(doc._id).populate('createBy').populate({ path: 'project', populate: { path: 'advisor members' } });

    // Send email to advisor
    try {
        const advisorEmail = populated?.project?.advisor?.email;
        if (advisorEmail) {
            const emailHtml = renderAppointmentEmail({
                appointment: populated,
                headline: "คุณมีการนัดหมายใหม่รอดำเนินการ",
                message: `${populated.createBy.fullName || populated.createBy.username} ได้สร้างนัดหมายใหม่สำหรับโปรเจกต์ "${populated.project.name}" และกำลังรอการอนุมัติจากคุณ`
            });
            await sendEmail({
                to: advisorEmail,
                subject: `[รออนุมัติ] นัดหมายใหม่: ${populated.title}`,
                html: emailHtml,
            });
        }
    } catch (mailErr) {
        console.error('Send creation email failed:', mailErr?.message || mailErr);
    }

    res.status(201).json(populated);
  } catch (e) { next(e); }
};

// **[NEW]** อัปเดตสถานะ (Approve, Reject, Cancel)
export const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const currentUserId = req.user.id;

        if (!['approved', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
        }

        const appointment = await Appointment.findById(id).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');
        if (!appointment) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });

        const isAdvisor = appointment.project.advisor._id.equals(currentUserId);
        const isCreator = appointment.createBy._id.equals(currentUserId);

        // Authorization check
        if (status === 'cancelled' && !isCreator) {
            return res.status(403).json({ message: 'เฉพาะผู้สร้างนัดหมายเท่านั้นที่สามารถยกเลิกได้' });
        }
        if (['approved', 'rejected'].includes(status) && !isAdvisor) {
            return res.status(403).json({ message: 'เฉพาะอาจารย์ที่ปรึกษาเท่านั้นที่สามารถอนุมัติหรือปฏิเสธได้' });
        }
        
        appointment.status = status;
        if (status === 'rejected' && reason) {
            appointment.reason = reason;
        }

        await appointment.save();

        // Email notification logic
        try {
            let subject = '';
            let headline = '';
            let message = '';
            const allEmails = getRelevantEmails(appointment);

            if (status === 'approved') {
                subject = `[อนุมัติแล้ว] นัดหมาย: ${appointment.title}`;
                headline = "นัดหมายของคุณได้รับการอนุมัติแล้ว";
                message = `การนัดหมายเรื่อง "${appointment.title}" ในวันที่ ${appointment.date} เวลา ${appointment.startTime} ได้รับการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว`;
            } else if (status === 'rejected') {
                subject = `[ถูกปฏิเสธ] นัดหมาย: ${appointment.title}`;
                headline = "นัดหมายของคุณถูกปฏิเสธ";
                message = `การนัดหมายเรื่อง "${appointment.title}" ถูกปฏิเสธโดยอาจารย์ที่ปรึกษา ${reason ? `ด้วยเหตุผล: ${reason}` : ''}`;
            } else if (status === 'cancelled') {
                subject = `[ยกเลิก] นัดหมาย: ${appointment.title}`;
                headline = "นัดหมายถูกยกเลิก";
                message = `การนัดหมายเรื่อง "${appointment.title}" ถูกยกเลิกโดย ${appointment.createBy.fullName || appointment.createBy.username}`;
            }

            if(subject) {
                const icsContent = buildIcs(appointment);
                const emailHtml = renderAppointmentEmail({ appointment, headline, message });
                await sendEmail({
                    to: allEmails,
                    subject,
                    html: emailHtml,
                    attachments: status === 'approved' ? [{ filename: 'invite.ics', content: icsContent, contentType: 'text/calendar' }] : []
                });
            }
        } catch (mailErr) {
            console.error(`Send ${status} email failed:`, mailErr?.message || mailErr);
        }

        res.json(appointment);
    } catch (e) {
        next(e);
    }
};

// **[NEW]** อาจารย์ขอเลื่อนนัด
export const requestReschedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime, reason } = req.body;
        
        const startAt = toDateTime(date, startTime);
        const endAt = toDateTime(date, endTime);
        if (isNaN(startAt) || isNaN(endAt) || startAt >= endAt) {
            return res.status(400).json({ message: 'วัน/เวลาที่เสนอไม่ถูกต้อง' });
        }
        
        const appointment = await Appointment.findById(id).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');
        if (!appointment) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });
        
        if (!appointment.project.advisor._id.equals(req.user.id)) {
            return res.status(403).json({ message: 'เฉพาะอาจารย์ที่ปรึกษาเท่านั้นที่สามารถขอเลื่อนนัดได้' });
        }

        appointment.status = 'reschedule_requested';
        appointment.reschedule = {
            proposedBy: req.user.id,
            date, startTime, endTime, startAt, endAt, reason
        };
        await appointment.save();
        
        // Send email to students
        try {
            const studentEmails = (appointment.project.members || []).map(m => m.email).filter(Boolean);
            if (appointment.createBy.email) studentEmails.push(appointment.createBy.email);
            
            const uniqueEmails = [...new Set(studentEmails)];

            if (uniqueEmails.length > 0) {
                const headline = "อาจารย์ที่ปรึกษาขอเลื่อนนัดหมาย";
                const message = `อาจารย์ ${appointment.project.advisor.fullName || appointment.project.advisor.username} ได้ขอเลื่อนนัดหมายเรื่อง "${appointment.title}" เป็นวันที่ ${date} เวลา ${startTime} - ${endTime} กรุณาตรวจสอบและยืนยัน`;
                const emailHtml = renderAppointmentEmail({ appointment, headline, message });

                await sendEmail({
                    to: uniqueEmails,
                    subject: `[ขอเลื่อนนัด] นัดหมาย: ${appointment.title}`,
                    html: emailHtml,
                });
            }
        } catch(mailErr) {
            console.error('Send reschedule request email failed:', mailErr?.message || mailErr);
        }

        res.json(appointment);
    } catch(e) {
        next(e);
    }
};

// **[NEW]** นักศึกษาตอบรับการขอเลื่อนนัด
export const respondToReschedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { accepted } = req.body; // true or false

        const appointment = await Appointment.findById(id).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');
        if (!appointment || appointment.status !== 'reschedule_requested' || !appointment.reschedule) {
            return res.status(400).json({ message: 'ไม่มีคำขอเลื่อนนัดที่รอดำเนินการ' });
        }
        
        if (!appointment.createBy._id.equals(req.user.id)) {
             return res.status(403).json({ message: 'เฉพาะผู้สร้างนัดหมายเท่านั้นที่สามารถตอบรับได้' });
        }
        
        let subject, headline, message;

        if (accepted) {
            // Accept the new time
            const { date, startTime, endTime, startAt, endAt } = appointment.reschedule;
            appointment.date = date;
            appointment.startTime = startTime;
            appointment.endTime = endTime;
            appointment.startAt = startAt;
            appointment.endAt = endAt;
            appointment.status = 'approved';
            
            subject = `[ยืนยันเวลาใหม่] นัดหมาย: ${appointment.title}`;
            headline = "การขอเลื่อนนัดได้รับการยอมรับ";
            message = `นักศึกษาได้ยอมรับเวลาใหม่สำหรับการนัดหมายเรื่อง "${appointment.title}" นัดหมายใหม่คือวันที่ ${date} เวลา ${startTime}`;
        } else {
            // Decline the new time
            appointment.status = 'approved'; // Revert to original approved time
            subject = `[ปฏิเสธเวลาใหม่] นัดหมาย: ${appointment.title}`;
            headline = "นักศึกษาปฏิเสธเวลาที่เสนอ";
            message = `นักศึกษาไม่สะดวกในเวลาที่ท่านเสนอสำหรับนัดหมายเรื่อง "${appointment.title}" การนัดหมายยังคงเป็นวัน/เวลาเดิมคือ ${appointment.date} เวลา ${appointment.startTime}`;
        }
        
        appointment.reschedule = null; // Clear the reschedule request
        await appointment.save();

        // Send confirmation email
        try {
            const allEmails = getRelevantEmails(appointment);
            const icsContent = buildIcs(appointment);
            const emailHtml = renderAppointmentEmail({ appointment, headline, message });

            await sendEmail({
                to: allEmails,
                subject,
                html: emailHtml,
                attachments: accepted ? [{ filename: 'invite.ics', content: icsContent, contentType: 'text/calendar' }] : []
            });
        } catch(mailErr) {
            console.error('Send reschedule response email failed:', mailErr?.message || mailErr);
        }

        res.json(appointment);
    } catch(e) {
        next(e);
    }
};

// ... (getMyAppointments, getAllAppointments, getAppointmentById, updateAppointment (for details) remain largely the same)
// The old deleteAppointment is now handled by updateAppointmentStatus with status 'cancelled'
// ...

// Get my appointments
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
      status: { $ne: 'cancelled' } // ไม่แสดงนัดหมายที่ยกเลิกแล้ว
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

// Get single appointment
export const getAppointmentById = async (req, res, next) => {
    // This function can remain as is, it correctly checks for permissions.
    try {
        const { id } = req.params;
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
        const isParticipant = doc.participants.some(p => p._id.toString() === uid);
        const isCreator = doc.createBy._id.toString() === uid;
        const isAdvisor = doc.project?.advisor?._id?.toString() === uid;
        const isAdmin = req.user.role === 'admin';

        if (!(isParticipant || isCreator || isAdvisor || isAdmin)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(doc.toObject ? doc.toObject() : doc);
    } catch (e) {
        next(e);
    }
};

// Update appointment DETAILS (not status)
export const updateAppointment = async (req, res, next) => {
    // This should only be for creators/admins to edit details like title, description etc.
    // Status changes are handled by the new dedicated functions.
    // ...
    try {
        const { id } = req.params;
        const updates = req.body;
    
        const doc = await Appointment.findById(id);
        if (!doc) return res.status(404).json({ message: 'Not found' });
    
        // Allow Creator or admin to update
        if (!doc.createBy.equals(req.user.id) && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Only creator or admin can update details' });
        }
        
        // Fields that can be updated
        const allowedUpdates = ['title', 'description', 'meetingType', 'location', 'meetingNotes'];
        
        allowedUpdates.forEach(key => {
            if (updates[key] !== undefined) {
                doc[key] = updates[key];
            }
        });

        await doc.save();
        const populated = await Appointment.findById(id).populate('createBy').populate({ path: 'project', populate: { path: 'advisor members' } });
        res.json(populated);

    } catch(e) {
        next(e);
    }
};

// getAllAppointments (for admin) can remain the same
export const getAllAppointments = async (req, res, next) => {
    try {
      const items = await Appointment.find({})
        .select('title status project startAt createBy')
        .populate({ path: 'project', select: 'name' })
        .populate({ path: 'createBy', select: 'username fullName' })
        .sort({ startAt: -1 })
        .lean();
      res.json(items);
    } catch (e) { next(e); }
  };

