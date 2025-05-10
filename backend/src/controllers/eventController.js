const Event = require('../models/Event');
const User = require('../models/User');
const { AppError } = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private
 */
exports.createEvent = async (req, res, next) => {
  try {
    // Add creator to the event
    req.body.creator = req.user.id;
    
    const event = await Event.create(req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Private
 */
exports.getEvents = async (req, res, next) => {
  try {
    // Get events created by the user or where user is invited
    const events = await Event.find({
      $or: [
        { creator: req.user.id },
        { 'invitees.user': req.user.id }
      ]
    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event
 * @route   GET /api/events/:id
 * @access  Private
 */
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('invitees.user', 'name email');
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is creator or invitee
    const isCreator = event.creator._id.toString() === req.user.id;
    const isInvitee = event.invitees.some(invitee => 
      invitee.user && invitee.user._id.toString() === req.user.id
    );
    
    if (!isCreator && !isInvitee && event.isPrivate) {
      return next(new AppError('Not authorized to access this event', 401));
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private
 */
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is event creator
    if (event.creator.toString() !== req.user.id) {
      return next(new AppError('Not authorized to update this event', 401));
    }
    
    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is event creator
    if (event.creator.toString() !== req.user.id) {
      return next(new AppError('Not authorized to delete this event', 401));
    }
    
    await event.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add invitees to event
 * @route   POST /api/events/:id/invitees
 * @access  Private
 */
exports.addInvitees = async (req, res, next) => {
  try {
    const { invitees } = req.body;
    
    if (!invitees || !Array.isArray(invitees)) {
      return next(new AppError('Please provide invitees array', 400));
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is event creator
    if (event.creator.toString() !== req.user.id) {
      return next(new AppError('Not authorized to add invitees to this event', 401));
    }
    
    // Process each invitee
    for (const invitee of invitees) {
      const inviteCode = uuidv4();
      
      // Check if invitee is a user or just an email
      if (invitee.userId) {
        const user = await User.findById(invitee.userId);
        if (!user) {
          continue; // Skip if user not found
        }
        
        // Check if user is already invited
        const alreadyInvited = event.invitees.some(
          inv => inv.user && inv.user.toString() === invitee.userId
        );
        
        if (!alreadyInvited) {
          event.invitees.push({
            user: invitee.userId,
            email: user.email,
            inviteCode,
            status: 'pending'
          });
        }
      } else if (invitee.email) {
        // Check if email is already invited
        const alreadyInvited = event.invitees.some(
          inv => inv.email === invitee.email
        );
        
        if (!alreadyInvited) {
          event.invitees.push({
            email: invitee.email,
            inviteCode,
            status: 'pending'
          });
        }
      }
    }
    
    await event.save();
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove invitee from event
 * @route   DELETE /api/events/:id/invitees/:inviteeId
 * @access  Private
 */
exports.removeInvitee = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is event creator
    if (event.creator.toString() !== req.user.id) {
      return next(new AppError('Not authorized to remove invitees from this event', 401));
    }
    
    // Find and remove invitee
    const inviteeIndex = event.invitees.findIndex(
      inv => inv._id.toString() === req.params.inviteeId
    );
    
    if (inviteeIndex === -1) {
      return next(new AppError('Invitee not found', 404));
    }
    
    event.invitees.splice(inviteeIndex, 1);
    await event.save();
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Respond to event invitation
 * @route   PUT /api/events/:id/invite-response
 * @access  Private
 */
exports.respondToInvite = async (req, res, next) => {
  try {
    const { status, inviteCode } = req.body;
    
    if (!status || !['accepted', 'declined'].includes(status)) {
      return next(new AppError('Please provide valid status (accepted/declined)', 400));
    }
    
    if (!inviteCode) {
      return next(new AppError('Please provide invite code', 400));
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.id}`, 404));
    }
    
    // Find invitation by code
    const inviteeIndex = event.invitees.findIndex(
      inv => inv.inviteCode === inviteCode
    );
    
    if (inviteeIndex === -1) {
      return next(new AppError('Invalid invite code', 400));
    }
    
    // Update invitation status
    event.invitees[inviteeIndex].status = status;
    
    // If user is logged in and not already associated with invitation
    if (!event.invitees[inviteeIndex].user) {
      event.invitees[inviteeIndex].user = req.user.id;
    }
    
    await event.save();
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};