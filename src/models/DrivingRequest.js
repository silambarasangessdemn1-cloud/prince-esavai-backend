import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
//  Driving Service Form Types (Sarathi Parivahan / MoRTH / e-Sevai)
// ─────────────────────────────────────────────────────────────
export const DRIVING_SERVICE_TYPES = [
  'Learner License Application (LL)',
  'Permanent Driving License (DL)',
  'DL Renewal / Expiry Extension',
  'Duplicate Driving License',
  'Change of Address in DL',
  'Mobile Number Link & Update',
  'Download Digital DL & PVC File',
  'Find Lost DL Number',
];

export const VEHICLE_CLASSES = [
  'MCWG - Motorcycle With Gear',
  'MCWOG - Motorcycle Without Gear (Scooter)',
  'LMV - Light Motor Vehicle (Car/Jeep)',
  'MCWG + LMV (Two Wheeler + Four Wheeler)',
  'TRANS - Transport / Commercial Vehicle',
  'Other Class',
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

export const DRIVING_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'RTO Slot Booked',
  'Pending Verification',
  'Resolved',
  'Rejected',
  'Closed',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Urgent'];

export const RELATION_TYPES = ['Father', 'Mother', 'Husband', 'Guardian'];

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
//  Driving Request Schema (Reusable, Scalable & Production-Ready)
// ─────────────────────────────────────────────────────────────
const drivingRequestSchema = new mongoose.Schema(
  {
    // Unique Ticket Reference e.g. DRV-2026-00001
    ticketNumber: {
      type: String,
      unique: true,
    },

    // Selected Driving Service / Form Type
    serviceType: {
      type: String,
      required: [true, 'Driving service type is required'],
      enum: {
        values: DRIVING_SERVICE_TYPES,
        message: 'Invalid Driving service type',
      },
    },

    // Driving License Number (e.g. TN-01-2018-0012345 or 16 chars)
    drivingLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    // Learner License Number (for permanent DL applications)
    learnerLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    // Class of Vehicle (MCWG, LMV, etc.)
    vehicleClass: {
      type: String,
      enum: VEHICLE_CLASSES,
      default: 'MCWG + LMV (Two Wheeler + Four Wheeler)',
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
      enum: RELATION_TYPES,
      default: 'Father',
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

    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      default: 'O+',
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

    // 12-Digit Aadhaar of Applicant
    aadhaarNumber: {
      type: String,
      trim: true,
      match: [/^\d{12}$|^$/, 'Aadhaar number must be exactly 12 digits'],
      default: '',
    },

    // Address & RTO Office Info
    state: {
      type: String,
      default: 'Tamil Nadu',
      trim: true,
    },

    rtoOffice: {
      type: String,
      required: [true, 'RTO office code / name is required'],
      trim: true,
      default: 'TN-54 Salem South',
    },

    newAddress: {
      type: String,
      trim: true,
      default: '', // For Address Change in DL
    },

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

    // Official Status & Sarathi Parivahan Tracking
    status: {
      type: String,
      enum: DRIVING_STATUSES,
      default: 'Submitted',
    },

    sarathiAckNumber: {
      type: String,
      trim: true,
      default: '', // Sarathi Reference e.g. SAR-2026-981245
    },

    rtoSlotDate: {
      type: String,
      trim: true,
      default: '', // RTO Slot / Test Appointment Date
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
drivingRequestSchema.virtual('maskedAadhaar').get(function () {
  if (!this.aadhaarNumber || this.aadhaarNumber.length !== 12) return '';
  return `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
});

drivingRequestSchema.set('toJSON', { virtuals: true });
drivingRequestSchema.set('toObject', { virtuals: true });

// Auto-generate ticket number pre-validate (DRV-2026-00001)
drivingRequestSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('DrivingRequest').countDocuments();
    const paddedIndex = String(count + 1).padStart(5, '0');
    this.ticketNumber = `DRV-${year}-${paddedIndex}`;
  }
  next();
});

// Indexes for fast querying
drivingRequestSchema.index({ drivingLicenseNumber: 1 });
drivingRequestSchema.index({ learnerLicenseNumber: 1 });
drivingRequestSchema.index({ aadhaarNumber: 1 });
drivingRequestSchema.index({ applicantPhone: 1 });
drivingRequestSchema.index({ status: 1 });
drivingRequestSchema.index({ submittedBy: 1 });
drivingRequestSchema.index({ createdAt: -1 });
drivingRequestSchema.index({ updatedAt: -1 });

const DrivingRequest = mongoose.model('DrivingRequest', drivingRequestSchema);

export default DrivingRequest;

