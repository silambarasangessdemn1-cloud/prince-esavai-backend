/**
 * FarmerRequest.js
 * Mongoose model for Tamil Nadu Uzhavan / Farmer & Agriculture Citizen Services.
 * Supports: PM-KISAN Samman Nidhi, e-Patta & Chitta Land Records, FMB Sketch,
 * PMFBY Crop Insurance, Micro-Irrigation Drip Subsidy, Farm Machinery,
 * Uzhavar Sandhai ID Pass, Soil Health Card, and Subsidized Seeds/Fertilizers.
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

const FarmerRequestSchema = new mongoose.Schema(
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

    // Farmer Profile
    farmerName: {
      type: String,
      required: [true, 'Farmer name is required'],
      trim: true,
      index: true,
    },
    fatherOrHusbandName: {
      type: String,
      trim: true,
      default: '',
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact mobile number is required'],
      trim: true,
      index: true,
    },
    alternateNumber: {
      type: String,
      trim: true,
      default: '',
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', 'Other'],
      default: 'Male',
    },
    community: {
      type: String,
      enum: ['General', 'OBC', 'MBC', 'DNC', 'SC', 'ST', 'Not Specified'],
      default: 'General',
    },
    farmerCategory: {
      type: String,
      enum: ['Small Farmer (< 2.5 Acres)', 'Marginal Farmer (< 5 Acres)', 'Big Farmer (> 5 Acres)', 'Tenant Farmer', 'Agricultural Laborer'],
      default: 'Small Farmer (< 2.5 Acres)',
    },

    // Land & Revenue Details
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true,
    },
    taluk: {
      type: String,
      required: [true, 'Taluk is required'],
      trim: true,
    },
    village: {
      type: String,
      required: [true, 'Village is required'],
      trim: true,
    },
    pattaNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    surveyNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    totalLandArea: {
      type: String,
      trim: true,
      default: '1.0 Acre',
    },

    // Agriculture & Crop Specifications
    cropName: {
      type: String,
      trim: true,
      default: 'Paddy (Nellu)',
    },
    season: {
      type: String,
      enum: ['Kuruvai (Kharif)', 'Samba / Thaladi (Rabi)', 'Navarai (Summer)', 'Perennial / Annual', 'All Seasons'],
      default: 'Kuruvai (Kharif)',
    },
    irrigationSource: {
      type: String,
      enum: ['Borewell / Open Well', 'Canal / River Water', 'Rainfed (Manavari)', 'Drip / Sprinkler', 'Other'],
      default: 'Borewell / Open Well',
    },

    // Bank Account Details (for DBT Subsidies & PM-KISAN)
    bankName: {
      type: String,
      trim: true,
      default: '',
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    bankIfscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },

    // Scheme & Government Specific IDs
    pmKisanBeneficiaryId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    uzhavanAppRegNo: {
      type: String,
      trim: true,
      default: '',
    },
    cropInsurancePolicyNo: {
      type: String,
      trim: true,
      default: '',
    },
    schemeSpecificNotes: {
      type: String,
      trim: true,
      default: '',
    },

    // Documents attached
    documents: [
      {
        name: { type: String, default: '' },
        url: { type: String, default: '' },
        type: { type: String, default: 'application/pdf' },
      },
    ],

    // Workflow & Status Tracking
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Review',
        'Field Inspection Scheduled',
        'Verified',
        'Approved',
        'Resolved',
        'Rejected',
        'Closed',
      ],
      default: 'Submitted',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },

    // Official Acknowledgment and Inspection Details
    officialAckNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    fieldInspectionDate: {
      type: Date,
      default: null,
    },
    assignedOfficer: {
      type: String,
      trim: true,
      default: 'Agricultural Officer / VAO Desk',
    },
    resolutionRemarks: {
      type: String,
      trim: true,
      default: '',
    },

    // Complete Audit Log
    auditLog: [AuditLogSchema],
  },
  {
    timestamps: true,
  }
);

// Auto-generate ticket number if not provided
FarmerRequestSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    this.ticketNumber = `FARM-${yearMonth}-${randomHex}`;
  }
  next();
});

// Indexes for fast searching
FarmerRequestSchema.index({ farmerName: 'text', contactNumber: 'text', surveyNumber: 'text', pattaNumber: 'text' });

const FarmerRequest = mongoose.model('FarmerRequest', FarmerRequestSchema);

export default FarmerRequest;

