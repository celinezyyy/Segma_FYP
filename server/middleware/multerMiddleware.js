import multer from 'multer';
import path from 'path';
import fs from 'fs';

const baseUploadDir = './datasets';
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.userId;
    const type = req.params.type; // 💡 get type from route param

    if (!userId) return cb(new Error('Missing user ID'), null);
    if (!['customer', 'order'].includes(type)) {
      return cb(new Error('Invalid dataset type'), null);
    }

    const uploadPath = `./datasets/${userId}/${type}`;
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const datasetUpload = multer({
  storage: multer.memoryStorage(), // ✅ store in memory
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed!'), false);
    }
  },
});

export default datasetUpload;