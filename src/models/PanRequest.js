import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
//  PAN Service Types
// ─────────────────────────────────────────────────────────────
export const PAN_SERVICE_TYPES = [
  'New PAN Card (Form 49A)',
  'PAN Correction / Changes',
  'Reprint Physical PAN Card',
  'Minor to Major PAN Update',
  'Instant e-PAN Download',
  'Aadhaar - PAN Linking',
  'Find Lost PAN Number',
  'PVC Plastic Card Order',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Urgent'];

export const PAN_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Pending Docs',
  'Resolved',
  'Rejected',
  'Closed',
];

export const DELIVERY_MODES = [
  'Physical Card + e-PAN',
  'e-PAN Only',
];

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
//  PAN Request Schema
// ─────────────────────────────────────────────────────────────
const panRequestSchema = new mongoose.Schema(
  {
    // Unique Ticket Reference e.g. PAN-2026-00042
    ticketNumber: {
      type: String,
      unique: true,
    },

    // Selected PAN Service Type
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      enum: {
        values: PAN_SERVICE_TYPES,
        message: 'Invalid PAN service type',
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
    fatherName: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', ''],
      default: '',
    },

    // Contact Information
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
      default: '',
    },

    // Identity Numbers
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      trim: true,
      match: [/^\d{12}$/, 'Aadhaar number must be exactly 12 digits'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      match: [
        /^([A-Z]{5}[0-9]{4}[A-Z]{1})?$/,
        'Please enter a valid 10-character PAN number (e.g. ABCDE1234F)',
      ],
    },

    // Service Customization
    deliveryMode: {
      type: String,
      enum: DELIVERY_MODES,
      default: 'Physical Card + e-PAN',
    },
    correctionDetails: {
      type: String,
      trim: true,
      default: '',
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },

    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'Medium',
    },

    // Status & Official Processing
    status: {
      type: String,
      enum: PAN_STATUSES,
      default: 'Submitted',
    },
    nsdlUtiiAckNumber: {
      type: String,
      trim: true,
      default: '', // NSDL / UTIITSL 15-digit Ack reference number entered by admin
    },
    resolutionRemarks: {
      type: String,
      default: '', // Official admin response surfaced prominently on user side
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

// Virtual field for masked Aadhaar: e.g. XXXX-XXXX-4581
panRequestSchema.virtual('maskedAadhaar').get(function () {
  if (!this.aadhaarNumber || this.aadhaarNumber.length !== 12) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
});

// Virtual field for masked PAN: e.g. ABCXXXX4F
panRequestSchema.virtual('maskedPan').get(function () {
  if (!this.panNumber || this.panNumber.length !== 10) return '';
  return `${this.panNumber.slice(0, 3)}XXXX${this.panNumber.slice(-2)}`;
});

panRequestSchema.set('toJSON', { virtuals: true });
panRequestSchema.set('toObject', { virtuals: true });

// Auto-generate ticket number pre-save (PAN-2026-00001)
panRequestSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PanRequest').countDocuments();
    const paddedIndex = String(count + 1).padStart(5, '0');
    this.ticketNumber = `PAN-${year}-${paddedIndex}`;
  }
  next();
});

// Indexes
panRequestSchema.index({ aadhaarNumber: 1 });
panRequestSchema.index({ panNumber: 1 });
panRequestSchema.index({ status: 1 });
panRequestSchema.index({ submittedBy: 1 });
panRequestSchema.index({ createdAt: -1 });
panRequestSchema.index({ updatedAt: -1 });

const PanRequest = mongoose.model('PanRequest', panRequestSchema);

export default PanRequest;

