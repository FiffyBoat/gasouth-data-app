import { body, param, query as queryValidator, validationResult } from 'express-validator';

/**
 * Middleware that checks for express-validator errors and returns a
 * 422 Unprocessable Entity response with an array of error details.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
}

/**
 * Validation chain for creating/updating a record.
 * Validates GPS coordinates, module enum, capture method, and required fields.
 */
export const validateRecord = [
  body('module')
    .isIn(['property', 'business', 'market_stall'])
    .withMessage('Module must be one of: property, business, market_stall'),

  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('altitude')
    .optional({ values: 'null' })
    .isFloat()
    .withMessage('Altitude must be a number'),

  body('accuracy_m')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),

  body('capture_method')
    .isIn(['device-gps', 'averaged', 'manual-pin'])
    .withMessage('Capture method must be one of: device-gps, averaged, manual-pin'),

  body('ghana_post_address')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Ghana Post address must not exceed 50 characters'),

  body('owner_name')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 200 })
    .withMessage('Owner name must not exceed 200 characters'),

  body('owner_phone')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Owner phone must not exceed 20 characters'),

  body('owner_id_type')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Owner ID type must not exceed 50 characters'),

  body('owner_id_number')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Owner ID number must not exceed 100 characters'),

  body('attributes')
    .optional()
    .isObject()
    .withMessage('Attributes must be a JSON object'),

  body('device_info')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Device info must not exceed 500 characters'),

  body('capture_time')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Capture time must be a valid ISO 8601 date'),

  handleValidation,
];

/**
 * Middleware that enforces required fields when a record is being submitted
 * (status === 'submitted'). Draft saves bypass this check entirely.
 */
export function validateRecordOnSubmit(req, res, next) {
  const { status, module, owner_name, owner_phone, attributes = {}, latitude, longitude } = req.body;

  // Only enforce when submitting (not saving as draft / other status changes)
  if (status !== 'submitted') return next();

  const errors = [];

  // GPS is always required
  if (latitude == null || longitude == null) {
    errors.push({ field: 'gps', message: 'GPS location must be captured before submitting' });
  }

  // Universal required fields
  if (!owner_name?.trim()) {
    errors.push({ field: 'owner_name', message: 'Ratepayer / Owner name is required' });
  }
  if (!owner_phone?.trim()) {
    errors.push({ field: 'owner_phone', message: 'Phone number is required' });
  }

  // Module-specific required fields
  if (module === 'property') {
    if (!attributes.property_address?.trim()) {
      errors.push({ field: 'property_address', message: 'Property address is required for Property Rate records' });
    }
    if (!attributes.structural_type?.trim() && !attributes.construction_type?.trim()) {
      errors.push({ field: 'structural_type', message: 'Structural / construction type is required for Property Rate records' });
    }
  }

  if (module === 'business') {
    if (!attributes.business_category?.trim()) {
      errors.push({ field: 'business_category', message: 'Business category is required for BOP records' });
    }
    if (!attributes.services_provided?.trim()) {
      errors.push({ field: 'services_provided', message: 'Services provided / description is required for BOP records' });
    }
  }

  if (module === 'market_stall') {
    if (!attributes.market_name?.trim()) {
      errors.push({ field: 'market_name', message: 'Market name is required for Market Stall records' });
    }
    if (!attributes.stall_number?.trim()) {
      errors.push({ field: 'stall_number', message: 'Stall number is required for Market Stall records' });
    }
    if (!attributes.commodity?.trim()) {
      errors.push({ field: 'commodity', message: 'Commodity / goods sold is required for Market Stall records' });
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: 'Required fields are missing. Please complete the form before submitting.',
      details: errors,
    });
  }

  next();
}

/**
 * Validation chain for creating/updating a user.
 * Validates username, role, full_name, and optional email/phone.
 */
export const validateUser = [
  body('username')
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),

  body('role')
    .isIn(['collector', 'supervisor', 'budget_director', 'admin'])
    .withMessage('Role must be one of: collector, supervisor, budget_director, admin'),

  body('full_name')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Full name is required and must not exceed 200 characters'),

  body('email')
    .optional({ values: 'null' })
    .isEmail()
    .withMessage('Email must be a valid email address'),

  body('phone')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Phone must not exceed 20 characters'),

  body('assigned_zone_id')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Assigned zone ID must be a valid UUID'),

  handleValidation,
];

/**
 * Validation chain for creating/updating a zone.
 * Validates name, code, boundary GeoJSON, and target count.
 */
export const validateZone = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Zone name is required and must not exceed 200 characters'),

  body('code')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Zone code must not exceed 50 characters'),

  body('boundary')
    .optional({ values: 'null' })
    .custom((val) => typeof val === 'object' || typeof val === 'string')
    .withMessage('Boundary must be a valid GeoJSON object or string'),

  body('boundary_geojson')
    .optional({ values: 'null' })
    .custom((val) => typeof val === 'object' || typeof val === 'string')
    .withMessage('Boundary GeoJSON must be a valid object or string'),

  body('target_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Target count must be a non-negative integer'),

  handleValidation,
];
