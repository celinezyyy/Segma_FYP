import multer from 'multer';

const datasetUpload = multer({
  storage: multer.memoryStorage(), // store in memory
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed!'), false);
    }
  },
});

export default datasetUpload;