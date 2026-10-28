/**
 * farmerController.js
 * Controller for handling Uzhavan / Tamil Nadu Farmer Services, land records,
 * crop insurance, PM-KISAN, and agricultural subsidy applications.
 */

import FarmerRequest from '../models/FarmerRequest.js';

// ── Tamil Nadu Agricultural Districts Reference Data ────────────────────────
export const TN_AGRICULTURE_DISTRICTS = [
  'Ariyalur',
  'Chengalpattu',
  'Chennai',
  'Coimbatore',
  'Cuddalore',
  'Dharmapuri',
  'Dindigul',
  'Erode',
  'Kallakurichi',
  'Kanchipuram',
  'Kanyakumari',
  'Karur',
  'Krishnagiri',
  'Madurai',
  'Mayiladuthurai',
  'Nagapattinam',
  'Namakkal',
  'Nilgiris',
  'Perambalur',
  'Pudukkottai',
  'Ramanathapuram',
  'Ranipet',
  'Salem',
  'Sivaganga',
  'Tenkasi',
  'Thanjavur',
  'Theni',
  'Thoothukudi',
  'Tiruchirappalli',
  'Tirunelveli',
  'Tirupathur',
  'Tiruppur',
  'Tiruvallur',
  'Tiruvannamalai',
  'Tiruvarur',
  'Vellore',
  'Viluppuram',
  'Virudhunagar',
];

export const FARMER_SERVICES_LIST = [
  'PM-KISAN Samman Nidhi e-KYC & New Registration',
  'Tamil Nadu e-Patta & Chitta Land Records Extract',
  'FMB (Field Measurement Book) Sketch Copy Download',
  'Crop Insurance (PMFBY) Registration & Claim Filing',
  '100% Micro-Irrigation (Drip / Sprinkler) Subsidy Scheme',
  'Subsidized Farm Machinery & Tractor Allotment',
  'Uzhavar Sandhai Farmer Identity Pass (Seller ID)',
  'Soil Health Card & Soil Nutrient Test Application',
  'Subsidized Certified Seeds & Bio-Fertilizers Allotment',
  'Solar Powered Agricultural Water Pump 70% Subsidy',
];

export const MAJOR_CROPS = [
  'Paddy (Nellu)',
  'Sugarcane (Karumbu)',
  'Banana (Vazhai)',
  'Turmeric (Manjal)',
  'Cotton (Paruthi)',
  'Maize (Makka Cholam)',
  'Groundnut (Verkadalai)',
  'Coconut (Thennai)',
  'Millets (Siru Dhaniyangal)',
  'Vegetables & Horticultural Crops',
  'Pulses (Black Gram / Green Gram)',
];

/**
 * @desc    Submit new Farmer Service application
 * @route   POST /api/farmer/requests
 * @access  Public (Guest Citizens or Logged-in Citizens)
 */
export const submitFarmerRequest = async (req, res) => {
  try {
    const {
      serviceType,
      farmerName,
      fatherOrHusbandName,
      contactNumber,
      alternateNumber,
      aadhaarNumber,
      gender,
      community,
      farmerCategory,
      district,
      taluk,
      village,
      pattaNumber,
      surveyNumber,
      totalLandArea,
      cropName,
      season,
      irrigationSource,
      bankName,
      bankAccountNumber,
      bankIfscCode,
      pmKisanBeneficiaryId,
      uzhavanAppRegNo,
      cropInsurancePolicyNo,
      schemeSpecificNotes,
      documents,
      priority,
    } = req.body;

    if (!serviceType || !farmerName || !contactNumber || !district || !taluk || !village) {
      return res.status(400).json({
        success: false,
        message: 'Please provide service type, farmer name, mobile number, district, taluk, and village.',
      });
    }

    const newRequest = new FarmerRequest({
      user: req.user ? req.user._id : null,
      submittedBy: req.user ? req.user._id : null,
      submittedByName: req.user ? req.user.username : farmerName.trim(),
      serviceType,
      farmerName: farmerName.trim(),
      fatherOrHusbandName: fatherOrHusbandName ? fatherOrHusbandName.trim() : '',
      contactNumber: contactNumber.trim(),
      alternateNumber: alternateNumber ? alternateNumber.trim() : '',
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : '',
      gender: gender || 'Male',
      community: community || 'General',
      farmerCategory: farmerCategory || 'Small Farmer (< 2.5 Acres)',
      district: district.trim(),
      taluk: taluk.trim(),
      village: village.trim(),
      pattaNumber: pattaNumber ? pattaNumber.trim() : '',
      surveyNumber: surveyNumber ? surveyNumber.trim() : '',
      totalLandArea: totalLandArea ? totalLandArea.trim() : '1.0 Acre',
      cropName: cropName ? cropName.trim() : 'Paddy (Nellu)',
      season: season || 'Kuruvai (Kharif)',
      irrigationSource: irrigationSource || 'Borewell / Open Well',
      bankName: bankName ? bankName.trim() : '',
      bankAccountNumber: bankAccountNumber ? bankAccountNumber.trim() : '',
      bankIfscCode: bankIfscCode ? bankIfscCode.trim().toUpperCase() : '',
      pmKisanBeneficiaryId: pmKisanBeneficiaryId ? pmKisanBeneficiaryId.trim() : '',
      uzhavanAppRegNo: uzhavanAppRegNo ? uzhavanAppRegNo.trim() : '',
      cropInsurancePolicyNo: cropInsurancePolicyNo ? cropInsurancePolicyNo.trim() : '',
      schemeSpecificNotes: schemeSpecificNotes ? schemeSpecificNotes.trim() : '',
      documents: Array.isArray(documents) ? documents : [],
      priority: priority || 'Normal',
      status: 'Submitted',
      auditLog: [
        {
          action: 'APPLICATION_SUBMITTED',
          fromStatus: null,
          toStatus: 'Submitted',
          performedByName: farmerName.trim(),
          remarks: `Submitted application for ${serviceType}`,
        },
      ],
    });

    const saved = await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Farmer service application registered successfully!',
      data: saved,
    });
  } catch (error) {
    console.error('Error in submitFarmerRequest:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while submitting farmer request.',
    });
  }
};

/**
 * @desc    Get all Farmer applications with filters & pagination
 * @route   GET /api/farmer/requests
 * @access  Private (Citizen user's own, or Admin all)
 */
export const getFarmerRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const query = {};

    // User Id Scoping: Unless admin requesting all, citizen only sees their own submitted records
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: { page: 1, limit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        });
      }
      query.$and = [{ $or: [{ submittedBy: req.user._id }, { user: req.user._id }] }];
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }

    if (req.query.serviceType && req.query.serviceType !== 'all') {
      query.serviceType = req.query.serviceType;
    }

    if (req.query.district && req.query.district !== 'all') {
      query.district = req.query.district;
    }

    if (req.query.search) {
      const term = req.query.search.trim();
      const regex = new RegExp(term, 'i');
      const searchOr = [
        { ticketNumber: regex },
        { farmerName: regex },
        { contactNumber: regex },
        { surveyNumber: regex },
        { pattaNumber: regex },
        { village: regex },
        { district: regex },
        { pmKisanBeneficiaryId: regex },
        { officialAckNumber: regex },
      ];
      if (query.$and) {
        query.$and.push({ $or: searchOr });
      } else {
        query.$or = searchOr;
      }
    }

    const [total, requests] = await Promise.all([
      FarmerRequest.countDocuments(query),
      FarmerRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: requests,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error in getFarmerRequests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching farmer requests.',
    });
  }
};

/**
 * @desc    Get single Farmer request by ID
 * @route   GET /api/farmer/requests/:id
 * @access  Public
 */
export const getFarmerRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);

    const doc = isObjectId
      ? await FarmerRequest.findById(id).lean()
      : await FarmerRequest.findOne({ ticketNumber: id.toUpperCase() }).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Farmer service request not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    console.error('Error in getFarmerRequestById:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch request.',
    });
  }
};

/**
 * @desc    Quick lookup by identifier (ticket, mobile, patta, survey, or pm-kisan)
 * @route   GET /api/farmer/lookup/:identifier
 * @access  Public
 */
export const lookupFarmerByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    const cleanId = identifier.trim();
    const regex = new RegExp(`^${cleanId}$`, 'i');

    const results = await FarmerRequest.find({
      $or: [
        { ticketNumber: regex },
        { contactNumber: regex },
        { pattaNumber: regex },
        { surveyNumber: regex },
        { pmKisanBeneficiaryId: regex },
        { aadhaarNumber: regex },
        { officialAckNumber: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Error in lookupFarmerByIdentifier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform lookup.',
    });
  }
};

/**
 * @desc    Get aggregate statistics for Farmer requests
 * @route   GET /api/farmer/stats
 * @access  Private / Public
 */
export const getFarmerStats = async (req, res) => {
  try {
    const query = {};
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope && req.user) {
      query.$or = [{ submittedBy: req.user._id }, { user: req.user._id }];
    }

    const [
      total,
      submitted,
      underReview,
      fieldInspection,
      approved,
      resolved,
      rejected,
      byService,
    ] = await Promise.all([
      FarmerRequest.countDocuments(query),
      FarmerRequest.countDocuments({ ...query, status: 'Submitted' }),
      FarmerRequest.countDocuments({ ...query, status: 'Under Review' }),
      FarmerRequest.countDocuments({ ...query, status: 'Field Inspection Scheduled' }),
      FarmerRequest.countDocuments({ ...query, status: 'Approved' }),
      FarmerRequest.countDocuments({ ...query, status: 'Resolved' }),
      FarmerRequest.countDocuments({ ...query, status: 'Rejected' }),
      FarmerRequest.aggregate([
        { $match: query },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        submitted,
        underReview,
        fieldInspection,
        approved,
        resolved,
        completed: approved + resolved,
        rejected,
        byService,
      },
    });
  } catch (error) {
    console.error('Error in getFarmerStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load stats.',
    });
  }
};

/**
 * @desc    Update status and official department references
 * @route   PATCH /api/farmer/requests/:id/status
 * @access  Admin
 */
export const updateFarmerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionRemarks, officialAckNumber, fieldInspectionDate, assignedOfficer } = req.body;

    const request = await FarmerRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Farmer service request not found.',
      });
    }

    const previousStatus = request.status;
    if (status) request.status = status;
    if (resolutionRemarks !== undefined) request.resolutionRemarks = resolutionRemarks;
    if (officialAckNumber !== undefined) request.officialAckNumber = officialAckNumber;
    if (fieldInspectionDate !== undefined) request.fieldInspectionDate = fieldInspectionDate ? new Date(fieldInspectionDate) : null;
    if (assignedOfficer !== undefined) request.assignedOfficer = assignedOfficer;

    const operatorName = req.user ? req.user.username : 'Agricultural Officer Desk';

    request.auditLog.push({
      action: 'STATUS_UPDATED',
      fromStatus: previousStatus,
      toStatus: status || previousStatus,
      performedBy: req.user ? req.user._id : null,
      performedByName: operatorName,
      remarks: resolutionRemarks || `Status changed from ${previousStatus} to ${status}`,
    });

    const updated = await request.save();

    res.status(200).json({
      success: true,
      message: `Farmer application status successfully updated to "${status || previousStatus}"!`,
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateFarmerStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update status.',
    });
  }
};

/**
 * @desc    Permanently delete a Farmer request
 * @route   DELETE /api/farmer/requests/:id
 * @access  Admin
 */
export const deleteFarmerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FarmerRequest.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Farmer request deleted successfully.',
    });
  } catch (error) {
    console.error('Error in deleteFarmerRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request.',
    });
  }
};

/**
 * @desc    Get Farmer service metadata & options
 * @route   GET /api/farmer/meta
 * @access  Public
 */
export const getFarmerMeta = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      districts: TN_AGRICULTURE_DISTRICTS,
      services: FARMER_SERVICES_LIST,
      crops: MAJOR_CROPS,
      seasons: ['Kuruvai (Kharif)', 'Samba / Thaladi (Rabi)', 'Navarai (Summer)', 'Perennial / Annual', 'All Seasons'],
      categories: ['Small Farmer (< 2.5 Acres)', 'Marginal Farmer (< 5 Acres)', 'Big Farmer (> 5 Acres)', 'Tenant Farmer', 'Agricultural Laborer'],
    },
  });
};

