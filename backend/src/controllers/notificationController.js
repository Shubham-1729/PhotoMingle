const Notification = require('../models/Notification');
const { AppError } = require('../utils/appError');
const { sendEmail } = require('../config/sendgrid');

/**
 * @desc    Create notification
 * @param   {Object} notificationData - Notification data
 * @returns {Promise<Object>} - Created notification
 */
exports.createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    
    // Attempt to send email notification if recipient email is available
    if (notification.email) {
      await sendNotificationEmail(notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * @desc    Send notification email
 * @param   {Object} notification - Notification object
 */
const sendNotificationEmail = async (notification) => {
  try {
    const emailContent = {
      to: notification.email,
      subject: notification.title,
      html: `
        <h1>${notification.title}</h1>
        <p>${notification.message}</p>
      `
    };
    
    await sendEmail(emailContent);
    
    // Update notification as sent
    notification.isSent = true;
    await notification.save();
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('relatedEvent', 'name date')
      .populate('relatedPhoto', 'filename')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(new AppError(`Notification not found with id of ${req.params.id}`, 404));
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return next(new AppError('Not authorized to update this notification', 401));
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(new AppError(`Notification not found with id of ${req.params.id}`, 404));
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return next(new AppError('Not authorized to delete this notification', 401));
    }
    
    await notification.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};