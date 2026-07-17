const { body, param, query: queryValidator } = require('express-validator');
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware — preserved from original server.
 * Only change: role enum 'patient' → 'requester'
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new ValidationError(formattedErrors));
  }
  next();
}

// ── Auth Validators ──

const registerValidator = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters.')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Name can only contain letters, spaces, and dots.'),
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('phone')
    .matches(/^(\+91)?[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/\d/)
    .withMessage('Password must contain at least one digit.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character.'),
  body('blood_group')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  body('role')
    .optional()
    .isIn(['requester', 'donor'])
    .withMessage('Select a valid role.'),
  validate,
];

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
];

const profileUpdateValidator = [
  body('full_name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters.')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Name can only contain letters, spaces, and dots.'),
  body('fullName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters.')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Name can only contain letters, spaces, and dots.'),
  body('phone')
    .optional({ values: 'falsy' })
    .customSanitizer((val) => {
      if (!val) return val;
      const cleaned = val.replace(/\D/g, '');
      if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
      if (cleaned.length === 10) return `+91${cleaned}`;
      if (cleaned.length === 11 && cleaned.startsWith('0')) return `+91${cleaned.slice(1)}`;
      return `+${cleaned}`;
    })
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('blood_group')
    .optional({ values: 'falsy' })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  body('bloodGroup')
    .optional({ values: 'falsy' })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  validate,
];

// ── Blood Request Validators ──

const bloodRequestValidator = [
  body('patient_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Patient name must be 2–100 characters.'),
  body('blood_group_needed')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  body('units_needed').isInt({ min: 1, max: 10 }).withMessage('Units must be between 1 and 10.'),
  body('urgency')
    .isIn(['critical', 'urgent', 'standard'])
    .withMessage('Select a valid urgency level.'),
  body('hospital_name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Hospital name must be 2–200 characters.'),
  body('hospital_address')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Hospital address must be 5–255 characters.'),
  body('hospital_city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be 2–100 characters.'),
  body('hospital_state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Select a valid state.'),
  body('hospital_pincode').matches(/^\d{6}$/).withMessage('Enter a valid 6-digit PIN code.'),
  body('contact_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be 2–100 characters.'),
  body('contact_phone')
    .matches(/^(\+91)?[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit mobile number.'),
  body('additional_notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be under 500 characters.'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude.'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude.'),
  validate,
];

// ── Donor Validators ──

const donorRegisterValidator = [
  body('full_name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters.'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .normalizeEmail()
    .withMessage('Enter a valid email address.'),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Enter a valid mobile number.'),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('date_of_birth').isISO8601().withMessage('Enter a valid date of birth.'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Select a valid gender.'),
  body('blood_group')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  body('weight_kg').isFloat({ min: 50 }).withMessage('Weight must be at least 50 kg.'),
  body('last_donation_date')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Enter a valid date.'),
  body('medical_conditions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Must be under 500 characters.'),
  body('address_line')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be 5–255 characters.'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2–100 characters.'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Select a valid state.'),
  body('pincode').matches(/^\d{6}$/).withMessage('Enter a valid 6-digit PIN code.'),
  body('notification_opt_in').optional().isBoolean().withMessage('Must be true or false.'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude.'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude.'),
  validate,
];

const donorUpdateValidator = [
  body('weight_kg').optional().isFloat({ min: 50 }).withMessage('Weight must be at least 50 kg.'),
  body('address_line')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be 5–255 characters.'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be 2–100 characters.'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Select a valid state.'),
  body('pincode').optional().matches(/^\d{6}$/).withMessage('Enter a valid 6-digit PIN code.'),
  body('notification_opt_in').optional().isBoolean().withMessage('Must be true or false.'),
  validate,
];

// ── Pagination / Query Validators ──

const paginationValidator = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1–100.'),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  profileUpdateValidator,
  bloodRequestValidator,
  donorRegisterValidator,
  donorUpdateValidator,
  paginationValidator,
};
