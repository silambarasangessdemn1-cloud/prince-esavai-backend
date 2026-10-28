import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper function to generate JWT Token
const generateToken = (userId, phoneNumber) => {
  return jwt.sign(
    { id: userId, phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, phoneNumber, password } = req.body;

    // Check if a user with this phone number already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'PHONE_ALREADY_EXISTS',
        message: 'Phone number is already registered. Please login or use another number.',
      });
    }

    // Create user (password will be hashed automatically by User model pre-save hook)
    const user = await User.create({
      username,
      phoneNumber,
      password,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.phoneNumber);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user with phone number and password
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;

    // Normalize phone number input
    const cleanPhoneNumber = (phoneNumber || '').trim();

    // 1. Verify Phone Number exists
    const user = await User.findOne({ phoneNumber: cleanPhoneNumber }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'WRONG_PHONE_NUMBER',
        message: 'Wrong phone number. No account found with this phone number.',
      });
    }

    // 2. Verify Password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'WRONG_PASSWORD',
        message: 'Wrong password. Please enter the correct password.',
      });
    }

    // 3. Generate token and send response
    const token = generateToken(user._id, user.phoneNumber);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dedicated Admin Login with hardcoded credentials
 * @route   POST /api/auth/admin-login
 * @access  Public
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const HARDCODED_ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
    const HARDCODED_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin@2026';

    const cleanUsername = (username || '').trim();

    // 1. Verify username
    if (cleanUsername !== HARDCODED_ADMIN_USER) {
      return res.status(401).json({
        success: false,
        error: 'WRONG_USERNAME',
        message: 'Wrong admin username.',
      });
    }

    // 2. Verify hardcoded password
    if (password !== HARDCODED_ADMIN_PASS) {
      return res.status(401).json({
        success: false,
        error: 'WRONG_PASSWORD',
        message: 'Wrong admin password.',
      });
    }

    // 3. Find or auto-provision Admin account in DB
    let adminUser = await User.findOne({ phoneNumber: '9999999999' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'System Administrator',
        phoneNumber: '9999999999',
        password: HARDCODED_ADMIN_PASS,
        role: 'admin',
      });
    } else if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      await adminUser.save();
    }

    // 4. Issue Admin JWT token
    const token = generateToken(adminUser._id, adminUser.phoneNumber);

    return res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        user: {
          _id: adminUser._id,
          username: adminUser.username,
          phoneNumber: adminUser.phoneNumber,
          role: 'admin',
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

