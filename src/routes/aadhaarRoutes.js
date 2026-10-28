import express from 'express';
import {
  getMeta,
  submitIssue,
  listAllIssues,
  getIssuesByAadhaar,
  getIssueById,
  updateIssueStatus,
  assignIssue,
  deleteIssue,
  getStats,
} from '../controllers/aadhaarController.js';
import {
  validateSubmitIssue,
  validateUpdateStatus,
  validateAssignIssue,
} from '../middleware/aadhaarValidation.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All Aadhaar routes are protected — must be logged in
router.use(protect);

// ─────────────────────────────────────────────
//  Meta
// ─────────────────────────────────────────────
// GET /api/aadhaar/meta
//   → Returns all valid issue types, priorities, statuses
router.get('/meta', getMeta);

// ─────────────────────────────────────────────
//  Stats / Dashboard Summary
// ─────────────────────────────────────────────
// GET /api/aadhaar/stats
//   → Total, by-status, by-issue-type, by-priority, recent 5
router.get('/stats', getStats);

// ─────────────────────────────────────────────
//  Issues — Collection
// ─────────────────────────────────────────────
// GET  /api/aadhaar/issues?page=1&limit=20&status=Submitted&search=...
//   → Paginated list of all issues with filters
router.get('/issues', listAllIssues);

// POST /api/aadhaar/issues
//   → Submit a new Aadhaar issue
router.post('/issues', validateSubmitIssue, submitIssue);

// ─────────────────────────────────────────────
//  Issues — By Aadhaar Number
// ─────────────────────────────────────────────
// GET /api/aadhaar/issues/by-aadhaar/:aadhaarNumber
//   → List ALL issues linked to a specific Aadhaar (12 digits)
//   → Includes summary (counts by status / issue type)
router.get('/issues/by-aadhaar/:aadhaarNumber', getIssuesByAadhaar);

// ─────────────────────────────────────────────
//  Issues — Single Resource
// ─────────────────────────────────────────────
// GET    /api/aadhaar/issues/:id      → Full detail + audit trail
// PATCH  /api/aadhaar/issues/:id/status   → Change status
// PATCH  /api/aadhaar/issues/:id/assign   → Assign to agent
// DELETE /api/aadhaar/issues/:id     → Delete (submitter only, Submitted status only)
router.get('/issues/:id', getIssueById);
router.patch('/issues/:id/status', validateUpdateStatus, updateIssueStatus);
router.patch('/issues/:id/assign', validateAssignIssue, assignIssue);
router.delete('/issues/:id', deleteIssue);

export default router;

