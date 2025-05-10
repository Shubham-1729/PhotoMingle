const express = require('express');
const { body } = require('express-validator');
const { sendInvitations, verifyInvitation } = require('../controllers/inviteController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const inviteValidation = [
  body('inviteeIds')
    .isArray()
    .withMessage('InviteeIds must be an array')
    .notEmpty()
    .withMessage('InviteeIds cannot be empty')
];

// Public routes
router.get('/verify/:eventId/:code', verifyInvitation);

// Protected routes
router.post('/:eventId', protect, inviteValidation, validate, sendInvitations);

module.exports = router;