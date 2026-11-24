import { body, validationResult } from 'express-validator';
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  deleteProfile,
  getProfile,
  loginUser,
  registerUser,
  updateProfile,
} from '../controllers/userController.js';

const router = Router();

const registrationValidation = [
  body('fullName')
    .isString()
    .withMessage('Full name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .bail()
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('Password cannot exceed 72 bytes'),
];

const loginValidation = [
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];

const profileUpdateValidation = [
  body().custom((_value, { req }) => {
    const updates = req.body;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return false;
    }

    const fields = Object.keys(updates);
    return (
      fields.length > 0 &&
      fields.every((field) => field === 'fullName' || field === 'email')
    );
  }).withMessage('Only fullName and email can be updated, and at least one is required'),
  body('fullName')
    .optional()
    .isString()
    .withMessage('Full name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail(),
];

function handleValidationErrors(req, res, next) {
  const validationErrors = validationResult(req);
  if (validationErrors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors.array().map(({ path, msg }) => ({
      field: path,
      message: msg,
    })),
  });
}

router.post('/register', registrationValidation, handleValidationErrors, registerUser);
router.post('/login', loginValidation, handleValidationErrors, loginUser);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, profileUpdateValidation, handleValidationErrors, updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);

export default router;
