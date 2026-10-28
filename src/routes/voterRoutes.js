import express from 'express';
import {
  getVoterMeta,
  getVoterStats,
  submitVoterRequest,
  listAllVoterRequests,
  getVoterRequestsByIdentifier,
  getVoterRequestById,
  updateVoterRequestStatus,
  deleteVoterRequest,
} from '../controllers/voterController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all Voter routes
router.use(protect);

// Meta & Enums
router.get('/meta', getVoterMeta);

// Stats
router.get('/stats', getVoterStats);

// List & Submit
router.get('/requests', listAllVoterRequests);
router.post('/requests', submitVoterRequest);

// Lookup by EPIC number or Aadhaar
router.get('/requests/lookup/:identifier', getVoterRequestsByIdentifier);

// Single Item CRUD
router.get('/requests/:id', getVoterRequestById);
router.patch('/requests/:id/status', updateVoterRequestStatus);
router.delete('/requests/:id', deleteVoterRequest);

export default router;

