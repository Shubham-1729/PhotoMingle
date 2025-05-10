const fs = require('fs');
const path = require('path');
const Photo = require('../models/Photo');
const Event = require('../models/Event');
const User = require('../models/User');
const { AppError } = require('../utils/appError');
const { detectFaces, searchFaces } = require('../utils/rekognition');
const { createNotification } = require('./notificationController');

/**
 * @desc    Upload photos to event
 * @route   POST /api/photos/upload/:eventId
 * @access  Private
 */
exports.uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('Please upload at least one photo', 400));
    }
    
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.eventId}`, 404));
    }
    
    // Check if user is creator or invitee
    const isCreator = event.creator.toString() === req.user.id;
    const isInvitee = event.invitees.some(invitee => 
      invitee.user && invitee.user.toString() === req.user.id
    );
    
    if (!isCreator && !isInvitee) {
      return next(new AppError('Not authorized to upload photos to this event', 401));
    }
    
    // Save photo information
    const uploadedPhotos = [];
    
    for (const file of req.files) {
      const photo = await Photo.create({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        event: req.params.eventId,
        uploader: req.user.id
      });
      
      uploadedPhotos.push(photo);
      
      // Process photo asynchronously
      processPhoto(photo._id);
    }
    
    res.status(201).json({
      success: true,
      count: uploadedPhotos.length,
      data: uploadedPhotos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process photo to detect and recognize faces
 * @param {string} photoId - ID of the photo to process
 */
const processPhoto = async (photoId) => {
  try {
    const photo = await Photo.findById(photoId);
    
    if (!photo) {
      console.error(`Photo not found with id: ${photoId}`);
      return;
    }
    
    // Get event to access invitees
    const event = await Event.findById(photo.event)
      .populate('creator')
      .populate('invitees.user');
    
    if (!event) {
      console.error(`Event not found for photo: ${photoId}`);
      return;
    }
    
    // Detect faces in the photo
    const detectResult = await detectFaces(photo.path);
    
    if (!detectResult.FaceDetails || detectResult.FaceDetails.length === 0) {
      // No faces detected
      photo.isProcessed = true;
      await photo.save();
      return;
    }
    
    // Search for each detected face in the collection
    const searchResult = await searchFaces(photo.path);
    
    if (searchResult.FaceMatches && searchResult.FaceMatches.length > 0) {
      // Process face matches
      for (const match of searchResult.FaceMatches) {
        const faceId = match.Face.FaceId;
        const userId = match.Face.ExternalImageId;
        const user = await User.findById(userId);
        
        if (user) {
          // Add face to photo's detected faces
          photo.detectedFaces.push({
            faceId,
            user: userId,
            boundingBox: match.Face.BoundingBox,
            confidence: match.Similarity
          });
          
          // Create notification for the user
          await createNotification({
            recipient: userId,
            type: 'photo_tagged',
            title: 'You were recognized in a photo',
            message: `You were recognized in a photo from the event: ${event.name}`,
            relatedEvent: event._id,
            relatedPhoto: photo._id
          });
        }
      }
    }
    
    photo.isProcessed = true;
    await photo.save();
  } catch (error) {
    console.error('Error processing photo:', error);
  }
};

/**
 * @desc    Get event photos
 * @route   GET /api/photos/event/:eventId
 * @access  Private
 */
exports.getEventPhotos = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return next(new AppError(`Event not found with id of ${req.params.eventId}`, 404));
    }
    
    // Check if user is creator or invitee
    const isCreator = event.creator.toString() === req.user.id;
    const isInvitee = event.invitees.some(invitee => 
      invitee.user && invitee.user.toString() === req.user.id
    );
    
    if (!isCreator && !isInvitee && event.isPrivate) {
      return next(new AppError('Not authorized to access photos from this event', 401));
    }
    
    const photos = await Photo.find({ event: req.params.eventId })
      .populate('uploader', 'name email')
      .populate('detectedFaces.user', 'name email')
      .sort({ uploadedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get photos with user's face
 * @route   GET /api/photos/user
 * @access  Private
 */
exports.getUserPhotos = async (req, res, next) => {
  try {
    const photos = await Photo.find({
      'detectedFaces.user': req.user.id
    })
      .populate('event', 'name date')
      .populate('uploader', 'name email')
      .sort({ uploadedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete photo
 * @route   DELETE /api/photos/:id
 * @access  Private
 */
exports.deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return next(new AppError(`Photo not found with id of ${req.params.id}`, 404));
    }
    
    // Get the event
    const event = await Event.findById(photo.event);
    
    if (!event) {
      return next(new AppError('Associated event not found', 404));
    }
    
    // Check if user is uploader or event creator
    const isUploader = photo.uploader.toString() === req.user.id;
    const isEventCreator = event.creator.toString() === req.user.id;
    
    if (!isUploader && !isEventCreator) {
      return next(new AppError('Not authorized to delete this photo', 401));
    }
    
    // Delete photo file from filesystem
    if (fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }
    
    await photo.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};