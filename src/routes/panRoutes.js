import express from 'express';
import {
  getPanMeta,
  getPanStats,
  submitPanRequest,
  listAllPanRequests,
  getPanRequestsByIdentifier,
  getPanRequestById,
  updatePanRequestStatus,
  deletePanRequest,
} from '../controllers/panController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all PAN routes
router.use(protect);

// Meta & Enums
router.get('/meta', getPanMeta);

// Stats
router.get('/stats', getPanStats);

// List & Submit
router.get('/requests', listAllPanRequests);
router.post('/requests', submitPanRequest);

// Lookup by Aadhaar or PAN
router.get('/requests/lookup/:identifier', getPanRequestsByIdentifier);

// Single Item CRUD
router.get('/requests/:id', getPanRequestById);
router.patch('/requests/:id/status', updatePanRequestStatus);
router.delete('/requests/:id', deletePanRequest);

export default router;

