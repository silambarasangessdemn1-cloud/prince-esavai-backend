import { body } from 'express-validator';
import { handleValidationErrors } from './validationMiddleware.js';
import { AADHAAR_ISSUE_TYPES, PRIORITY_LEVELS } from '../models/AadhaarIssue.js';

// ─────────────────────────────────────────────────────────────
//  Validation rules for submitting a new Aadhaar issue
// ─────────────────────────────────────────────────────────────
export const validateSubmitIssue = [
  body('aadhaarNumber')
    .trim()
    .notEmpty()
    .withMessage('Aadhaar number is required')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar number must be exactly 12 digits (no spaces or dashes)'),

  body('applicantName')
    .trim()
    .notEmpty()
    .withMessage('Applicant name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('applicantPhone')
    .trim()
    .notEmpty()
    .withMessage('Applicant phone number is required')
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please provide a valid phone number (e.g. 9876543210)'),

  body('applicantEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('issueType')
    .trim()
    .notEmpty()
    .withMessage('Issue type is required')
    .isIn(AADHAAR_ISSUE_TYPES)
    .withMessage(`Issue type must be one of: ${AADHAAR_ISSUE_TYPES.join(', ')}`),

  body('issueDescription')
    .trim()
    .notEmpty()
    .withMessage('Issue description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('priority')
    .optional()
    .isIn(PRIORITY_LEVELS)
    .withMessage(`Priority must be one of: ${PRIORITY_LEVELS.join(', ')}`),

  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),

  body('documents.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each document must have a name'),

  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────
//  Validation rules for updating issue status
// ─────────────────────────────────────────────────────────────
export const validateUpdateStatus = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),

  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────
//  Validation rules for assigning an issue
// ─────────────────────────────────────────────────────────────
export const validateAssignIssue = [
  body('assignedToId')
    .trim()
    .notEmpty()
    .withMessage('assignedToId is required'),

  body('assignedToName')
    .trim()
    .notEmpty()
    .withMessage('assignedToName is required'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),

  handleValidationErrors,
];

