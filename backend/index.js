import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', 'config.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import appointmentsRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teachers.js';
import projectRoutes from './routes/projects.js';
import attachmentsRoutes from './routes/attachments.js';

import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// CORS + parsers
app.use(cors({ origin: true, credentials: true, allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// debug
// console.log('[ENV CHECK] MAIL_HOST=', process.env.MAIL_HOST);
// console.log('[ENV CHECK] MAIL_USER=', process.env.MAIL_USER);
// console.log('[ENV CHECK] MAIL_PORT=', process.env.MAIL_PORT, ' FROM=', process.env.MAIL_FROM, ' PASS?', !!process.env.MAIL_PASS);

// DB connect
const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('No Mongo URI provided. Set ATLAS_URI or MONGO_URI in .env');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log(' MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/attachments', attachmentsRoutes);

// Health
app.get(['/health', '/api/health'], (req, res) => res.json({ ok: true }));

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
