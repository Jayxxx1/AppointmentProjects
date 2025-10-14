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
    participants: proj.members,
    ...extra,
  });
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

    // Send email to advisor
    try {
        const advisorEmail = populated?.project?.advisor?.email;
        if (advisorEmail) {
      // If this appointment is a follow-up (isNextAppointment or previousAppointment set) use a different headline/subject
      const isFollowUp = !!(populated.isNextAppointment || populated.previousAppointment);
      const headline = isFollowUp ? 'สร้างนัดหมายติดตาม (Follow-up)' : 'คุณมีการนัดหมายใหม่รอดำเนินการ';
      const message = isFollowUp
        ? `${populated.createBy.fullName || populated.createBy.username} ได้สร้างนัดหมายครั้งถัดไปสำหรับโปรเจกต์ "${populated.project.name}" (เป็นการติดตามจากการประชุมก่อนหน้า)`
        : `${populated.createBy.fullName || populated.createBy.username} ได้สร้างนัดหมายใหม่สำหรับโปรเจกต์ "${populated.project.name}" และกำลังรอการอนุมัติจากคุณ`;
      const subject = isFollowUp ? `[นัดหมายติดตาม] นัดหมาย: ${populated.title}` : `[รออนุมัติ] นัดหมายใหม่: ${populated.title}`;

      const emailHtml = renderAppointmentEmail({ appointment: populated, headline, message });
      await sendEmail({ to: advisorEmail, subject, html: emailHtml });
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

    // Prevent changes to an already-approved appointment by non-advisor/non-admin
    if (appointment.status === 'approved' && req.user.role !== 'admin' && !isAdvisor) {
      return res.status(403).json({ message: 'ไม่สามารถแก้ไขนัดหมายที่ได้รับการอนุมัติแล้วได้' });
    }

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
              { _id: appointment._id, $or: [ { meetingSummary: { $exists: false } }, { meetingSummary: null } ] },
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
                template = 'appointment-rejected.html'; // Use the new rejection template
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
                const emailHtml = renderAppointmentEmail({ appointment, headline, message, reason, template });
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
      // Decline the new time
      appointment.status = "rejected"; // **[MODIFIED]** Set status to rejected instead of approved
    }

    appointment.reschedule = null; // Clear the reschedule request
    await appointment.save();

    // Send confirmation email to the advisor
    try {
      if (advisorEmail) {
        const emailHtml = renderRescheduleResponseEmail({
          appointment: accepted ? appointment : { ...appointment.toObject(), ...originalAppointmentDetails },
          accepted,
          reason,
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
        }
      : { $nin: ["cancelled", "completed", "rejected"] }; // **[MODIFIED]** Keep 'reschedule_requested' in the main list

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
                if (['completed','cancelled','rejected'].includes(doc.status) && req.user.role !== 'admin') {
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

