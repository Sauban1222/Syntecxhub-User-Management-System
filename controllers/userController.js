import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

function emailConflict(res) {
  return res.status(409).json({
    success: false,
    message: 'An account with this email already exists',
  });
}

export async function registerUser(req, res, next) {
  const { fullName, email, password } = req.body;

  try {
    if (await User.exists({ email })) {
      return emailConflict(res);
    }

    const user = await User.create({ fullName, email, password });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (
      error?.code === 11000 &&
      (error.keyPattern?.email || error.keyValue?.email)
    ) {
      return emailConflict(res);
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(({ path, message }) => ({
          field: path,
          message,
        })),
      });
    }

    return next(error);
  }
}

export async function loginUser(req, res, next) {
  const { email, password } = req.body ?? {};
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

  if (
    typeof jwtSecret !== 'string' ||
    Buffer.byteLength(jwtSecret, 'utf8') < 32 ||
    typeof jwtExpiresIn !== 'string' ||
    !jwtExpiresIn.trim()
  ) {
    return res.status(503).json({
      success: false,
      message: 'Authentication service is temporarily unavailable',
    });
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: jwtExpiresIn }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = await User.findById(req.user.id).select(
      '_id fullName email createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (
      Object.hasOwn(req.body, 'email') &&
      (await User.exists({ email: req.body.email, _id: { $ne: user._id } }))
    ) {
      return emailConflict(res);
    }

    if (Object.hasOwn(req.body, 'fullName')) {
      user.fullName = req.body.fullName;
    }
    if (Object.hasOwn(req.body, 'email')) {
      user.email = req.body.email;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (
      error?.code === 11000 &&
      (error.keyPattern?.email || error.keyValue?.email)
    ) {
      return emailConflict(res);
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(({ path, message }) => ({
          field: path,
          message,
        })),
      });
    }

    return next(error);
  }
}

export async function deleteProfile(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}
