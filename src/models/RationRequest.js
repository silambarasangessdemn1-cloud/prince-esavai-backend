import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
//  Ration Service Form Types (TNPDS - Tamil Nadu e-Sevai)
// ─────────────────────────────────────────────────────────────
export const RATION_SERVICE_TYPES = [
  'New Smart Card Application',
  'Add Family Member',
  'Remove / Delete Family Member',
  'Change of Family Head',
  'Change of Address / FPS',
  'Mobile Number Update / Link',
  'Smart Card QR Code & Download',
  'Card Type Conversion',
];

export const CARD_TYPES = [
  'PHH - Priority Household (Rice)',
  'PHH-AAY - Antyodaya Anna Yojana',
  'NPHH - Non-Priority (Rice)',
  'NPHH-S - Non-Priority (Sugar)',
  'NPHH-NC - No Commodity',
];

export const RATION_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Pending Verification',
  'Resolved',
  'Rejected',
  'Closed',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Urgent'];

export const RELATION_TYPES = [
  'Self / Head',
  'Husband',
  'Wife',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Other',
];

// ─────────────────────────────────────────────────────────────
//  Family Member sub-schema (for Add/Remove member applications)
// ─────────────────────────────────────────────────────────────
const familyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relation: {
      type: String,
      required: true,
      enum: RELATION_TYPES,
      default: 'Son',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender'],
      default: 'Male',
    },
    dateOfBirth: {
      type: String,
      default: '',
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

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
//  Ration Request Schema (Reusable, Scalable & Production-Ready)
// ─────────────────────────────────────────────────────────────
const rationRequestSchema = new mongoose.Schema(
  {
    // Unique Ticket Reference e.g. RAT-2026-00001
    ticketNumber: {
      type: String,
      unique: true,
    },

    // Selected Ration Service / TNPDS Form Type
    serviceType: {
      type: String,
      required: [true, 'Ration service type is required'],
      enum: {
        values: RATION_SERVICE_TYPES,
        message: 'Invalid Ration service type',
      },
    },

    // 12-digit TNPDS Smart Ration Card Number (e.g. 33/W/0123456 or 12 digits)
    rationCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    // Family Card Commodity Type
    cardType: {
      type: String,
      enum: CARD_TYPES,
      default: 'PHH - Priority Household (Rice)',
    },

    // Applicant Personal Details (Family Head)
    applicantName: {
      type: String,
      required: [true, 'Applicant / Family Head name is required'],
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
      enum: RELATION_TYPES,
      default: 'Husband',
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender'],
      default: 'Female',
    },

    dateOfBirth: {
      type: String,
      default: '',
    },

    // Contact Information
    applicantPhone: {
      type: String,
      required: [true, 'Contact mobile number is required'],
      trim: true,
      match: [/^\d{10}$/, 'Mobile number must be exactly 10 digits'],
    },

    applicantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // 12-Digit Aadhaar of Family Head
    aadhaarNumber: {
      type: String,
      trim: true,
      match: [/^\d{12}$|^$/, 'Aadhaar number must be exactly 12 digits'],
      default: '',
    },

    // Address & Fair Price Shop (FPS) Info
    state: {
      type: String,
      default: 'Tamil Nadu',
      trim: true,
    },

    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      default: 'Salem',
    },

    taluk: {
      type: String,
      trim: true,
      default: '',
    },

    villageOrWard: {
      type: String,
      trim: true,
      default: '',
    },

    fpsCode: {
      type: String,
      trim: true,
      default: '', // Fair Price Shop / Ration Shop Code
    },

    newAddress: {
      type: String,
      trim: true,
      default: '', // For Shifting of Residence
    },

    // Family Members list (for Add/Remove members)
    members: [familyMemberSchema],

    // Specific change requested
    correctionDetails: {
      type: String,
      trim: true,
      default: '',
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

    // Official Status & TNPDS Tracking
    status: {
      type: String,
      enum: RATION_STATUSES,
      default: 'Submitted',
    },

    tnpdsAckNumber: {
      type: String,
      trim: true,
      default: '', // TNPDS Reference e.g. TNPDS-2026-081234
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
rationRequestSchema.virtual('maskedAadhaar').get(function () {
  if (!this.aadhaarNumber || this.aadhaarNumber.length !== 12) return '';
  return `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
});

rationRequestSchema.set('toJSON', { virtuals: true });
rationRequestSchema.set('toObject', { virtuals: true });

// Auto-generate ticket number pre-validate (RAT-2026-00001)
rationRequestSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('RationRequest').countDocuments();
    const paddedIndex = String(count + 1).padStart(5, '0');
    this.ticketNumber = `RAT-${year}-${paddedIndex}`;
  }
  next();
});

// Indexes for high performance
rationRequestSchema.index({ rationCardNumber: 1 });
rationRequestSchema.index({ aadhaarNumber: 1 });
rationRequestSchema.index({ applicantPhone: 1 });
rationRequestSchema.index({ status: 1 });
rationRequestSchema.index({ submittedBy: 1 });
rationRequestSchema.index({ createdAt: -1 });
rationRequestSchema.index({ updatedAt: -1 });

const RationRequest = mongoose.model('RationRequest', rationRequestSchema);

export default RationRequest;

