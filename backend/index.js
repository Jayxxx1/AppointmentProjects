import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', 'config.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron'; // **[NEW]** Import node-cron

import authRoutes from './routes/auth.js';
import appointmentsRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teachers.js';
import projectRoutes from './routes/projects.js';
import attachmentsRoutes from './routes/attachments.js';

import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { runReminderWorker } from './workers/reminderWorker.js'; 

const app = express();

// **[IMPROVEMENT]** Use environment variable for CORS origin
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const MONGO_URI = process.env.ATLAS_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('No Mongo URI provided. Set ATLAS_URI or MONGO_URI in .env');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(' MongoDB connected');
    
    cron.schedule('* * * * *', () => {
      // console.log('Running appointment reminder worker...');
      runReminderWorker();
    });

  })
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

app.get(['/health', '/api/health'], (req, res) => res.json({ ok: true }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

