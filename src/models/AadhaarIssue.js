import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
//  Aadhaar Issue Types
// ─────────────────────────────────────────────────────────────
export const AADHAAR_ISSUE_TYPES = [
  'Name Correction',
  'Date of Birth Correction',
  'Address Update',
  'Mobile Number Update',
  'Email Update',
  'Photo Update',
  'Gender Correction',
  'Biometric Update',
  'New Aadhaar Enrollment',
  'Aadhaar Reprint / Duplicate',
  'Aadhaar Linking (Bank / Mobile)',
  'Aadhaar Unlocking',
  'Virtual ID (VID) Generation',
  'Download e-Aadhaar',
  'Other',
];

// ─────────────────────────────────────────────────────────────
//  Issue Priority
// ─────────────────────────────────────────────────────────────
export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Urgent'];

// ─────────────────────────────────────────────────────────────
//  Status Lifecycle
// ─────────────────────────────────────────────────────────────
export const ISSUE_STATUSES = [
  'Submitted',      // Just created
  'Under Review',   // Agent is reviewing
  'In Progress',    // Actively being worked on
  'Pending Docs',   // Waiting for documents from applicant
  'Resolved',       // Issue resolved
  'Rejected',       // Issue rejected with reason
  'Closed',         // Closed after resolution
];

// ─────────────────────────────────────────────────────────────
//  Audit Log sub-schema (every status change is recorded)
// ─────────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    fromStatus: {
      type: String,
    },
    toStatus: {
      type: String,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────
//  Aadhaar Issue Main Schema
// ─────────────────────────────────────────────────────────────
const aadhaarIssueSchema = new mongoose.Schema(
  {
    // ── Ticket Reference ──────────────────────────────────────
    ticketNumber: {
      type: String,
      unique: true,
      // Auto-generated before save (see pre-save hook)
    },

    // ── Aadhaar Details ───────────────────────────────────────
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      trim: true,
      match: [
        /^\d{12}$/,
        'Aadhaar number must be exactly 12 digits',
      ],
      // Stored masked for display: only last 4 digits exposed
    },

    // ── Applicant Details ─────────────────────────────────────
    applicantName: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    applicantPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, 'Please provide a valid phone number'],
    },
    applicantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      default: '',
    },

    // ── Issue Details ─────────────────────────────────────────
    issueType: {
      type: String,
      required: [true, 'Issue type is required'],
      enum: {
        values: AADHAAR_ISSUE_TYPES,
        message: 'Invalid issue type selected',
      },
    },
    issueDescription: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: 'Priority must be Low, Medium, High, or Urgent',
      },
      default: 'Medium',
    },

    // ── Supporting Documents ──────────────────────────────────
    documents: [
      {
        name: { type: String, required: true },
        type: { type: String },          // MIME type
        size: { type: String },          // human readable e.g. "1.2 MB"
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Status & Assignment ───────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ISSUE_STATUSES,
        message: 'Invalid status value',
      },
      default: 'Submitted',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedToName: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionRemarks: {
      type: String,
      default: '',
    },

    // ── Submitted By (logged-in VLE agent) ───────────────────
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedByName: {
      type: String,
      required: true,
    },

    // ── Full Audit Trail ──────────────────────────────────────
    auditLog: [auditLogSchema],
  },
  {
    timestamps: true,   // adds createdAt + updatedAt
  }
);

// ─────────────────────────────────────────────────────────────
//  Indexes for fast lookups
// ─────────────────────────────────────────────────────────────
aadhaarIssueSchema.index({ aadhaarNumber: 1 });               // list issues by aadhaar
aadhaarIssueSchema.index({ status: 1 });                      // filter by status
aadhaarIssueSchema.index({ submittedBy: 1 });                 // agent's own tickets
aadhaarIssueSchema.index({ createdAt: -1 });                  // latest first
// ticketNumber unique index is declared in the schema field itself (unique: true), no duplicate needed

// ─────────────────────────────────────────────────────────────
//  Pre-save: generate unique ticket number
// ─────────────────────────────────────────────────────────────
aadhaarIssueSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('AadhaarIssue').countDocuments();
    this.ticketNumber = `ADH-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ─────────────────────────────────────────────────────────────
//  Virtual: masked Aadhaar (show only last 4 digits)
// ─────────────────────────────────────────────────────────────
aadhaarIssueSchema.virtual('maskedAadhaar').get(function () {
  return `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
});

aadhaarIssueSchema.set('toJSON', { virtuals: true });
aadhaarIssueSchema.set('toObject', { virtuals: true });

const AadhaarIssue = mongoose.model('AadhaarIssue', aadhaarIssueSchema);

export default AadhaarIssue;
