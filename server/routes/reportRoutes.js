import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createReport, listReports, getReportPdf, deleteReport, updateReport, checkReportExists, getReportCount } from '../controllers/reportController.js';

const router = express.Router();

// All routes require authenticated user
router.use(userAuth);

router.get('/exists', checkReportExists);
router.get('/report-count', getReportCount);
router.get('/get-all-reports', listReports);
router.post('/save-report', createReport);
router.delete('/delete-report/:id', deleteReport);

// Dynamic routes last (after specific routes)
router.get('/:id/pdf', getReportPdf);
router.put('/:id', updateReport);

export default router;
