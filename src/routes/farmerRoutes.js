/**
 * farmerRoutes.js
 * Express routing for Uzhavan / Tamil Nadu Farmer Services.
 */

import express from 'express';
import {
  submitFarmerRequest,
  getFarmerRequests,
  getFarmerRequestById,
  lookupFarmerByIdentifier,
  getFarmerStats,
  updateFarmerStatus,
  deleteFarmerRequest,
  getFarmerMeta,
} from '../controllers/farmerController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Reference metadata
router.get('/meta', getFarmerMeta);

// Application statistics
router.get('/stats', optionalProtect, getFarmerStats);

// Quick citizen identifier lookup (Ticket, Mobile, Patta, Survey No, PM-KISAN ID)
router.get('/lookup/:identifier', lookupFarmerByIdentifier);

// Applications collection
router
  .route('/requests')
  .post(optionalProtect, submitFarmerRequest)
  .get(optionalProtect, getFarmerRequests);

// Individual application
router
  .route('/requests/:id')
  .get(optionalProtect, getFarmerRequestById)
  .delete(optionalProtect, deleteFarmerRequest);

// Status update
router.patch('/requests/:id/status', optionalProtect, updateFarmerStatus);

export default router;

