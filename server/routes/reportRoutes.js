import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createReport, listReports, getReportPdf, deleteReport, updateReport } from '../controllers/reportController.js';

const router = express.Router();

// All routes require authenticated user
router.use(userAuth);

router.post('/save-report', createReport);
router.get('/get-all-reports', listReports); //DONE CHECKING
router.get('/:id/pdf', getReportPdf);
router.delete('/delete-report/:id', deleteReport); //DONE CHECKING

// Not use now for change file name update
router.put('/:id', updateReport);

export default router;
