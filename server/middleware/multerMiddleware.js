import multer from 'multer';

const datasetUpload = multer({
  storage: multer.memoryStorage(), // store in memory
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'text/csv',
      'application/vnd.ms-excel', // some browsers label csv as this
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ]);
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv or .xlsx files are allowed!'), false);
    }
  },
});

export default datasetUpload;