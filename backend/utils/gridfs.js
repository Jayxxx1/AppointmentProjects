import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
let bucket = null;
export function getBucket() {
  if (bucket) return bucket;
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not ready');
  bucket = new GridFSBucket(db, { bucketName: 'files' });
  return bucket;
}