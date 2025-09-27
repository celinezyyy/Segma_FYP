// server/middleware/upload.js
import multer from 'multer';

const storage = multer.memoryStorage();   // keeps the file in memory as a Buffer, not on disk

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
      return cb(new Error('Only .csv and .xlsx files allowed!'));
    }
    cb(null, true);
  },
});
