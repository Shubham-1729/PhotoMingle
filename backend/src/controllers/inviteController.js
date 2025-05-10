const Event = require('../models/Event');
const User = require('../models/User');
const { AppError } = require('../utils/appError');
const { sendEmail } = require('../config/sendgrid');
const { createNotification } = require('./notificationController');

/**
 * @desc    Send event invitations
 * @route   POST /api/invite/:eventId
 * @access  Private
 */
exports.sendInvitations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('creator', 'name email');
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.eventId}`, 404));
    }
    
    // Check if user is event creator
    if (event.creator._id.toString() !== req.user.id) {
      return next(new AppError('Not authorized to send invitations for this event', 401));
    }
    
    const { inviteeIds } = req.body;
    
    if (!inviteeIds || !Array.isArray(inviteeIds) || inviteeIds.length === 0) {
      return next(new AppError('Please provide invitee IDs', 400));
    }
    
    const sentInvitations = [];
    const failedInvitations = [];
    
    // Process each invitee
    for (const inviteeId of inviteeIds) {
      const invitee = event.invitees.find(
        inv => inv._id.toString() === inviteeId
      );
      
      if (!invitee) {
        failedInvitations.push({
          id: inviteeId,
          reason: 'Invitee not found in event'
        });
        continue;
      }
      
      // Prepare email content
      const inviteUrl = `${req.protocol}://${req.get('host')}/events/${event._id}/join?code=${invitee.inviteCode}`;
      
      const emailContent = {
        to: invitee.email,
        subject: `You're invited to ${event.name}`,
        html: `
          <h1>You're invited to ${event.name}</h1>
          <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Description:</strong> ${event.description || 'No description provided'}</p>
          <p><strong>Host:</strong> ${event.creator.name}</p>
          <p>Click the link below to view the event and respond:</p>
          <a href="${inviteUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Invitation</a>
        `
      };
      
      try {
        // Send email
        await sendEmail(emailContent);
        
        // Create notification
        if (invitee.user) {
          await createNotification({
            recipient: invitee.user,
            type: 'event_invite',
            title: `You're invited to ${event.name}`,
            message: `${event.creator.name} has invited you to ${event.name}`,
            relatedEvent: event._id
          });
        }
        
        sentInvitations.push({
          id: inviteeId,
          email: invitee.email
        });
      } catch (error) {
        console.error('Failed to send invitation:', error);
        failedInvitations.push({
          id: inviteeId,
          email: invitee.email,
          reason: 'Failed to send email'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      sent: sentInvitations,
      failed: failedInvitations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify invitation code
 * @route   GET /api/invite/verify/:eventId/:code
 * @access  Public
 */
exports.verifyInvitation = async (req, res, next) => {
  try {
    const { eventId, code } = req.params;
    
    const event = await Event.findById(eventId)
      .populate('creator', 'name')
      .select('-invitees.user -invitees.email');
    
    if (!event) {
      return next(new AppError('Event not found', 404));
    }
    
    // Find invitation by code
    const invitation = event.invitees.find(inv => inv.inviteCode === code);
    
    if (!invitation) {
      return next(new AppError('Invalid invitation code', 400));
    }
    
    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event._id,
          name: event.name,
          date: event.date,
          location: event.location,
          description: event.description,
          creator: event.creator.name
        },
        invitation: {
          id: invitation._id,
          status: invitation.status,
          inviteCode: invitation.inviteCode
        }
      }
    });
  } catch (error) {
    next(error);
  }
};