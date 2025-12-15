import { GridFSBucket } from 'mongodb';

let bucket;          // datasets bucket (kept name for backward compatibility)
let reportsBucket;   // reports bucket for PDFs

export const initGridFS = (mongooseConnection) => {
  bucket = new GridFSBucket(mongooseConnection.db, {
    bucketName: 'datasets'
  });
  reportsBucket = new GridFSBucket(mongooseConnection.db, {
    bucketName: 'reports'
  });
};

export const getGridFSBucket = () => {
  if (!bucket) throw new Error('GridFS not initialized');
  return bucket;
};

export const getReportsBucket = () => {
  if (!reportsBucket) throw new Error('GridFS not initialized');
  return reportsBucket;
};
