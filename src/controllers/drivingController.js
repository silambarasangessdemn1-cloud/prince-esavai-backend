import DrivingRequest, {
  DRIVING_SERVICE_TYPES,
  VEHICLE_CLASSES,
  BLOOD_GROUPS,
  DRIVING_STATUSES,
  PRIORITY_LEVELS,
  RELATION_TYPES,
} from '../models/DrivingRequest.js';

const buildAuditEntry = (action, user, fromStatus, toStatus, remarks = '') => ({
  action,
  fromStatus: fromStatus || null,
  toStatus: toStatus || null,
  performedBy: user._id,
  performedByName: user.username,
  remarks: remarks ? remarks.trim() : '',
});

// ─────────────────────────────────────────────────────────────
//  @desc    Get Driving Service metadata (Services, Vehicle Classes, Enums)
//  @route   GET /api/driving/meta
//  @access  Public
// ─────────────────────────────────────────────────────────────
export const getDrivingMeta = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        serviceTypes: DRIVING_SERVICE_TYPES,
        vehicleClasses: VEHICLE_CLASSES,
        bloodGroups: BLOOD_GROUPS,
        statuses: DRIVING_STATUSES,
        priorities: PRIORITY_LEVELS,
        relationTypes: RELATION_TYPES,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Submit a new Driving Service application
//  @route   POST /api/driving/requests
//  @access  Public / Private (Logged-in or Guest Citizen)
// ─────────────────────────────────────────────────────────────
export const submitDrivingRequest = async (req, res, next) => {
  try {
    const {
      serviceType,
      drivingLicenseNumber,
      learnerLicenseNumber,
      vehicleClass,
      applicantName,
      relativeName,
      relationType,
      gender,
      dateOfBirth,
      bloodGroup,
      applicantPhone,
      applicantEmail,
      aadhaarNumber,
      state,
      rtoOffice,
      newAddress,
      correctionDetails,
      remarksOrNotes,
      priority,
    } = req.body;

    if (!applicantName || !applicantName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_NAME',
        message: 'Applicant name is required.',
      });
    }

    const cleanPhone = String(applicantPhone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PHONE',
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    let cleanAadhaar = '';
    if (aadhaarNumber && String(aadhaarNumber).trim()) {
      cleanAadhaar = String(aadhaarNumber).replace(/\D/g, '');
      if (cleanAadhaar.length !== 12) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_AADHAAR',
          message: 'Aadhaar number must be exactly 12 digits.',
        });
      }
    }

    let cleanDL = '';
    if (drivingLicenseNumber && String(drivingLicenseNumber).trim()) {
      cleanDL = String(drivingLicenseNumber).trim().toUpperCase();
    }

    let cleanLL = '';
    if (learnerLicenseNumber && String(learnerLicenseNumber).trim()) {
      cleanLL = String(learnerLicenseNumber).trim().toUpperCase();
    }

    const currentUser = req.user || {
      _id: '65e000000000000000000001',
      username: applicantName.trim(),
      role: 'citizen',
    };

    const initialAudit = {
      action: `Driving Service Application Created: ${serviceType}`,
      fromStatus: null,
      toStatus: 'Submitted',
      performedBy: currentUser._id,
      performedByName: currentUser.username,
      remarks: 'Application successfully queued for Sarathi Parivahan RTO processing.',
    };

    const newRequest = new DrivingRequest({
      serviceType,
      drivingLicenseNumber: cleanDL,
      learnerLicenseNumber: cleanLL,
      vehicleClass: vehicleClass || 'MCWG + LMV (Two Wheeler + Four Wheeler)',
      applicantName: applicantName.trim(),
      relativeName: relativeName ? relativeName.trim() : '',
      relationType: relationType || 'Father',
      gender: gender || 'Male',
      dateOfBirth: dateOfBirth || '',
      bloodGroup: bloodGroup || 'O+',
      applicantPhone: cleanPhone,
      applicantEmail: applicantEmail ? applicantEmail.trim().toLowerCase() : '',
      aadhaarNumber: cleanAadhaar,
      state: state || 'Tamil Nadu',
      rtoOffice: rtoOffice || 'TN-54 Salem South',
      newAddress: newAddress ? newAddress.trim() : '',
      correctionDetails: correctionDetails ? correctionDetails.trim() : '',
      remarksOrNotes: remarksOrNotes ? remarksOrNotes.trim() : '',
      priority: priority || 'Medium',
      status: 'Submitted',
      submittedBy: currentUser._id,
      submittedByName: currentUser.username,
      auditLog: [initialAudit],
    });

    const saved = await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Driving service application submitted successfully.',
      ticketNumber: saved.ticketNumber,
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get all Driving service requests (Filterable, Paginated)
//  @route   GET /api/driving/requests
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getDrivingRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      serviceType,
      rtoOffice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // User Id Scoping: Unless admin requesting all, citizen only sees their own submitted records
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: { page: 1, limit: parseInt(limit, 10) || 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        });
      }
      query.submittedBy = req.user._id;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (serviceType && serviceType !== 'All') {
      query.serviceType = serviceType;
    }

    if (rtoOffice && rtoOffice !== 'All') {
      query.rtoOffice = rtoOffice;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { ticketNumber: regex },
        { applicantName: regex },
        { drivingLicenseNumber: regex },
        { learnerLicenseNumber: regex },
        { applicantPhone: regex },
        { aadhaarNumber: regex },
        { sarathiAckNumber: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      DrivingRequest.find(query).sort(sort).skip(skip).limit(pageSize),
      DrivingRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get a single Driving request by ID or Ticket Number
//  @route   GET /api/driving/requests/:id
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getDrivingRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let request = null;
    if (id.startsWith('DRV-')) {
      request = await DrivingRequest.findOne({ ticketNumber: id });
    } else {
      request = await DrivingRequest.findById(id);
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Driving request '${id}' not found.`,
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this request.',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Aggregate Driving stats for Dashboard & Operator Queue
//  @route   GET /api/driving/stats
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getDrivingStats = async (req, res, next) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { submittedBy: req.user._id } : { submittedBy: null };

    const [statusStats, serviceStats, total] = await Promise.all([
      DrivingRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DrivingRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      ]),
      DrivingRequest.countDocuments(matchFilter),
    ]);

    const byStatus = {};
    DRIVING_STATUSES.forEach((st) => (byStatus[st] = 0));
    statusStats.forEach((s) => {
      byStatus[s._id] = s.count;
    });

    const byService = {};
    serviceStats.forEach((s) => {
      byService[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byService,
        availableStatuses: DRIVING_STATUSES,
        availableServices: DRIVING_SERVICE_TYPES,
        availableVehicleClasses: VEHICLE_CLASSES,
        availablePriorities: PRIORITY_LEVELS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Lookup requests by DL Number, LL Number, Aadhaar or Mobile
//  @route   GET /api/driving/lookup/:identifier
//  @access  Public
// ─────────────────────────────────────────────────────────────
export const lookupDrivingByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const cleanId = String(identifier || '').trim().toUpperCase();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IDENTIFIER',
        message: 'Please provide a Driving License Number, Aadhaar Number, or Mobile Number.',
      });
    }

    const query = {
      $or: [
        { drivingLicenseNumber: cleanId },
        { learnerLicenseNumber: cleanId },
        { aadhaarNumber: cleanId.replace(/\D/g, '') },
        { applicantPhone: cleanId.replace(/\D/g, '') },
        { ticketNumber: cleanId },
        { sarathiAckNumber: cleanId },
      ],
    };

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: [],
          summary: { totalRequests: 0, byStatus: {} },
          identifier: cleanId,
        });
      }
      query.submittedBy = req.user._id;
    }

    const requests = await DrivingRequest.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
      summary: {
        totalRequests: requests.length,
        byStatus: requests.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
      },
      identifier: cleanId,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Update Driving request status & resolution remarks
//  @route   PATCH /api/driving/requests/:id/status
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const updateDrivingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, sarathiAckNumber, rtoSlotDate, resolutionRemarks, assignedToName } = req.body;

    const request = await DrivingRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Driving application not found.',
      });
    }

    const previousStatus = request.status;
    const targetStatus = status || request.status;

    if (status && !DRIVING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${DRIVING_STATUSES.join(', ')}`,
      });
    }

    const currentUser = req.user || {
      _id: '65e000000000000000000002',
      username: 'Administrator',
      role: 'admin',
    };

    if (status) request.status = status;
    if (sarathiAckNumber !== undefined) request.sarathiAckNumber = sarathiAckNumber.trim();
    if (rtoSlotDate !== undefined) request.rtoSlotDate = rtoSlotDate.trim();
    if (resolutionRemarks !== undefined) request.resolutionRemarks = resolutionRemarks.trim();
    if (assignedToName !== undefined) request.assignedToName = assignedToName.trim();

    if (status === 'Resolved' && previousStatus !== 'Resolved') {
      request.resolvedAt = new Date();
    }

    const auditEntry = buildAuditEntry(
      `Status changed: ${previousStatus} ➜ ${targetStatus}`,
      currentUser,
      previousStatus,
      targetStatus,
      resolutionRemarks || (sarathiAckNumber ? `Sarathi Reference generated: ${sarathiAckNumber}` : '')
    );
    request.auditLog.push(auditEntry);

    const updated = await request.save();

    res.status(200).json({
      success: true,
      message: `Driving application ${updated.ticketNumber} updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Add an internal audit note to a Driving request
//  @route   POST /api/driving/requests/:id/audit
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const addDrivingAuditLogEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!action || !action.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Action description is required.',
      });
    }

    const request = await DrivingRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Driving request not found.',
      });
    }

    const currentUser = req.user || {
      _id: '65e000000000000000000002',
      username: 'Operator',
    };

    const newAudit = buildAuditEntry(
      action.trim(),
      currentUser,
      request.status,
      request.status,
      remarks || ''
    );

    request.auditLog.push(newAudit);
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Audit log entry added.',
      data: request.auditLog,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Delete a Driving application
//  @route   DELETE /api/driving/requests/:id
//  @access  Private (Admin only)
// ─────────────────────────────────────────────────────────────
export const deleteDrivingRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await DrivingRequest.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Driving application not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driving application deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

