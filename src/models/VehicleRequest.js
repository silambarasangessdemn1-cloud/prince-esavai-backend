/**
 * VehicleRequest.js
 * Mongoose model for Vahan Parivahan / Vehicle RC Services in Tamil Nadu.
 * Supports: All India RC, Insurance, PUCC Emission, Duplicate RC, RC Transfer,
 * Address Change, HPA/HPT Hypothecation, Mobile Link without OTP, and Traffic Fine / e-Challan.
 */

import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: 'System Operator' },
    remarks: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VehicleRequestSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    submittedByName: {
      type: String,
      default: '',
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true,
      index: true,
    },

    // Vehicle Identification Details
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    engineNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    vehicleClass: {
      type: String,
      trim: true,
      default: 'Motor Car (LMV)',
    },
    makerModel: {
      type: String,
      trim: true,
      default: '',
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric (EV)', 'CNG', 'Hybrid', 'LPG', 'Other'],
      default: 'Petrol',
    },

    // Current Owner Info
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    ownerPhone: {
      type: String,
      required: [true, 'Owner contact phone is required'],
      trim: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: '',
    },
    maskedAadhaar: {
      type: String,
      default: '',
    },
    rtoOffice: {
      type: String,
      trim: true,
      default: 'TN-01 Chennai Central',
    },

    // Specific Service Fields
    // 1. Insurance
    insurancePolicyNumber: {
      type: String,
      trim: true,
      default: '',
    },
    insuranceCompany: {
      type: String,
      trim: true,
      default: '',
    },
    insuranceExpiryDate: {
      type: Date,
      default: null,
    },

    // 2. Pollution (PUCC)
    puccNumber: {
      type: String,
      trim: true,
      default: '',
    },
    puccExpiryDate: {
      type: Date,
      default: null,
    },

    // 3. Hypothecation (HPA / HPT)
    hypothecationBank: {
      type: String,
      trim: true,
      default: '',
    },

    // 4. Traffic Fine / e-Challan
    challanNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    challanAmount: {
      type: Number,
      default: 0,
    },
    challanSettlementRef: {
      type: String,
      trim: true,
      default: '',
    },

    // 5. Transfer of Ownership (Buyer Details)
    newOwnerName: {
      type: String,
      trim: true,
      default: '',
    },
    newOwnerPhone: {
      type: String,
      trim: true,
      default: '',
    },

    // 6. Address Change / New Address
    newAddress: {
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
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },

    // Vahan Processing Status
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Review',
        'In Progress',
        'RTO Verification',
        'Fitness / Inspection Scheduled',
        'Resolved',
        'Rejected',
        'Closed',
      ],
      default: 'Submitted',
      index: true,
    },

    // Official Admin Resolution details
    vahanAckNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    rtoSlotDate: {
      type: Date,
      default: null,
    },
    resolutionRemarks: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    auditLog: [AuditLogSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Auto-generate Ticket Number VEH-2026-XXXXX
VehicleRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('VehicleRequest').countDocuments();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.ticketNumber = `VEH-${year}-${String(count + 1).padStart(4, '0')}${randomSuffix.toString().slice(-2)}`;
  }

  // Auto mask Aadhaar if provided
  if (this.aadhaarNumber && this.aadhaarNumber.length === 12 && !this.maskedAadhaar) {
    this.maskedAadhaar = `XXXX-XXXX-${this.aadhaarNumber.slice(-4)}`;
  }

  next();
});

// Indexes for fast querying & lookups
VehicleRequestSchema.index({ vehicleNumber: 1, createdAt: -1 });
VehicleRequestSchema.index({ ownerPhone: 1, createdAt: -1 });
VehicleRequestSchema.index({ status: 1, priority: 1 });
VehicleRequestSchema.index({ challanNumber: 1 });
VehicleRequestSchema.index({ submittedBy: 1, createdAt: -1 });

const VehicleRequest = mongoose.model('VehicleRequest', VehicleRequestSchema);

export default VehicleRequest;

