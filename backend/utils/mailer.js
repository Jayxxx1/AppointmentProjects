import nodemailer from 'nodemailer';

function createTransporter() {
  const host = (process.env.MAIL_HOST || '').trim();
  const port = parseInt((process.env.MAIL_PORT || '587').trim(), 10);
  const user = (process.env.MAIL_USER || '').trim();
  const pass = (process.env.MAIL_PASS || '').trim();

if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error('SMTP not configured (MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false, 
    auth: { user, pass },
  });
}

/**
 * ส่งอีเมลแบบง่าย
 * @param {Object} opts
 * @param {string|string[]} opts.to - ผู้รับ
 * @param {string} opts.subject - หัวข้อ
 * @param {string} [opts.text] - ข้อความล้วน
 * @param {string} [opts.html] - ข้อความ HTML
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 */
export async function sendEmail({ to, subject, text, html, cc, bcc, attachments }) {
  const from = (process.env.MAIL_FROM || process.env.MAIL_USER || '').trim();
  const transporter = createTransporter();
  return transporter.sendMail({ from, to, cc, bcc, subject, text, html, attachments });

  const info = await transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
  });

  return info;
}
