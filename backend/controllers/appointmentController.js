import Attachment from '../models/Attachment.js';
import { getBucket } from '../utils/gridfs.js';
import Appointment from '../models/Appointment.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/mailer.js';
import { renderAppointmentEmail, buildIcs, renderRescheduleRequestEmail, renderRescheduleResponseEmail } from '../utils/emailTemplates.js';

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
        const { status, reason, summary } = req.body;
        const currentUserId = req.user.id;

        if (!['approved', 'rejected', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
        }

        const appointment = await Appointment.findById(id).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');
        if (!appointment) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });

        const isAdvisor = appointment.project.advisor._id.equals(currentUserId);
        const isCreator = appointment.createBy._id.equals(currentUserId);

        // Prevent changes when appointment is cancelled or rejected (only admin can override)
        if (['cancelled', 'rejected'].includes(appointment.status) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'การนัดหมายนี้ถูกยกเลิกหรือปฏิเสธแล้ว ไม่สามารถแก้ไขได้' });
        }

        // Authorization check
        if (status === 'cancelled' && !isCreator) {
            return res.status(403).json({ message: 'เฉพาะผู้สร้างนัดหมายเท่านั้นที่สามารถยกเลิกได้' });
        }
        // completed can be set by advisor or creator (or admin)
        if (status === 'completed' && !(isAdvisor || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'เฉพาะผู้เกี่ยวข้องเท่านั้นที่สามารถทำเครื่องหมายว่าเสร็จสิ้นได้' });
        }
        if (['approved', 'rejected'].includes(status) && !isAdvisor) {
            return res.status(403).json({ message: 'เฉพาะอาจารย์ที่ปรึกษาเท่านั้นที่สามารถอนุมัติหรือปฏิเสธได้' });
        }
        
        // Prevent student from changing status of an approved appointment
        if (appointment.status === 'approved' && !isAdvisor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่สามารถเปลี่ยนสถานะนัดหมายที่อนุมัติแล้วได้' });
        }

        appointment.status = status;
        if (status === 'rejected' && reason) {
            appointment.reason = reason;
        }

        // If marking completed and a summary is provided, save MeetingSummary
        if (status === 'completed' && summary) {
            try {
                const MeetingSummary = (await import('../models/MeetingSummary.js')).default;
                await MeetingSummary.create({ appointment: appointment._id, project: appointment.project._id, summary, createdBy: req.user.id });
            } catch (msErr) {
                console.error('Create MeetingSummary failed:', msErr?.message || msErr);
            }
        }

        await appointment.save();

        // Email notification logic
        try {
            let subject = '';
            let headline = '';
            let message = '';
            let template = 'appointmentCreated.html'; // Default template
            const allEmails = getRelevantEmails(appointment);

            if (status === 'approved') {
                subject = `[อนุมัติแล้ว] นัดหมาย: ${appointment.title}`;
                headline = "นัดหมายของคุณได้รับการอนุมัติแล้ว";
                message = `การนัดหมายเรื่อง "${appointment.title}" ในวันที่ ${appointment.date} เวลา ${appointment.startTime} ได้รับการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว`;
            } else if (status === 'rejected') {
                template = 'appointment-rejected.html';
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
                const emailHtml = renderAppointmentEmail({ appointment, headline, message, reason }, template); // Correctly pass template as the second argument
                await sendEmail({
                    to: allEmails,
                    subject,
                    html: emailHtml,
                    attachments: status === 'approved' ? [{ filename: 'บันทึกลงปฏิทิน.ics', content: icsContent, contentType: 'text/calendar' }] : []
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

        // Prevent requesting reschedule when appointment is cancelled or rejected (only admin can override)
        if (['cancelled', 'rejected'].includes(appointment.status) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่สามารถขอเลื่อนนัดสำหรับนัดหมายที่ถูกยกเลิกหรือปฏิเสธแล้ว' });
        }

        // Prevent student from requesting reschedule on an approved appointment
        if (appointment.status === 'approved' && !appointment.project.advisor._id.equals(req.user.id)) {
            return res.status(403).json({ message: 'ไม่สามารถขอเลื่อนนัดสำหรับนัดหมายที่อนุมัติแล้วได้' });
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
                const emailHtml = renderRescheduleRequestEmail({
                    appointment,
                    rescheduleDetails: appointment.reschedule,
                });

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
    const { accepted, reason } = req.body; // true or false, and optional reason

    const appointment = await Appointment.findById(id)
      .populate({ path: "project", populate: { path: "advisor members" } })
      .populate("createBy");
    if (
      !appointment ||
      appointment.status !== "reschedule_requested" ||
      !appointment.reschedule
    ) {
      return res
        .status(400)
        .json({ message: "ไม่มีคำขอเลื่อนนัดที่รอดำเนินการ" });
    }

    // **[MODIFIED]** Allow any project member to respond, not just the creator
    const isProjectMember = appointment.project.members.some((member) =>
      member._id.equals(req.user.id)
    );
    if (!isProjectMember && !appointment.createBy._id.equals(req.user.id)) {
      return res
        .status(403)
        .json({ message: "เฉพาะสมาชิกในโปรเจกต์เท่านั้นที่สามารถตอบรับได้" });
    }

    const advisorEmail = appointment.project.advisor.email;
    const originalAppointmentDetails = {
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
    };


    if (accepted) {
      // Accept the new time
      const { date, startTime, endTime, startAt, endAt } =
        appointment.reschedule;
      appointment.date = date;
      appointment.startTime = startTime;
      appointment.endTime = endTime;
      appointment.startAt = startAt;
      appointment.endAt = endAt;
      appointment.status = "approved";
    } else {
      // Decline the new time, set status to rejected
      appointment.status = "rejected"; 
      appointment.reason = reason || "นักศึกษาปฏิเสธเวลาที่เสนอใหม่";
    }

    appointment.reschedule = null; // Clear the reschedule request
    await appointment.save();

    const responseMessage = accepted ? `นักศึกษาได้ยืนยันเวลาใหม่สำหรับการนัดหมายเรื่อง "${appointment.title}" เรียบร้อยแล้ว` : "การนัดหมายนี้ถูกยกเลิกเนื่องจากเวลาไม่ตรงกัน กรุณาสร้างนัดหมายใหม่ในภายหลัง";
    // Send confirmation email to the advisor
    try {
      if (advisorEmail) {
        const emailHtml = renderRescheduleResponseEmail({
          appointment: accepted ? appointment : { ...appointment.toObject(), ...originalAppointmentDetails },
          accepted,
          reason,
          message: responseMessage,
        });

        await sendEmail({
          to: advisorEmail, // Only send to advisor
          subject: accepted
            ? `[ยืนยันเวลาใหม่] นัดหมาย: ${appointment.title}`
            : `[ปฏิเสธเวลาใหม่] นัดหมาย: ${appointment.title}`,
          html: emailHtml,
          attachments: accepted
            ? [
                {
                  filename: "บันทึกลงปฏิทิน.ics",
                  content: buildIcs(appointment),
                  contentType: "text/calendar",
                },
              ]
            : [],
        });
      }
    } catch (mailErr) {
      console.error(
        "Send reschedule response email failed:",
        mailErr?.message || mailErr
      );
    }

    res.json(appointment);
  } catch (e) {
    next(e);
  }
};


export const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const includeHistory =
      String(req.query.history || "").toLowerCase() === "true";
    const myProjectIds = await Project.find({
      $or: [{ members: userId }, { advisor: userId }],
    }).distinct("_id");

    const statusFilter = includeHistory
      ? {
          $in: [
            "pending",
            "approved",
            "rejected",
            "cancelled",
            "completed",
            "reschedule_requested",
            "expired",
          ],
        } // Keep 'reschedule_requested' in the main list
      : { $in: ["pending", "approved", "reschedule_requested"] }; 

    const items = await Appointment.find({
      $or: [
        { createBy: userId },
        { participants: userId },
        { project: { $in: myProjectIds } },
            ],
            status: statusFilter,
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

export const getAppointmentById = async (req, res, next) => {
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

export const updateAppointment = async (req, res, next) => {

    try {
        const { id } = req.params;
        const updates = req.body;
    
        const doc = await Appointment.findById(id);
        if (!doc) return res.status(404).json({ message: 'Not found' });
    
        // Prevent edits to appointments with terminal or advisor-controlled statuses by non-admins
        if (['completed', 'cancelled', 'rejected', 'approved'].includes(doc.status) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่สามารถแก้ไขนัดหมายที่อยู่ในสถานะนี้ได้' });
        }

        // Allow Creator or admin to update pending appointments
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

// getAllAppointments (for admin) 
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
