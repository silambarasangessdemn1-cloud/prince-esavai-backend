/**
 * vehicleController.js
 * Controller for handling Vahan Vehicle Services requests, status tracking,
 * stats aggregation, and administrative resolution.
 */

import VehicleRequest from '../models/VehicleRequest.js';

// ── Tamil Nadu RTO Offices & Services Reference Data ────────────────────────
export const TN_RTO_OFFICES = [
  'TN-01 Chennai Central (Ayanavaram)',
  'TN-02 Chennai North West (Anna Nagar)',
  'TN-03 Chennai North East (Tondiarpet)',
  'TN-04 Chennai East (Royapuram)',
  'TN-05 Chennai North (Kolathur)',
  'TN-06 Chennai South East (Mandavelli)',
  'TN-07 Chennai South (Thiruvanmiyur)',
  'TN-09 Chennai West (K.K. Nagar)',
  'TN-10 Chennai South West (Virugambakkam)',
  'TN-11 Tambaram',
  'TN-12 Poonamallee',
  'TN-13 Ambattur',
  'TN-14 Sholinganallur',
  'TN-18 Red Hills',
  'TN-20 Tiruvallur',
  'TN-21 Kanchipuram',
  'TN-22 Meenambakkam',
  'TN-23 Vellore',
  'TN-25 Tiruvannamalai',
  'TN-27 Salem (West)',
  'TN-30 Salem (East)',
  'TN-33 Erode (East)',
  'TN-37 Coimbatore (South)',
  'TN-38 Coimbatore (North)',
  'TN-45 Tiruchirappalli',
  'TN-49 Thanjavur',
  'TN-58 Madurai (South)',
  'TN-59 Madurai (North)',
  'TN-67 Virudhunagar',
  'TN-69 Thoothukudi',
  'TN-72 Tirunelveli',
  'TN-74 Nagercoil',
];

export const VEHICLE_SERVICES_LIST = [
  'All India Vehicle RC (Detailed Extract)',
  'Vehicle Insurance Details & Validity Check',
  'Emission Test Report (PUCC Download & QR Verification)',
  'Vehicle RC Smart Card PDF (Form 23 Download)',
  'Link Mobile Number to Vehicle RC (Without OTP)',
  'Traffic Fine & e-Challan Instant Settlement',
  'Transfer of Ownership (RC Transfer / Form 29 & 30)',
  'Issue of Duplicate RC (Form 26 - Lost / Damaged)',
  'Change of Address in Vehicle RC',
  'Hypothecation Addition / Endorsement / Termination (HPA / HPT)',
];

export const VEHICLE_CLASSES = [
  'Motorcycle with Gear (MCWG)',
  'Motorcycle without Gear (Scooter / Moped)',
  'Motor Car (LMV - Private)',
  'Light Commercial Vehicle (LGV)',
  'Auto Rickshaw (3-Wheeler Cab)',
  'E-Rickshaw / E-Cart',
  'Goods Carrier (HGV / Medium)',
  'Passenger Bus / Maxi Cab',
  'Agricultural Tractor & Trailer',
];

export const FUEL_TYPES = [
  'Petrol',
  'Diesel',
  'Electric (EV)',
  'CNG',
  'Hybrid',
  'LPG',
  'Other',
];

/**
 * @desc    Submit new Vehicle Service application
 * @route   POST /api/vehicle/requests
 * @access  Public (Guest Citizens or Logged-in Citizens)
 */
export const submitVehicleRequest = async (req, res) => {
  try {
    const {
      serviceType,
      vehicleNumber,
      chassisNumber,
      engineNumber,
      vehicleClass,
      makerModel,
      fuelType,
      ownerName,
      ownerPhone,
      ownerEmail,
      aadhaarNumber,
      rtoOffice,
      insurancePolicyNumber,
      insuranceCompany,
      insuranceExpiryDate,
      puccNumber,
      puccExpiryDate,
      hypothecationBank,
      challanNumber,
      challanAmount,
      newOwnerName,
      newOwnerPhone,
      newAddress,
      remarksOrNotes,
      priority,
    } = req.body;

    if (!serviceType || !vehicleNumber || !ownerName || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide service type, vehicle registration number, owner name, and contact phone.',
      });
    }

    // Clean normalized registration number (e.g. TN-01-AB-1234 or TN01AB1234 -> TN 01 AB 1234)
    const normalizedReg = vehicleNumber.trim().toUpperCase().replace(/\s+/g, ' ');

    const newRequest = new VehicleRequest({
      user: req.user ? req.user._id : null,
      submittedBy: req.user ? req.user._id : null,
      submittedByName: req.user ? req.user.username : ownerName.trim(),
      serviceType,
      vehicleNumber: normalizedReg,
      chassisNumber: chassisNumber ? chassisNumber.trim().toUpperCase() : '',
      engineNumber: engineNumber ? engineNumber.trim().toUpperCase() : '',
      vehicleClass: vehicleClass || 'Motor Car (LMV - Private)',
      makerModel: makerModel ? makerModel.trim() : '',
      fuelType: fuelType || 'Petrol',
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail ? ownerEmail.trim().toLowerCase() : '',
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : '',
      rtoOffice: rtoOffice || 'TN-01 Chennai Central (Ayanavaram)',
      insurancePolicyNumber: insurancePolicyNumber ? insurancePolicyNumber.trim() : '',
      insuranceCompany: insuranceCompany ? insuranceCompany.trim() : '',
      insuranceExpiryDate: insuranceExpiryDate || null,
      puccNumber: puccNumber ? puccNumber.trim() : '',
      puccExpiryDate: puccExpiryDate || null,
      hypothecationBank: hypothecationBank ? hypothecationBank.trim() : '',
      challanNumber: challanNumber ? challanNumber.trim().toUpperCase() : '',
      challanAmount: challanAmount ? Number(challanAmount) : 0,
      newOwnerName: newOwnerName ? newOwnerName.trim() : '',
      newOwnerPhone: newOwnerPhone ? newOwnerPhone.trim() : '',
      newAddress: newAddress ? newAddress.trim() : '',
      remarksOrNotes: remarksOrNotes ? remarksOrNotes.trim() : '',
      priority: priority || 'Medium',
      status: 'Submitted',
      auditLog: [
        {
          action: 'APPLICATION_SUBMITTED',
          fromStatus: null,
          toStatus: 'Submitted',
          performedByName: ownerName.trim(),
          remarks: `Vehicle application initiated for ${serviceType} (${normalizedReg}).`,
          createdAt: new Date(),
        },
      ],
    });

    const saved = await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle service application submitted successfully!',
      data: saved,
    });
  } catch (error) {
    console.error('Error in submitVehicleRequest:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit vehicle service application.',
    });
  }
};

/**
 * @desc    Get paginated vehicle requests with search and status filters
 * @route   GET /api/vehicle/requests
 * @access  Public / Admin
 */
export const getVehicleRequests = async (req, res) => {
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

    if (req.query.search) {
      const term = req.query.search.trim();
      const regex = new RegExp(term, 'i');
      const searchOr = [
        { ticketNumber: regex },
        { vehicleNumber: regex },
        { ownerName: regex },
        { ownerPhone: regex },
        { chassisNumber: regex },
        { engineNumber: regex },
        { challanNumber: regex },
        { vahanAckNumber: regex },
        { rtoOffice: regex },
      ];
      if (query.$and) {
        query.$and.push({ $or: searchOr });
      } else {
        query.$or = searchOr;
      }
    }

    const [total, requests] = await Promise.all([
      VehicleRequest.countDocuments(query),
      VehicleRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    console.error('Error in getVehicleRequests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle service requests.',
    });
  }
};

/**
 * @desc    Get single vehicle request by ID
 * @route   GET /api/vehicle/requests/:id
 * @access  Public / Admin
 */
export const getVehicleRequestById = async (req, res) => {
  try {
    const request = await VehicleRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle service ticket not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy || request.user) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this ticket.',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error in getVehicleRequestById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle service ticket.',
    });
  }
};

/**
 * @desc    Get Vehicle queue statistics
 * @route   GET /api/vehicle/stats
 * @access  Public / Admin
 */
export const getVehicleStats = async (req, res) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { $or: [{ submittedBy: req.user._id }, { user: req.user._id }] } : { submittedBy: null };

    const [total, byStatus, byPriority] = await Promise.all([
      VehicleRequest.countDocuments(matchFilter),
      VehicleRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      VehicleRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = {
      Submitted: 0,
      'Under Review': 0,
      'In Progress': 0,
      'RTO Verification': 0,
      'Fitness / Inspection Scheduled': 0,
      Resolved: 0,
      Rejected: 0,
      Closed: 0,
    };
    byStatus.forEach((item) => {
      if (item._id) statusMap[item._id] = item.count;
    });

    const priorityMap = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0,
    };
    byPriority.forEach((item) => {
      if (item._id) priorityMap[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: statusMap,
        byPriority: priorityMap,
      },
    });
  } catch (error) {
    console.error('Error in getVehicleStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle statistics.',
    });
  }
};

/**
 * @desc    Lookup vehicle application by Ticket Number, Vehicle Registration, Phone, or Challan Number
 * @route   GET /api/vehicle/lookup/:identifier
 * @access  Public
 */
export const lookupVehicleByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required for lookup.',
      });
    }

    const clean = identifier.trim().toUpperCase();
    const cleanNoSpace = clean.replace(/[\s-]+/g, '');

    // Search query matching ticketNumber, vehicleNumber, phone, or challan
    const searchOr = [
      { ticketNumber: new RegExp(`^${clean}$`, 'i') },
      { ownerPhone: clean },
      { challanNumber: clean },
      { vehicleNumber: clean },
      { vehicleNumber: new RegExp(cleanNoSpace, 'i') },
      { vahanAckNumber: clean },
    ];

    const query = {};
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
      query.$and = [
        { $or: [{ submittedBy: req.user._id }, { user: req.user._id }] },
        { $or: searchOr },
      ];
    } else {
      query.$or = searchOr;
    }

    const results = await VehicleRequest.find(query).sort({ createdAt: -1 }).limit(10).lean();

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Error in lookupVehicleByIdentifier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup vehicle application.',
    });
  }
};

/**
 * @desc    Admin updates vehicle request status, Vahan ack number, and resolution remarks
 * @route   PATCH /api/vehicle/requests/:id/status
 * @access  Public / Admin
 */
export const updateVehicleStatus = async (req, res) => {
  try {
    const { status, resolutionRemarks, vahanAckNumber, rtoSlotDate, challanSettlementRef } = req.body;

    const request = await VehicleRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle service ticket not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy || request.user) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this ticket.',
      });
    }

    const oldStatus = request.status;

    if (status) request.status = status;
    if (vahanAckNumber !== undefined) request.vahanAckNumber = vahanAckNumber.trim();
    if (challanSettlementRef !== undefined) request.challanSettlementRef = challanSettlementRef.trim();
    if (rtoSlotDate !== undefined) request.rtoSlotDate = rtoSlotDate ? new Date(rtoSlotDate) : null;
    if (resolutionRemarks !== undefined) request.resolutionRemarks = resolutionRemarks.trim();

    if (status === 'Resolved') {
      request.resolvedAt = new Date();
      if (req.user) request.resolvedBy = req.user._id;
    }

    // Append to audit log
    request.auditLog.push({
      action: 'STATUS_UPDATED',
      fromStatus: oldStatus,
      toStatus: status || oldStatus,
      performedBy: req.user ? req.user._id : null,
      performedByName: req.user?.name || 'Vahan Admin Officer',
      remarks: resolutionRemarks || `Status changed from ${oldStatus} to ${status || oldStatus}`,
      createdAt: new Date(),
    });

    const updated = await request.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle application status updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateVehicleStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update vehicle application status.',
    });
  }
};

/**
 * @desc    Delete vehicle request
 * @route   DELETE /api/vehicle/requests/:id
 * @access  Public / Admin
 */
export const deleteVehicleRequest = async (req, res) => {
  try {
    const request = await VehicleRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle service ticket not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy || request.user) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this ticket.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle service ticket deleted successfully.',
    });
  } catch (error) {
    console.error('Error in deleteVehicleRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle service ticket.',
    });
  }
};

/**
 * @desc    Get metadata (services, vehicle classes, fuel types, RTOs)
 * @route   GET /api/vehicle/meta
 * @access  Public
 */
export const getVehicleMeta = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        services: VEHICLE_SERVICES_LIST,
        vehicleClasses: VEHICLE_CLASSES,
        fuelTypes: FUEL_TYPES,
        rtoOffices: TN_RTO_OFFICES,
      },
    });
  } catch (error) {
    console.error('Error in getVehicleMeta:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vehicle metadata.',
    });
  }
};

