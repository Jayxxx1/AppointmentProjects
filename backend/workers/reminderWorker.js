import Appointment from '../models/Appointment.js';
import { sendEmail } from '../utils/mailer.js';
import { renderAppointmentEmail } from '../utils/emailTemplates.js';

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

export const runReminderWorker = async () => {
    const now = new Date();
    // 1) Sweep expired follow-up appointments (created by advisor) and mark as cancelled/expired
    try {
        const expiredFollowUps = await Appointment.find({
            status: 'pending',
            followUpExpiresAt: { $lt: now },
            // optional: only those that are follow-ups (isNextAppointment true or previousAppointment set)
            $or: [ { isNextAppointment: true }, { previousAppointment: { $exists: true, $ne: null } } ]
        }).populate({ path: 'project', populate: { path: 'advisor members' } }).populate('createBy');

        if (expiredFollowUps && expiredFollowUps.length > 0) {
            console.log(`Found ${expiredFollowUps.length} expired follow-up(s). Marking as cancelled.`);
            for (const ap of expiredFollowUps) {
                try {
                    ap.status = 'cancelled';
                    // keep a reason to indicate auto-expiry
                    ap.reason = ap.reason || 'Follow-up expired (no student approval within allowed window)';
                    await ap.save();

                    // notify relevant emails
                    const allEmails = getRelevantEmails(ap);
                    if (allEmails.length > 0) {
                        const headline = 'นัดหมายต่อเนื่องหมดเวลา';
                        const message = `นัดหมายต่อเนื่อง "${ap.title}" ได้หมดเวลาการตอบรับแล้ว และถูกยกเลิกโดยอัตโนมัติ`;
                        const html = renderAppointmentEmail({ appointment: ap, headline, message });
                        await sendEmail({ to: allEmails, subject: `[แจ้งเตือน] นัดหมายหมดเวลา: ${ap.title}`, html });
                    }
                } catch (e) {
                    console.error('Failed to mark expired follow-up as cancelled for', ap._id, e);
                }
            }
        }
    } catch (e) {
        console.error('Error sweeping expired follow-ups', e);
    }
    // Find appointments that are approved, not yet reminded, and starting in the next 30-35 minutes
    const soon = new Date(now.getTime() + 35 * 60 * 1000);

    try {
        const appointmentsToRemind = await Appointment.find({
            status: 'approved',
            reminderSent: false,
            startAt: { $gte: now, $lte: soon }
        }).populate({
            path: 'project',
            populate: { path: 'advisor members' }
        }).populate('createBy');

        if (appointmentsToRemind.length === 0) {
            // console.log('No appointments to remind at this time.');
            return;
        }

        console.log(`Found ${appointmentsToRemind.length} appointments to remind.`);

        for (const appointment of appointmentsToRemind) {
            try {
                const allEmails = getRelevantEmails(appointment);

                if (allEmails.length > 0) {
                    const headline = "แจ้งเตือนนัดหมายใกล้จะถึงเวลา";
                    const message = `การนัดหมายเรื่อง "${appointment.title}" กำลังจะเริ่มในอีกประมาณ 30 นาที ในวันที่ ${appointment.date} เวลา ${appointment.startTime} น.`;
                    const emailHtml = renderAppointmentEmail({ appointment, headline, message });

                    await sendEmail({
                        to: allEmails,
                        subject: `[แจ้งเตือน] นัดหมาย: ${appointment.title}`,
                        html: emailHtml,
                    });

                    // Mark as sent
                    appointment.reminderSent = true;
                    await appointment.save();
                    console.log(`Reminder sent for appointment: ${appointment.title}`);
                }
            } catch (emailError) {
                console.error(`Failed to send reminder for appointment ${appointment._id}:`, emailError);
            }
        }
    } catch (dbError) {
        console.error('Error fetching appointments for reminders:', dbError);
    }
};
