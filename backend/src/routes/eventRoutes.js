const express = require('express');
const { body } = require('express-validator');
const { 
  createEvent, 
  getEvents, 
  getEvent, 
  updateEvent, 
  deleteEvent,
  addInvitees,
  removeInvitee,
  respondToInvite
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const eventValidation = [
  body('name')
    .notEmpty()
    .withMessage('Event name is required')
    .trim(),
  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('location')
    .notEmpty()
    .withMessage('Event location is required')
    .trim()
];

const inviteValidation = [
  body('invitees')
    .isArray()
    .withMessage('Invitees must be an array')
];

const respondValidation = [
  body('status')
    .isIn(['accepted', 'declined'])
    .withMessage('Status must be either accepted or declined'),
  body('inviteCode')
    .notEmpty()
    .withMessage('Invite code is required')
];

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .get(getEvents)
  .post(eventValidation, validate, createEvent);

router.route('/:id')
  .get(getEvent)
  .put(eventValidation, validate, updateEvent)
  .delete(deleteEvent);

router.post('/:id/invitees', inviteValidation, validate, addInvitees);
router.delete('/:id/invitees/:inviteeId', removeInvitee);
router.put('/:id/invite-response', respondValidation, validate, respondToInvite);

module.exports = router;