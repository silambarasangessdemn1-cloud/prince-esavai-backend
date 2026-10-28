/**
 * vehicleRoutes.js
 * Express routing for Vahan Parivahan / Vehicle RC Services.
 */

import express from 'express';
import {
  submitVehicleRequest,
  getVehicleRequests,
  getVehicleRequestById,
  getVehicleStats,
  lookupVehicleByIdentifier,
  updateVehicleStatus,
  deleteVehicleRequest,
  getVehicleMeta,
} from '../controllers/vehicleController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Reference metadata
router.get('/meta', getVehicleMeta);

// Application statistics
router.get('/stats', optionalProtect, getVehicleStats);

// Quick citizen identifier lookup (Registration No, Ticket No, Phone, Challan)
router.get('/lookup/:identifier', lookupVehicleByIdentifier);

// Applications collection
router
  .route('/requests')
  .post(optionalProtect, submitVehicleRequest)
  .get(optionalProtect, getVehicleRequests);

// Individual application
router
  .route('/requests/:id')
  .get(optionalProtect, getVehicleRequestById)
  .delete(optionalProtect, deleteVehicleRequest);

// Status update
router.patch('/requests/:id/status', optionalProtect, updateVehicleStatus);

export default router;

