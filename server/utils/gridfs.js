// utils/gridfs.js
import { GridFSBucket } from 'mongodb';

let bucket;

export const initGridFS = (mongooseConnection) => {
  bucket = new GridFSBucket(mongooseConnection.db, {
    bucketName: 'datasets' // You can rename it if you want
  });
};

export const getGridFSBucket = () => {
  if (!bucket) throw new Error('GridFS not initialized');
  return bucket;
};
