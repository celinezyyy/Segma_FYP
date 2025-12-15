import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createReport, listReports, getReportPdf, deleteReport, updateReport } from '../controllers/reportController.js';

const router = express.Router();

// All routes require authenticated user
router.use(userAuth);

router.post('/', createReport);
router.get('/', listReports);
router.get('/:id/pdf', getReportPdf);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;
