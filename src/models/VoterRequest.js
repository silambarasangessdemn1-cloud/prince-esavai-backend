import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
//  Voter Service Form Types
// ─────────────────────────────────────────────────────────────
export const VOTER_SERVICE_TYPES = [
  'New Voter Registration (Form 6)',
  'Correction of Entries (Form 8)',
  'Replacement / Duplicate EPIC (Form 8)',
  'Shifting of Residence (Form 8)',
  'Aadhaar - Voter Linking (Form 6B)',
  'Download Digital e-EPIC',
  'Search in Electoral Roll',
  'Deletion of Name (Form 7)',
];

export const VOTER_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Pending Docs',
  'Resolved',
  'Rejected',
  'Closed',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Urgent'];

export const RELATION_TYPES = ['Father', 'Mother', 'Husband', 'Wife', 'Legal Guardian'];

// ─────────────────────────────────────────────────────────────
//  Audit Log sub-schema
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
//  Voter Request Schema (Reusable & Scalable)
// ─────────────────────────────────────────────────────────────
const voterRequestSchema = new mongoose.Schema(
  {
    // Unique Ticket Reference e.g. VTR-2026-00001
    ticketNumber: {
      type: String,
      unique: true,
    },

    // Selected Voter Service / Form Type
    serviceType: {
      type: String,
      required: [true, 'Voter service type is required'],
      enum: {
        values: VOTER_SERVICE_TYPES,
        message: 'Invalid Voter service type',
      },
    },

    // Applicant Personal Details
    applicantName: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    relativeName: {
      type: String,
      trim: true,
      default: '',
    },
    relationType: {
      type: String,
      enum: [...RELATION_TYPES, ''],
      default: 'Father',
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', ''],
      default: 'Male',
    },

    // Contact Information
    applicantPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, 'Please provide a valid mobile number'],
    },
    applicantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // Identity Numbers
    aadhaarNumber: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{12})?$/,
        'Aadhaar number must be exactly 12 digits',
      ],
    },
    epicNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      // ECI EPIC format is typically 3 letters + 7 digits (e.g. TNX1234567) or alphanumeric
    },

    // Electoral Location Details
    state: {
      type: String,
      trim: true,
      default: 'Tamil Nadu',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    assemblyConstituency: {
      type: String,
      trim: true,
      default: '',
    },
    pollingStation: {
      type: String,
      trim: true,
      default: '',
    },

    // Specific Request Details
    correctionDetails: {
      type: String,
      trim: true,
      default: '', // For Form 8 corrections
    },
    newAddress: {
      type: String,
      trim: true,
      default: '', // For Form 8 shifting
    },
    remarksOrNotes: {
      type: String,
      trim: true,
      default: '',
    },

    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'Medium',
    },

    // Official Status & ECI Tracking
    status: {
      type: String,
      enum: VOTER_STATUSES,
      default: 'Submitted',
    },
    eciReferenceNumber: {
      type: String,
      trim: true,
      default: '', // ECI Reference e.g. TN-08-2026-XXXXX
    },
    resolutionRemarks: {
      type: String,
      default: '', // Highlighted official response on citizen dashboard
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // User Assignment
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedByName: {
      type: String,
      required: true,
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

    // Audit Trail
    auditLog: [auditLogSchema],
  },
  {
    timestamps: true,
  }
);

// Virtual field for masked Aadhaar
voterRequestSchema.virtual('maskedAadhaar').get(function () {
  if (!this.aadhaarNumber || this.aadhaarNumber.length !== 12) return '';
  return `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
});

voterRequestSchema.set('toJSON', { virtuals: true });
voterRequestSchema.set('toObject', { virtuals: true });

// Auto-generate ticket number pre-save (VTR-2026-00001)
voterRequestSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('VoterRequest').countDocuments();
    const paddedIndex = String(count + 1).padStart(5, '0');
    this.ticketNumber = `VTR-${year}-${paddedIndex}`;
  }
  next();
});

// Indexes for fast querying
voterRequestSchema.index({ epicNumber: 1 });
voterRequestSchema.index({ aadhaarNumber: 1 });
voterRequestSchema.index({ status: 1 });
voterRequestSchema.index({ submittedBy: 1 });
voterRequestSchema.index({ createdAt: -1 });
voterRequestSchema.index({ updatedAt: -1 });

const VoterRequest = mongoose.model('VoterRequest', voterRequestSchema);

export default VoterRequest;

