import mongoose from 'mongoose';

const CancellationLogSchema = new mongoose.Schema({
  appointmentSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.CancellationLog || mongoose.model('CancellationLog', CancellationLogSchema);
