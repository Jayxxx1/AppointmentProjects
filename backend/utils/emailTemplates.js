import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


try {
  dotenv.config({ path: path.join(__dirname, '..', 'server', 'config.env') });
} catch (e) {
  console.warn('Could not load config.env file, proceeding with existing environment variables');}

const tplCache = new Map();

function loadTemplate(name) {
  if (tplCache.has(name)) return tplCache.get(name);
  const filePath = path.join(__dirname, '..', 'Templates', name);
  const html = fs.readFileSync(filePath, 'utf8');
  tplCache.set(name, html);
  return html;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSimple(html, vars = {}) {
  // Conditional blocks
  html = html.replace(/\{\{#if reason\}\}([\s\S]*?)\{\{\/if reason\}\}/g,
    vars.reason ? '$1' : '');

  html = html.replace(/\{\{#ifLocation\}\}([\s\S]*?)\{\{\/ifLocation\}\}/g,
    vars.locationSuffix ? '$1' : '');

  html = html.replace(/\{\{#ifDescription\}\}([\s\S]*?)\{\{\/ifDescription\}\}/g,
    vars.descriptionHtml ? '$1' : '');
  html = html.replace(/\{\{#ifMeetingNotes\}\}([\s\S]*?)\{\{\/ifMeetingNotes\}\}/g,
    vars.meetingNotes ? '$1' : '');

  // Variables 
  let out = html
    .replace(/\{\{headline\}\}/g, esc(vars.headline ?? ''))
    .replace(/\{\{message\}\}/g, vars.message ?? '') 
    .replace(/\{\{projectName\}\}/g, esc(vars.projectName ?? ''))
    .replace(/\{\{title\}\}/g, esc(vars.title ?? ''))
    .replace(/\{\{date\}\}/g, esc(vars.date ?? ''))
    .replace(/\{\{startTime\}\}/g, esc(vars.startTime ?? ''))
    .replace(/\{\{endTime\}\}/g, esc(vars.endTime ?? ''))
    .replace(/\{\{meetingType\}\}/g, esc(vars.meetingType ?? ''))
    .replace(/\{\{locationSuffix\}\}/g, esc(vars.locationSuffix ?? ''))
    .replace(/\{\{detailUrl\}\}/g, esc(vars.detailUrl ?? '')) 
    .replace(/\{\{descriptionHtml\}\}/g, vars.descriptionHtml ?? '');

  // meetingNotes 
  out = out.replace(/\{\{meetingNotes\}\}/g, esc(vars.meetingNotes ?? ''));
  out = out.replace(/\{\{reason\}\}/g, esc(vars.reason ?? ''));
  // แทนที่ตัวแปรอื่นๆ ที่เหลือจาก vars 
  const skipKeys = new Set(['message', 'descriptionHtml', 'meetingNotes', 'reason']);
  for (const k of Object.keys(vars || {})) {
    if (skipKeys.has(k)) continue;
    try {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      out = out.replace(regex, esc(vars[k] ?? ''));
    } catch (e) {
      // ข้ามหาก regex ไม่ถูกต้อง
    }
  }
  return out;
}

/** แสดงอีเมลคำขอเลื่อนนัด */
export function renderRescheduleRequestEmail({ appointment, rescheduleDetails }) {
  const htmlTpl = loadTemplate('reschedule-requested.html');
  const FE_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  
  const makeToken = (action) => {
    try {
      const payload = { appointmentId: String(appointment._id), action, purpose: 'reschedule_response' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.RESCHEDULE_TOKEN_EXPIRES || '7d' });
      return token;
    } catch (e) {
      console.error('Failed to create reschedule token:', e?.message || e);
      return '';
    }
  };

  const approveToken = makeToken('approve');
  const rejectToken = makeToken('reject');

  const approveUrl = `${FE_URL}/appointments/${appointment._id}/reschedule?action=approve${approveToken ? `&token=${approveToken}` : ''}`;
  const rejectUrl = `${FE_URL}/appointments/${appointment._id}/reschedule?action=reject${rejectToken ? `&token=${rejectToken}` : ''}`;

  const newStartTime = rescheduleDetails.startTime || appointment.startTime || '';
  const newEndTime = rescheduleDetails.endTime || appointment.endTime || '';
  const newDate = rescheduleDetails.date || appointment.date || '';

  const vars = {
    projectName: appointment.project?.name || '(ไม่มีชื่อโปรเจกต์)',
    title: appointment.title,
    originalDate: appointment.date,
    originalStartTime: appointment.startTime,
    originalEndTime: appointment.endTime,
    newDate,
    newStartTime,
    newEndTime,
    reason: rescheduleDetails.reason || '(ไม่ได้ระบุเหตุผล)',
    approveUrl,
    rejectUrl,
  };

  let output = htmlTpl;
  for (const key in vars) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    output = output.replace(regex, esc(vars[key]));
  }
  return output;
}

/** แสดงอีเมลคำตอบของนศในคำขอเลื่อนนัด */
export function renderRescheduleResponseEmail({ appointment, accepted, reason, message }) {
  const htmlTpl = loadTemplate('reschedule-response.html');
  const FE_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  const detailUrl = `${FE_URL}/appointments/${appointment._id}`;

  const vars = {
    headline: accepted ? 'นักศึกษายืนยันการเลื่อนนัดแล้ว' : 'นักศึกษาปฏิเสธการเลื่อนนัด',
    message,
    projectName: appointment.project?.name || '(ไม่มีชื่อโปรเจกต์)',
    title: appointment.title,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    meetingType: appointment.meetingType,
    locationSuffix: appointment.meetingType === 'offline' && appointment.location ? ` @ ${appointment.location}` : '',
    detailUrl,
    reason: reason || '',
  };


  let output = htmlTpl;
  for (const key in vars) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    output = output.replace(regex, esc(vars[key]));
  }
  return output;
}

/** แปลงข้อความหลายบรรทัดเป็น HTML */
function toDescriptionHtml(s) {
  if (!s) return '';
  return esc(String(s)).replace(/\n/g, '<br/>');
}

/** เรนเดอร์อีเมลนัดหมาย */
export function renderAppointmentEmail({ appointment, headline, message, reason }, template = 'appointmentCreated.html') {
  const htmlTpl = loadTemplate(template);
  const FE_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  const detailUrl = `${FE_URL}/appointments/${appointment._id}`;

  const vars = {
    headline,
    message,
    projectName: appointment.project?.name || '(ไม่มีชื่อโปรเจกต์)',
    title: appointment.title,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    newDate: appointment.date,
    newStartTime: appointment.startTime,
    newEndTime: appointment.endTime,
    meetingType: appointment.meetingType,
    locationSuffix: appointment.meetingType === 'offline' && appointment.location ? ` @ ${appointment.location}` : '',
    detailUrl: detailUrl,
    descriptionHtml: appointment.description ? toDescriptionHtml(appointment.description) : '',
    meetingNotes: appointment.meetingNotes || appointment.notes || appointment.note || '',
    reason: reason || '',
  };
  return renderSimple(htmlTpl, vars);
}


export function buildIcs(appointment) {
  const { _id, title, description, startAt, endAt, location, meetingType } = appointment;
  const FE_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  const detailUrl = `${FE_URL}/appointments/${_id}`;

  const fmt = (d) => {
    try {
      const dateObj = d instanceof Date ? d : new Date(d);
      if (isNaN(dateObj)) return null;
      return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    } catch {
      return null;
    }
  };
  const now = fmt(new Date());
  const dtstart = fmt(startAt);
  const dtend = fmt(endAt);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProjectBU//Appointments//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${_id}@projectbu.com`,
    `DTSTAMP:${now}`,
    ...(dtstart ? [`DTSTART:${dtstart}`] : []),
    ...(dtend ? [`DTEND:${dtend}`] : []),
    `SUMMARY:${title || ''}`,
    description ? `DESCRIPTION:${description.replace(/\r?\n/g, '\\n')}` : 'DESCRIPTION:',
    meetingType === 'offline' && location ? `LOCATION:${location}` : '',
    `URL:${detailUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}
