import AadhaarIssue, {
  AADHAAR_ISSUE_TYPES,
  PRIORITY_LEVELS,
  ISSUE_STATUSES,
} from '../models/AadhaarIssue.js';

// ─────────────────────────────────────────────────────────────
//  Helper: build an audit log entry
// ─────────────────────────────────────────────────────────────
const buildAuditEntry = (action, user, fromStatus, toStatus, remarks = '') => ({
  action,
  fromStatus,
  toStatus,
  performedBy: user._id,
  performedByName: user.username,
  remarks,
});

// ─────────────────────────────────────────────────────────────
//  @desc    Get all valid issue types, priorities and statuses
//  @route   GET /api/aadhaar/meta
//  @access  Public
// ─────────────────────────────────────────────────────────────
export const getMeta = (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      issueTypes: AADHAAR_ISSUE_TYPES,
      priorities: PRIORITY_LEVELS,
      statuses: ISSUE_STATUSES,
    },
  });
};

// ─────────────────────────────────────────────────────────────
//  @desc    Submit a new Aadhaar issue
//  @route   POST /api/aadhaar/issues
//  @access  Private (requires JWT)
// ─────────────────────────────────────────────────────────────
export const submitIssue = async (req, res, next) => {
  try {
    const {
      aadhaarNumber,
      applicantName,
      applicantPhone,
      applicantEmail,
      issueType,
      issueDescription,
      priority,
      documents,
    } = req.body;

    const issue = await AadhaarIssue.create({
      aadhaarNumber,
      applicantName,
      applicantPhone,
      applicantEmail: applicantEmail || '',
      issueType,
      issueDescription,
      priority: priority || 'Medium',
      documents: documents || [],
      submittedBy: req.user._id,
      submittedByName: req.user.username,
      auditLog: [
        buildAuditEntry(
          'Issue Submitted',
          req.user,
          null,
          'Submitted',
          `Issue submitted by ${req.user.username}`
        ),
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Aadhaar issue submitted successfully',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    List ALL issues (paginated, filterable)
//  @route   GET /api/aadhaar/issues
//  @access  Private
//  Query params: page, limit, status, priority, issueType, search
// ─────────────────────────────────────────────────────────────
export const listAllIssues = async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 20);
    const skip     = (page - 1) * limit;

    // Build query filter
    const filter = {};

    // User Id Scoping: Unless admin requesting all, citizen only sees their own submitted records
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: {
            issues: [],
            pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          },
        });
      }
      filter.submittedBy = req.user._id;
    }

    if (req.query.status)    filter.status    = req.query.status;
    if (req.query.priority)  filter.priority  = req.query.priority;
    if (req.query.issueType) filter.issueType = req.query.issueType;

    // Search by applicant name or ticket number
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { applicantName: regex },
        { ticketNumber: regex },
        { applicantPhone: regex },
      ];
    }

    const [issues, total] = await Promise.all([
      AadhaarIssue.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'username phoneNumber')
        .select('-auditLog'),   // exclude heavy audit log from list view
      AadhaarIssue.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        issues,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get ALL issues for a specific Aadhaar number
//  @route   GET /api/aadhaar/issues/by-aadhaar/:aadhaarNumber
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getIssuesByAadhaar = async (req, res, next) => {
  try {
    const { aadhaarNumber } = req.params;

    // Validate 12-digit format
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AADHAAR',
        message: 'Aadhaar number must be exactly 12 digits.',
      });
    }

    const filter = { aadhaarNumber };
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: {
            aadhaarNumber: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
            summary: { totalIssues: 0, byStatus: {}, byIssueType: {} },
            issues: [],
          },
        });
      }
      filter.submittedBy = req.user._id;
    }

    const issues = await AadhaarIssue.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('submittedBy', 'username phoneNumber')
      .populate('assignedTo', 'username phoneNumber');

    const summary = {
      totalIssues: issues.length,
      byStatus: {},
      byIssueType: {},
    };

    issues.forEach((issue) => {
      summary.byStatus[issue.status] = (summary.byStatus[issue.status] || 0) + 1;
      summary.byIssueType[issue.issueType] = (summary.byIssueType[issue.issueType] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        aadhaarNumber: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`, // masked
        summary,
        issues,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get a single issue by ID (with full audit trail)
//  @route   GET /api/aadhaar/issues/:id
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getIssueById = async (req, res, next) => {
  try {
    const issue = await AadhaarIssue.findById(req.params.id)
      .populate('submittedBy', 'username phoneNumber')
      .populate('assignedTo', 'username phoneNumber')
      .populate('auditLog.performedBy', 'username');

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'ISSUE_NOT_FOUND',
        message: 'No issue found with the provided ID.',
      });
    }

    if (req.user?.role !== 'admin' && String(issue.submittedBy?._id || issue.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this issue.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Update issue status (with audit trail)
//  @route   PATCH /api/aadhaar/issues/:id/status
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const updateIssueStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!status || !ISSUE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${ISSUE_STATUSES.join(', ')}`,
      });
    }

    const issue = await AadhaarIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'ISSUE_NOT_FOUND',
        message: 'No issue found with the provided ID.',
      });
    }

    if (req.user?.role !== 'admin' && String(issue.submittedBy?._id || issue.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this issue.',
      });
    }

    const previousStatus = issue.status;
    issue.status = status;
    issue.auditLog.push(
      buildAuditEntry(
        `Status changed to '${status}'`,
        req.user,
        previousStatus,
        status,
        remarks || ''
      )
    );

    // Store admin remarks as the resolution/response message
    if (remarks && remarks.trim()) {
      issue.resolutionRemarks = remarks.trim();
    }

    // If resolved or closed, stamp the resolved time
    if (status === 'Resolved' || status === 'Closed') {
      issue.resolvedAt = new Date();
    }

    await issue.save();

    return res.status(200).json({
      success: true,
      message: `Issue status updated to '${status}'`,
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Assign issue to an agent
//  @route   PATCH /api/aadhaar/issues/:id/assign
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const assignIssue = async (req, res, next) => {
  try {
    const { assignedToId, assignedToName, remarks } = req.body;

    if (!assignedToId || !assignedToName) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'assignedToId and assignedToName are required.',
      });
    }

    const issue = await AadhaarIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'ISSUE_NOT_FOUND',
        message: 'No issue found with the provided ID.',
      });
    }

    if (req.user?.role !== 'admin' && String(issue.submittedBy?._id || issue.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this issue.',
      });
    }

    const previousStatus = issue.status;
    issue.assignedTo = assignedToId;
    issue.assignedToName = assignedToName;
    issue.status = 'Under Review';
    issue.auditLog.push(
      buildAuditEntry(
        `Assigned to ${assignedToName}`,
        req.user,
        previousStatus,
        'Under Review',
        remarks || ''
      )
    );

    await issue.save();

    return res.status(200).json({
      success: true,
      message: `Issue assigned to ${assignedToName}`,
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Delete an issue (soft: only submitter or future admin)
//  @route   DELETE /api/aadhaar/issues/:id
//  @access  Private (submitter only)
// ─────────────────────────────────────────────────────────────
export const deleteIssue = async (req, res, next) => {
  try {
    const issue = await AadhaarIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'ISSUE_NOT_FOUND',
        message: 'No issue found with the provided ID.',
      });
    }

    if (req.user?.role !== 'admin' && String(issue.submittedBy?._id || issue.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this issue.',
      });
    }

    // Only the person who submitted can delete (or admin)
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && issue.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You can only delete issues you submitted.',
      });
    }

    if (!isAdmin && issue.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_DELETE',
        message: `Issues in '${issue.status}' status cannot be deleted. Contact admin.`,
      });
    }

    await AadhaarIssue.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Issue deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Dashboard stats summary
//  @route   GET /api/aadhaar/stats
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { submittedBy: req.user._id } : { submittedBy: null };

    const [
      total,
      byStatusRaw,
      byIssueTypeRaw,
      byPriorityRaw,
      recentIssues,
    ] = await Promise.all([
      AadhaarIssue.countDocuments(matchFilter),
      AadhaarIssue.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AadhaarIssue.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$issueType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AadhaarIssue.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      AadhaarIssue.find(matchFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('ticketNumber applicantName issueType status priority createdAt')
        .lean(),
    ]);

    const byStatus   = Object.fromEntries(byStatusRaw.map((s) => [s._id, s.count]));
    const byIssueType = Object.fromEntries(byIssueTypeRaw.map((s) => [s._id, s.count]));
    const byPriority  = Object.fromEntries(byPriorityRaw.map((s) => [s._id, s.count]));

    return res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byIssueType,
        byPriority,
        recentIssues,
      },
    });
  } catch (error) {
    next(error);
  }
};

