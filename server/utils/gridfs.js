import { GridFSBucket } from 'mongodb';

let bucket;

export const initGridFS = (mongooseConnection) => {
  bucket = new GridFSBucket(mongooseConnection.db, {
    bucketName: 'datasets' 
  });
};

export const getGridFSBucket = () => {
  if (!bucket) throw new Error('GridFS not initialized');
  return bucket;
};
