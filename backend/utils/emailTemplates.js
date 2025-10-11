import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  html = html.replace(/\{\{#ifLocation\}\}([\s\S]*?)\{\{\/ifLocation\}\}/g,
    vars.locationSuffix ? '$1' : '');

  html = html.replace(/\{\{#ifDescription\}\}([\s\S]*?)\{\{\/ifDescription\}\}/g,
    vars.descriptionHtml ? '$1' : '');

  // Variables
  return html
    .replace(/\{\{headline\}\}/g, esc(vars.headline ?? ''))
    .replace(/\{\{message\}\}/g, vars.message ?? '') // Message can contain <br> so don't escape it
    .replace(/\{\{projectName\}\}/g, esc(vars.projectName ?? ''))
    .replace(/\{\{title\}\}/g, esc(vars.title ?? ''))
    .replace(/\{\{date\}\}/g, esc(vars.date ?? ''))
    .replace(/\{\{startTime\}\}/g, esc(vars.startTime ?? ''))
    .replace(/\{\{endTime\}\}/g, esc(vars.endTime ?? ''))
    .replace(/\{\{meetingType\}\}/g, esc(vars.meetingType ?? ''))
    .replace(/\{\{locationSuffix\}\}/g, esc(vars.locationSuffix ?? ''))
    .replace(/\{\{detailUrl\}\}/g, esc(vars.detailUrl ?? '')) // URL is safe
    .replace(/\{\{descriptionHtml\}\}/g, vars.descriptionHtml ?? '');
}

/** Converts multiline description to safe HTML */
function toDescriptionHtml(s) {
  if (!s) return '';
  return esc(String(s)).replace(/\n/g, '<br/>');
}

/** Renders a generic appointment email template */
export function renderAppointmentEmail({ appointment, headline, message }) {
  const htmlTpl = loadTemplate('appointmentCreated.html'); // Use the modified template
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
    meetingType: appointment.meetingType,
    locationSuffix: appointment.meetingType === 'offline' && appointment.location ? ` @ ${appointment.location}` : '',
    detailUrl: detailUrl,
    descriptionHtml: appointment.description ? toDescriptionHtml(appointment.description) : '',
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
