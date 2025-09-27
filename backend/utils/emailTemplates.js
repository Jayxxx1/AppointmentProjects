import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tplCache = new Map();

function loadTemplate(name) {
  if (tplCache.has(name)) return tplCache.get(name);
  const filePath = path.join(__dirname, '..', 'templates', name);
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

/** แทนค่าตัวแปรแบบง่าย + เงื่อนไขเล็กน้อย */
function renderSimple(html, vars = {}) {
  // เงื่อนไข {{#ifLocation}} ... {{/ifLocation}}
  html = html.replace(/\{\{#ifLocation\}\}([\s\S]*?)\{\{\/ifLocation\}\}/g,
    vars.locationSuffix ? '$1' : '');

  // เงื่อนไข {{#ifDescription}} ... {{/ifDescription}}
  html = html.replace(/\{\{#ifDescription\}\}([\s\S]*?)\{\{\/ifDescription\}\}/g,
    vars.descriptionHtml ? '$1' : '');

  // ตัวแปร
  return html
    .replace(/\{\{projectName\}\}/g, esc(vars.projectName ?? ''))
    .replace(/\{\{title\}\}/g, esc(vars.title ?? ''))
    .replace(/\{\{date\}\}/g, esc(vars.date ?? ''))
    .replace(/\{\{startTime\}\}/g, esc(vars.startTime ?? ''))
    .replace(/\{\{endTime\}\}/g, esc(vars.endTime ?? ''))
    .replace(/\{\{meetingType\}\}/g, esc(vars.meetingType ?? ''))
    .replace(/\{\{locationSuffix\}\}/g, esc(vars.locationSuffix ?? ''))
    .replace(/\{\{detailUrl\}\}/g, esc(vars.detailUrl ?? ''))
    .replace(/\{\{descriptionHtml\}\}/g, vars.descriptionHtml ?? '');
}

/** แปลงคำอธิบายหลายบรรทัดเป็น HTML ปลอดภัย */
function toDescriptionHtml(s) {
  if (!s) return '';
  return esc(String(s)).replace(/\n/g, '<br/>');
}

/** เรนเดอร์เทมเพลตอีเมล "สร้างนัดหมายใหม่" */
export function renderAppointmentCreatedEmail(data) {
  const htmlTpl = loadTemplate('appointmentCreated.html');
  const vars = {
    projectName: data.projectName,
    title: data.title,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    meetingType: data.meetingType,
    locationSuffix: data.meetingType === 'offline' && data.location ? ` @ ${data.location}` : '',
    detailUrl: data.detailUrl,
    descriptionHtml: data.description ? toDescriptionHtml(data.description) : '',
  };
  return renderSimple(htmlTpl, vars);
}


export function buildIcs({
  uid, title, description, startUtc, endUtc, location, url
}) {
  // เวลา UTC รูปแบบ YYYYMMDDTHHMMSSZ
  const fmt = (d) => {
    try {
      const dateObj = d instanceof Date ? d : new Date(d);
      if (!(dateObj instanceof Date) || isNaN(dateObj)) return null;
      return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    } catch {
      return null;
    }
  };
  const now = fmt(new Date()) || (new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const dtstart = fmt(startUtc);
  const dtend = fmt(endUtc);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProjectBU//Appointments//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid || (Date.now() + '@projectbu')}`,
    `DTSTAMP:${now}`,
    // Only include DTSTART/DTEND when we successfully formatted valid dates
    ...(dtstart ? [`DTSTART:${dtstart}`] : []),
    ...(dtend ? [`DTEND:${dtend}`] : []),
    `SUMMARY:${title || ''}`,
    description ? `DESCRIPTION:${description.replace(/\r?\n/g, '\\n')}` : 'DESCRIPTION:',
    location ? `LOCATION:${location}` : '',
    url ? `URL:${url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}
