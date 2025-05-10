const User = require('../models/User');
const { AppError } = require('../utils/appError');
const { indexFace } = require('../utils/rekognition');

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password
    });
    
    // Generate token
    const token = user.getSignedJwtToken();
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }
    
    // Generate token
    const token = user.getSignedJwtToken();
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload profile image and index face
 * @route   POST /api/auth/profile-image
 * @access  Private
 */
exports.uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an image', 400));
    }
    
    const user = await User.findById(req.user.id);
    
    // Update profile image path
    user.profileImage = req.file.path;
    
    // Index face in Rekognition
    try {
      const rekognitionResponse = await indexFace(req.file.path, user.id);
      
      if (rekognitionResponse.FaceRecords && rekognitionResponse.FaceRecords.length > 0) {
        user.faceId = rekognitionResponse.FaceRecords[0].Face.FaceId;
      }
    } catch (error) {
      console.error('Error indexing face:', error);
      // Continue even if face indexing fails
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        profileImage: user.profileImage,
        faceId: user.faceId
      }
    });
  } catch (error) {
    next(error);
  }
};