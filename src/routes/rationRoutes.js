import express from 'express';
import {
  getRationMeta,
  getRationStats,
  submitRationRequest,
  getRationRequests,
  lookupRationByIdentifier,
  getRationRequestById,
  updateRationStatus,
  addRationAuditLogEntry,
  deleteRationRequest,
} from '../controllers/rationController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allow authenticated requests or guest citizens
router.use(optionalProtect);

// Metadata & Enums
router.get('/meta', getRationMeta);

// Stats for dashboard & queue counters
router.get('/stats', getRationStats);

// List & Submit
router.get('/requests', getRationRequests);
router.post('/requests', submitRationRequest);

// Lookup by Ration card number, Aadhaar or Phone
router.get('/requests/lookup/:identifier', lookupRationByIdentifier);
router.get('/lookup/:identifier', lookupRationByIdentifier);

// Single Item Operations
router.get('/requests/:id', getRationRequestById);
router.patch('/requests/:id/status', updateRationStatus);
router.post('/requests/:id/audit', addRationAuditLogEntry);
router.delete('/requests/:id', deleteRationRequest);

export default router;

