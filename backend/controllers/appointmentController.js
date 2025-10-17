import Attachment from '../models/Attachment.js';
// import CancellationLog from '../models/CancellationLog.js';
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

    // Enforce maximum duration of 1 hour per appointment
    if ((endAt - startAt) > 1000 * 60 * 60) {
      return res.status(400).json({ message: 'ระยะเวลานัดหมายต้องไม่เกิน 1 ชั่วโมง' });
    }

    const proj = await Project.findById(projectId);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

  const overlap = await Appointment.findOne({ project: projectId, status: { $in: ['pending', 'approved'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } });
  if (overlap) return res.status(409).json({ message: 'ช่วงเวลานี้มีการนัดหมายอื่นอยู่แล้ว' });

    const extra = {};
    if (req.body.previousAppointment) extra.previousAppointment = req.body.previousAppointment;
    if (req.body.isNextAppointment) extra.isNextAppointment = Boolean(req.body.isNextAppointment);
    // If client provided a meetingSummary id when creating an appointment (e.g., creating a follow-up),
    // verify the MeetingSummary actually exists before attaching it to the appointment document.
    if (req.body.meetingSummary) {
      try {
        const MeetingSummary = (await import('../models/MeetingSummary.js')).default;
        const msExists = await MeetingSummary.findById(req.body.meetingSummary).lean();
        if (msExists) extra.meetingSummary = req.body.meetingSummary;
        else console.warn('Ignored non-existing meetingSummary id when creating appointment:', req.body.meetingSummary);
      } catch (msCheckErr) {
        console.error('Failed to verify meetingSummary during appointment creation:', msCheckErr);
      }
    }

    const doc = await Appointment.create({
      title, description, date, startTime, endTime, startAt, endAt, meetingType, location,
      meetingNotes: note,
      project: projectId,
      createBy: req.user.id,
      // participants default to project members (students). If advisor creates the appointment
      // we still set participants to project members so students receive notifications and can act.
      participants: Array.isArray(proj.members) ? proj.members : [],
      ...extra,
    });

    // If this is a follow-up created by the advisor, set a 3-day expiry window for student approval
    try {
      if ((doc.isNextAppointment || doc.previousAppointment) && proj && String(proj.advisor) === String(req.user.id)) {
        const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        doc.followUpExpiresAt = expires;
        // ensure status remains pending until student accepts
        doc.status = 'pending';
        await doc.save();
      }
    } catch (followErr) {
      console.error('Failed to set followUpExpiresAt for follow-up appointment:', followErr);
    }
    // Attach uploaded files (if any) to this appointment using GridFS + Attachment documents
    if (Array.isArray(req.files) && req.files.length) {
      try {
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
            expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (attachErr) {
        // do not fail the whole request for attachment errors, but log
        console.error('Attach files for appointment failed:', attachErr?.message || attachErr);
      }
    }

    const populated = await Appointment.findById(doc._id).populate('createBy').populate({ path: 'project', populate: { path: 'advisor members' } });

    // Send creation email to all relevant recipients (advisor, creator, project members)
    try {
      const recipients = getRelevantEmails(populated);
      if (recipients && recipients.length > 0) {
        const isFollowUp = !!(populated.isNextAppointment || populated.previousAppointment);
        const headline = isFollowUp ? 'สร้างนัดหมายติดตาม (Follow-up)' : 'มีการนัดหมายใหม่รอดำเนินการ';
        const message = isFollowUp
          ? `${populated.createBy.fullName || populated.createBy.username} ได้สร้างนัดหมายครั้งถัดไปสำหรับโปรเจกต์ "${populated.project.name}" (เป็นการติดตามจากการประชุมก่อนหน้า)`
          : `${populated.createBy.fullName || populated.createBy.username} ได้สร้างนัดหมายใหม่สำหรับโปรเจกต์ "${populated.project.name}"`;
        const subject = isFollowUp ? `[นัดหมายติดตาม] นัดหมาย: ${populated.title}` : `[นัดหมายใหม่] ${populated.title}`;

        const emailHtml = renderAppointmentEmail({ appointment: populated, headline, message });
        try {
          console.info('Sending creation email to recipients', { to: recipients, subject });
          await sendEmail({ to: recipients, subject, html: emailHtml });
          console.info('Creation email sent', { to: recipients, subject });
        } catch (mailErr) {
          console.error('Send creation email failed', { to: recipients, subject, err: mailErr?.message || mailErr });
        }
      }
    } catch (mailErr) {
      console.error('Send creation email failed (outer):', mailErr?.message || mailErr);
    }

    res.status(201).json(populated);
  } catch (e) { next(e); }
};

// อัปเดตสถานะนัดหมาย 
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason, summary } = req.body;
    const currentUserId = req.user.id;
    const isAdminUser = req.user && req.user.role === 'admin';

    // Only non-admins are restricted to the established set of statuses handled by this endpoint.
    const allowedForNonAdmin = ['approved', 'rejected', 'cancelled', 'completed'];
    if (!isAdminUser && !allowedForNonAdmin.includes(status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }

    const appointment = await Appointment.findById(id).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');
    if (!appointment) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });

    const isAdvisor = appointment.project.advisor._id.equals(currentUserId);
    const isCreator = appointment.createBy._id.equals(currentUserId);
    const isParticipant = Array.isArray(appointment.participants) && appointment.participants.some(p => String(p._id || p) === String(currentUserId));

    // Prevent changes to an already-approved appointment by non-advisor/non-admin
    if (appointment.status === 'approved' && req.user.role !== 'admin' && !isAdvisor) {
      return res.status(403).json({ message: 'ไม่สามารถแก้ไขนัดหมายที่ได้รับการอนุมัติแล้วได้' });
    }

    // Prevent changes when appointment is cancelled or rejected (only admin can override)
    if (['cancelled', 'rejected'].includes(appointment.status) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'การนัดหมายนี้ถูกยกเลิกหรือปฏิเสธแล้ว ไม่สามารถแก้ไขได้' });
    }

    // Authorization check
    // Students (participants) can cancel a pending appointment they are part of; require a reason
    if (status === 'cancelled') {
      try {
        appointment.status = 'cancelled';
        if (reason) appointment.reason = reason;
        await appointment.save();

        // Admin-triggered changes should not send emails
        if (!isAdminUser) {
          try {
            const allEmails = getRelevantEmails(appointment);
            const template = 'appointment-rejected.html';
            const headline = 'นัดหมายถูกยกเลิก';
            const message = `การนัดหมายเรื่อง "${appointment.title}" ถูกยกเลิกโดย ${appointment.createBy.fullName || appointment.createBy.username}`;
            const emailHtml = renderAppointmentEmail(
              { appointment, headline, message, reason },
              template,
            );
            await sendEmail({
              to: allEmails,
              subject: `[ยกเลิก] นัดหมาย: ${appointment.title}`,
              html: emailHtml,
            });
          } catch (mailErr) {
            console.error('Send cancellation email failed', mailErr);
          }
        }

        return res.json(appointment);
      } catch (saveErr) {
        console.error('Failed to save cancelled appointment:', saveErr);
        return res
          .status(500)
          .json({ message: 'ล้มเหลวในการยกเลิกนัดหมาย' });
      }
    }
    // completed can be set by advisor or creator (or admin)
    if (status === 'completed' && !(isAdvisor || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'เฉพาะผู้เกี่ยวข้องเท่านั้นที่สามารถทำเครื่องหมายว่าเสร็จสิ้นได้' });
    }
    // อนุมัติ/ปฏิเสธคำขอเลื่อนนัด
    // ถ้าเป็นนัดติดตาม (follow-up), อาจารย์อนุมัติเองไม่ได้ นศต้องอนุมัติ อาจารย์สามารถขอเลื่อนนัดได้เท่านั้น
    if (['approved', 'rejected'].includes(status)) {
      const isFollowUp = !!(appointment.isNextAppointment || appointment.previousAppointment);
      if (isFollowUp) {
        // On follow-up: students (participants) may approve; advisor cannot.
        if (!isParticipant && !isCreator && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'เฉพาะผู้เข้าร่วม (นักศึกษา) เท่านั้นที่สามารถอนุมัติ/ปฏิเสธสำหรับนัดติดตามนี้ได้' });
        }
      } else {
        // Non-follow-up appointments: only advisor (or admin) can approve/reject
        if (!isAdvisor && !isAdminUser) return res.status(403).json({ message: 'เฉพาะอาจารย์ที่ปรึกษาเท่านั้นที่สามารถอนุมัติหรือปฏิเสธได้' });
      }
    }

    appointment.status = status;
    if (status === 'rejected' && reason) {
      appointment.reason = reason;
    }

    // If marking completed and a summary is provided, save MeetingSummary
    if (status === 'completed' && summary) {
      // If the appointment already has a meetingSummary attached, verify it actually exists.
      // It's possible the appointment has a stale reference (the MeetingSummary doc was removed)
      // In that case we should clear the stale reference and allow creation of a new summary.
      if (appointment.meetingSummary) {
        try {
          const MeetingSummary = (await import('../models/MeetingSummary.js')).default;
          const exists = await MeetingSummary.findById(appointment.meetingSummary).lean();
          if (exists) {
            return res.status(409).json({ message: 'สรุปการประชุมสำหรับนัดหมายนี้มีแล้ว' });
          }
          // stale reference: clear it on the persisted appointment so we can create a new summary
          try {
            await Appointment.findByIdAndUpdate(appointment._id, { $unset: { meetingSummary: '' } }).exec();
            appointment.meetingSummary = undefined;
          } catch (unsetErr) {
            console.error('Failed to clear stale meetingSummary reference:', unsetErr);
          }
        } catch (checkErr) {
          console.error('Failed to verify existing MeetingSummary:', checkErr);
        }
      }
      try {
        const MeetingSummary = (await import('../models/MeetingSummary.js')).default;
        // Accept optional fields from body: homework, nextMeetingDate, attachments
        const homework = req.body.homework;
        const nextMeetingDate = req.body.nextMeetingDate ? new Date(req.body.nextMeetingDate) : undefined;
        const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];

        // Create the MeetingSummary first. The model now enforces a unique index on appointment,
        // which will throw if another summary already exists. However in concurrent scenarios we
        // also need to atomically attach the created summary to the Appointment document. To do this
        // we create the summary, then attempt an atomic conditional update on Appointment that
        // sets meetingSummary only if it is currently null/undefined.
        const created = await MeetingSummary.create({
          appointment: appointment._id,
          project: appointment.project._id,
          summary,
          homework,
          nextMeetingDate,
          attachments,
          createdBy: req.user.id,
        });

        // Try to set appointment.meetingSummary only if it is not already set (atomic)
        const updatedAppointment = await Appointment.findOneAndUpdate(
          { _id: appointment._id, $or: [{ meetingSummary: { $exists: false } }, { meetingSummary: null }] },
          { $set: { meetingSummary: created._id } },
          { new: true }
        );

        // If the conditional update didn't match, it means another summary was attached concurrently
        if (!updatedAppointment) {
          // debugging: log current appointment.meetingSummary value and whether MeetingSummary exists
          try {
            const current = await Appointment.findById(appointment._id).lean();
            const ref = current && current.meetingSummary ? String(current.meetingSummary) : current && current.meetingSummary === null ? null : undefined;
            const existsNow = ref ? await MeetingSummary.findById(ref).lean() : null;
            console.error('MeetingSummary attach failed: appointment.meetingSummary=', ref, 'meetingSummary doc exists=', !!existsNow);
          } catch (dbgErr) {
            console.error('Debugging check failed:', dbgErr);
          }
          // clean up the created MeetingSummary because it's a duplicate
          try { await MeetingSummary.findByIdAndDelete(created._id).exec(); } catch (delErr) { console.error('Failed to cleanup duplicate MeetingSummary:', delErr); }
          return res.status(409).json({ message: 'สรุปการประชุมสำหรับนัดหมายนี้มีแล้ว' });
        }

        // update our local appointment reference for subsequent processing and email logic
        appointment.meetingSummary = created._id;
      } catch (msErr) {
        // If the unique index on MeetingSummary.appointment triggered a duplicate key error,
        // surface a 409 to the client. Otherwise log the error and continue without failing the
        // entire request (to keep consistent with the previous behaviour).
        if (msErr && msErr.code === 11000) {
          return res.status(409).json({ message: 'สรุปการประชุมสำหรับนัดหมายนี้มีแล้ว' });
        }
        console.error('Create MeetingSummary failed:', msErr?.message || msErr);
      }
    }

    // If cancelled, persist status and reason (soft-cancel). Admins can still view cancelled appointments.
    if (status === 'cancelled') {
      try {
        appointment.status = 'cancelled';
        if (reason) appointment.reason = reason;
        await appointment.save();
        // send cancellation email to relevant parties
        try {
          const allEmails = getRelevantEmails(appointment);
          const template = 'appointment-rejected.html';
          const headline = 'นัดหมายถูกยกเลิก';
          const message = `การนัดหมายเรื่อง "${appointment.title}" ถูกยกเลิกโดย ${appointment.createBy.fullName || appointment.createBy.username}`;
          const emailHtml = renderAppointmentEmail({ appointment, headline, message, reason, template });
          await sendEmail({ to: allEmails, subject: `[ยกเลิก] นัดหมาย: ${appointment.title}`, html: emailHtml });
        } catch (mailErr) { console.error('Send cancellation email failed', mailErr); }
        return res.json(appointment);
      } catch (saveErr) {
        console.error('Failed to save cancelled appointment:', saveErr);
        return res.status(500).json({ message: 'ล้มเหลวในการยกเลิกนัดหมาย' });
      }
    }

    // Save appointment before sending notifications
    try {
      await appointment.save();
    } catch (saveErr) {
      console.error('Failed to save appointment status change:', saveErr);
      return res.status(500).json({ message: 'ไม่สามารถบันทึกการเปลี่ยนสถานะได้' });
    }

    // Email notification logic - skip when admin triggers the change
    if (!isAdminUser) {
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
          message = `การนัดหมายเรื่อง "${appointment.title}" ถูกปฏิเสธ${reason ? ` ด้วยเหตุผล: ${reason}` : ''}`;
        } else if (status === 'cancelled') {
          // Use the same rejection/cancel template for cancellations
          template = 'appointment-rejected.html';
          subject = `[ยกเลิก] นัดหมาย: ${appointment.title}`;
          headline = "นัดหมายถูกยกเลิก";
          message = `การนัดหมายเรื่อง "${appointment.title}" ถูกยกเลิกโดย ${appointment.createBy.fullName || appointment.createBy.username}`;
        }

        if (subject) {
          const icsContent = buildIcs(appointment);
          const emailHtml = renderAppointmentEmail(
            { appointment, headline, message, reason },
            template,
          );
          await sendEmail({
            to: allEmails,
            subject,
            html: emailHtml,
            attachments:
              status === 'approved'
                ? [
                    {
                      filename: 'บันทึกลงปฏิทิน.ics',
                      content: icsContent,
                      contentType: 'text/calendar',
                    },
                  ]
                : [],
          });
        }
      } catch (err) {
        console.error('Failed to send status change emails:', err);
        // don't fail the whole request because of email problems
      }
    }

    return res.json(appointment);
  } catch (err) {
    return next(err);
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

    // Enforce maximum duration of 1 hour
    if ((endAt - startAt) > 1000 * 60 * 60) {
      return res.status(400).json({ message: 'ระยะเวลานัดหมายต้องไม่เกิน 1 ชั่วโมง' });
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
        try {
          console.info('Sending reschedule request email', { to: uniqueEmails, subject: `[ขอเลื่อนนัด] นัดหมาย: ${appointment.title}` });
          await sendEmail({
            to: uniqueEmails,
            subject: `[ขอเลื่อนนัด] นัดหมาย: ${appointment.title}`,
            html: emailHtml,
          });
          console.info('Reschedule request email sent', { to: uniqueEmails, subject: `[ขอเลื่อนนัด] นัดหมาย: ${appointment.title}` });
        } catch (mailErr) {
          console.error('Send reschedule request email failed', { to: uniqueEmails, subject: `[ขอเลื่อนนัด] นัดหมาย: ${appointment.title}`, err: mailErr?.message || mailErr });
        }
      }
    } catch (mailErr) {
      console.error('Send reschedule request email failed:', mailErr?.message || mailErr);
    }

    res.json(appointment);
  } catch (e) {
    next(e);
  }
};

// ตรวจสอบความว่างของช่วงเวลา (สำหรับ client-side quick check)
export const checkAvailability = async (req, res, next) => {
  try {
    // expects query params: project, date, startTime, endTime, optional excludeId
    const { project, date, startTime, endTime, excludeId } = req.query;
    if (!project || !date || !startTime || !endTime) return res.status(400).json({ message: 'missing parameters' });
    const startAt = toDateTime(date, startTime);
    const endAt = toDateTime(date, endTime);
    if (isNaN(startAt) || isNaN(endAt) || startAt >= endAt) return res.status(400).json({ message: 'invalid time range' });

    // enforce max 1 hour
    if ((endAt - startAt) > 1000 * 60 * 60) return res.status(400).json({ message: 'duration too long' });

    const q = {
      project,
      status: { $in: ['pending', 'approved'] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    };
    if (excludeId) q._id = { $ne: excludeId };

    const conflict = await Appointment.findOne(q).select('title startAt endAt createBy status').lean();
    if (conflict) return res.json({ available: false, conflict });
    return res.json({ available: true });
  } catch (e) { next(e); }
};

//  นักศึกษาตอบรับการขอเลื่อนนัด
export const respondToReschedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accepted, reason } = req.body; // true or false, และเหตุผล (optional)

    const appointment = await Appointment.findById(id)
      .populate({ path: 'project', populate: { path: 'advisor members' } })
      .populate('createBy');

    if (
      !appointment ||
      appointment.status !== 'reschedule_requested' ||
      !appointment.reschedule
    ) {
      return res
        .status(400)
        .json({ message: 'ไม่มีคำขอเลื่อนนัดที่รอดำเนินการ' });
    }

    // อนุญาตให้สมาชิกของโปรเจกต์หรือนักศึกษาที่สร้างนัดตอบรับเท่านั้น
    const isProjectMember = appointment.project.members.some((m) =>
      m._id.equals(req.user.id),
    );
    if (!isProjectMember && !appointment.createBy._id.equals(req.user.id)) {
      return res.status(403).json({
        message: 'เฉพาะสมาชิกในโปรเจกต์เท่านั้นที่สามารถตอบรับได้',
      });
    }

    const advisorEmail = appointment.project.advisor.email;
    const originalAppointmentDetails = {
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    };

    if (accepted) {
      // หากยอมรับ ให้ตั้งวันที่และเวลาใหม่ แล้วเปลี่ยนสถานะเป็น approved
      const {
        date,
        startTime,
        endTime,
        startAt,
        endAt,
      } = appointment.reschedule;
      // Enforce maximum duration of 1 hour on accepted reschedule
      if ((new Date(endAt) - new Date(startAt)) > 1000 * 60 * 60) {
        return res.status(400).json({ message: 'ระยะเวลานัดหมายต้องไม่เกิน 1 ชั่วโมง' });
      }

      // Check for overlapping appointments in same project (exclude current appointment)
      const overlap = await Appointment.findOne({
        _id: { $ne: appointment._id },
        project: appointment.project._id,
        status: { $in: ['pending', 'approved'] },
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
      }).lean();
      if (overlap) {
        return res.status(409).json({ message: 'ช่วงเวลานี้มีการนัดหมายอื่นอยู่แล้ว' });
      }

      // record old time in activity log
      appointment.activity = appointment.activity || [];
      appointment.activity.push({ at: new Date(), by: req.user.id, type: 'reschedule_accepted', note: `Old time: ${appointment.date} ${appointment.startTime}-${appointment.endTime}` });
      appointment.date = date;
      appointment.startTime = startTime;
      appointment.endTime = endTime;
      appointment.startAt = startAt;
      appointment.endAt = endAt;
      appointment.status = 'approved';
    } else {
      // หากปฏิเสธ ให้ตั้งสถานะเป็น rejected ทันที (ย้ายไป History)
      appointment.status = 'rejected';
    }

    // บันทึกข้อมูลการตอบกลับและเหตุผลลงใน `reschedule.response`
    appointment.reschedule = appointment.reschedule || {};
    appointment.reschedule.response = {
      responder: req.user.id,
      accepted: !!accepted,
      reason: reason || undefined,
      respondedAt: new Date(),
    };

    // บันทึกนัดหมาย
    await appointment.save();

    // ส่งอีเมลยืนยันให้ที่ปรึกษา
    try {
      if (advisorEmail) {
        const template = accepted
          ? 'reschedule-accepted.html'
          : 'reschedule-rejected.html';
        const emailHtml = renderAppointmentEmail(
          {
            appointment: accepted
              ? appointment
              : { ...appointment.toObject(), ...originalAppointmentDetails },
            headline: accepted
              ? 'นักศึกษายืนยันการเลื่อนนัดแล้ว'
              : 'นักศึกษาปฏิเสธการเลื่อนนัด',
            message: accepted
              ? 'นักศึกษายืนยันเวลาใหม่แล้ว'
              : reason
                ? `นักศึกษาให้เหตุผล: ${reason}`
                : '',
            reason,
          },
          template,
        );
        const subjectLine = accepted
          ? `[ยืนยันเวลาใหม่] นัดหมาย: ${appointment.title}`
          : `[ปฏิเสธเวลาใหม่] นัดหมาย: ${appointment.title}`;

        await sendEmail({
          to: advisorEmail,
          subject: subjectLine,
          html: emailHtml,
          attachments: accepted
            ? [
              {
                filename: 'บันทึกลงปฏิทิน.ics',
                content: buildIcs(appointment),
                contentType: 'text/calendar',
              },
            ]
            : [],
        });
      }
    } catch (mailErr) {
      console.error(
        'Send reschedule response email failed',
        mailErr?.message || mailErr,
      );
    }

    // ส่งกลับข้อมูล appointment ที่ populate แล้ว
    const populated = await Appointment.findById(appointment._id)
      .populate(
        'participants',
        '_id username email role fullName studentId',
      )
      .populate(
        'createBy',
        '_id username email role fullName studentId',
      )
      .populate({
        path: 'reschedule.response.responder',
        select: '_id username email role fullName studentId',
      })
      .populate({
        path: 'project',
        select: 'name advisor members',
        populate: [
          {
            path: 'advisor',
            select: '_id username email role fullName studentId',
          },
          {
            path: 'members',
            select: '_id username email role fullName studentId',
          },
        ],
      });

    return res.json(populated);
  } catch (err) {
    return next(err);
  }
};


export const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const includeHistory =
      String(req.query.history || "").toLowerCase() === "true";
    const isAdmin = req.user.role === 'admin';
    const myProjectIds = await Project.find({
      $or: [{ members: userId }, { advisor: userId }],
    }).distinct("_id");

    // If history is requested, include historical statuses. However, non-admin users should NOT
    // receive cancelled appointments in their history view (they are retained in DB but hidden).
    // Admins may view cancelled appointments when history=true.
    const historyStatuses = [
      'pending',
      'approved',
      'rejected',
      'completed',
      'reschedule_requested',
      'expired',
    ];
    if (includeHistory) {
      if (isAdmin) {
        // Admins can see cancelled items as well
        historyStatuses.splice(3, 0, 'cancelled'); // insert cancelled after rejected
        // e.g. ['pending','approved','rejected','cancelled','completed',...]
      }
      const statusFilter = { $in: historyStatuses };

      // Auto-expire any follow-up appointments that exceeded their followUpExpiresAt
      try {
        await Appointment.updateMany({ isNextAppointment: true, status: 'pending', followUpExpiresAt: { $lt: new Date() } }, { $set: { status: 'expired' } }).exec();
      } catch (expErr) { console.error('Failed to auto-expire follow-up appointments:', expErr); }

      const items = await Appointment.find({
        $or: [
          { createBy: userId },
          { participants: userId },
          { project: { $in: await Project.find({ $or: [{ members: userId }, { advisor: userId }] }).distinct('_id') } },
        ],
        status: statusFilter,
      })
        .sort({ startAt: -1 })
        .populate('participants', '_id username email role fullName studentId')
        .populate('createBy', '_id username email role fullName studentId')
        .populate({ path: 'reschedule.response.responder', select: '_id username email role fullName studentId' })
        .populate({
          path: 'project',
          select: 'name advisor members',
          populate: [
            { path: 'advisor', select: '_id username email role fullName studentId' },
            { path: 'members', select: '_id username email role fullName studentId' },
          ],
        })
        .lean();

      return res.json(items);
    }
    // Non-history: exclude cancelled, completed, rejected
    const items = await Appointment.find({
      $or: [
        { createBy: userId },
        { participants: userId },
        { project: { $in: myProjectIds } },
      ],
      status: { $nin: ['cancelled', 'completed', 'rejected'] },
    })
      .sort({ startAt: -1 })
      .populate('participants', '_id username email role fullName studentId')
      .populate('createBy', '_id username email role fullName studentId')
      .populate({ path: 'reschedule.response.responder', select: '_id username email role fullName studentId' })
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
      .populate({ path: 'reschedule.response.responder', select: '_id username email role fullName studentId' })
      .populate({
        path: 'project',
        select: 'name advisor members',
        populate: [
          { path: 'advisor', select: '_id username email role fullName studentId' },
          { path: 'members', select: '_id username email role fullName studentId' },
        ],
      });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // If this is a follow-up that expired, update status before returning
    try {
      if (doc.isNextAppointment && doc.status === 'pending' && doc.followUpExpiresAt && new Date(doc.followUpExpiresAt) < new Date()) {
        doc.status = 'expired';
        await doc.save();
      }
    } catch (expErr) { console.error('Failed to mark follow-up expired:', expErr); }

    const uid = req.user.id.toString();
    const isParticipant = doc.participants.some(p => p._id.toString() === uid);
    const isCreator = doc.createBy._id.toString() === uid;
    const isAdvisor = doc.project?.advisor?._id?.toString() === uid;
    const isAdmin = req.user.role === 'admin';
    if (!(isParticipant || isCreator || isAdvisor || isAdmin)) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' });
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

    // Prevent edits to completed, cancelled or rejected appointments by non-admins
    if (['completed', 'cancelled', 'rejected'].includes(doc.status) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่สามารถแก้ไขนัดหมายที่เสร็จสิ้น ยกเลิก หรือปฏิเสธแล้วได้' });
    }

    // Allow Creator, admin, or project advisor (for next appointments)
    const proj = await Project.findById(doc.project);
    const isAdvisorForProject = proj?.advisor?.toString() === String(req.user.id);
    if (!doc.createBy.equals(req.user.id) && req.user.role !== 'admin' && !(doc.isNextAppointment && isAdvisorForProject)) {
      return res.status(403).json({ message: 'Only creator or admin (or advisor for follow-up) can update details' });
    }

    // Fields that can be updated
    const allowedUpdates = ['title', 'description', 'meetingType', 'location', 'meetingNotes'];

    allowedUpdates.forEach(key => {
      if (updates[key] !== undefined) {
        doc[key] = updates[key];
      }
    });

    await doc.save();
    // If files were uploaded, attach them to this appointment
    if (Array.isArray(req.files) && req.files.length) {
      try {
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
            expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (attachErr) {
        console.error('Attach files for appointment (update) failed:', attachErr?.message || attachErr);
      }
    }

    const populated = await Appointment.findById(id).populate('createBy').populate({ path: 'project', populate: { path: 'advisor members' } });
    res.json(populated);

  } catch (e) {
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

// Admin-only: permanently delete an appointment and related attachments
export const deleteAppointment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const appt = await Appointment.findById(id).exec();
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    // Delete associated attachments (Attachment docs and GridFS files)
    try {
      const attachments = await Attachment.find({ ownerType: 'appointment', ownerId: appt._id }).lean().exec();
      const bucket = getBucket();
      for (const a of attachments) {
        try { if (a.gridFsFileId) await bucket.delete(a.gridFsFileId); } catch { }
      }
      await Attachment.deleteMany({ ownerType: 'appointment', ownerId: appt._id }).exec();
    } catch (attErr) {
      console.error('Failed to cleanup attachments for appointment delete:', attErr?.message || attErr);
    }

    // Optionally record deletion in CancellationLog for audit

    await appt.deleteOne();
    res.json({ deleted: true });
  } catch (e) { next(e); }
};

