import express from 'express';
import {
  getDrivingMeta,
  getDrivingStats,
  submitDrivingRequest,
  getDrivingRequests,
  lookupDrivingByIdentifier,
  getDrivingRequestById,
  updateDrivingStatus,
  addDrivingAuditLogEntry,
  deleteDrivingRequest,
} from '../controllers/drivingController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allow authenticated requests or guest citizens
router.use(optionalProtect);

// Metadata & Enums
router.get('/meta', getDrivingMeta);

// Stats for dashboard & queue counters
router.get('/stats', getDrivingStats);

// List & Submit
router.get('/requests', getDrivingRequests);
router.post('/requests', submitDrivingRequest);

// Lookup by DL Number, LL Number, Aadhaar or Mobile
router.get('/requests/lookup/:identifier', lookupDrivingByIdentifier);
router.get('/lookup/:identifier', lookupDrivingByIdentifier);

// Single Item Operations
router.get('/requests/:id', getDrivingRequestById);
router.patch('/requests/:id/status', updateDrivingStatus);
router.post('/requests/:id/audit', addDrivingAuditLogEntry);
router.delete('/requests/:id', deleteDrivingRequest);

export default router;

