import mongoose from 'mongoose';
const { Schema } = mongoose;
const AttachmentSchema = new Schema({
  ownerType: { type: String, enum: ['project','appointment'], required: true, index: true },
  ownerId:   { type: Schema.Types.ObjectId, required: true, index: true },
  originalName: { type: String, required: true, trim: true },
  mimeType:     { type: String, required: true, trim: true },
  size:         { type: Number, required: true, min: 0 },
  gridFsFileId: { type: Schema.Types.ObjectId, required: true, index: true },
  uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expireAt:     { type: Date, default: undefined },
}, { timestamps: true, versionKey: false, collection: 'attachments' });
AttachmentSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });
AttachmentSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('Attachment', AttachmentSchema, 'attachments');