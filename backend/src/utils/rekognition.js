const fs = require('fs');
const { rekognition } = require('../config/aws');
const { AppError } = require('./appError');

/**
 * Create a face collection if it doesn't exist
 */
const createCollectionIfNotExists = async () => {
  const collectionId = process.env.AWS_REKOGNITION_COLLECTION_ID;
  
  try {
    // Check if collection exists
    await rekognition.describeCollection({
      CollectionId: collectionId
    }).promise();
    
    console.log(`Collection ${collectionId} already exists`);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      // Create the collection
      await rekognition.createCollection({
        CollectionId: collectionId
      }).promise();
      
      console.log(`Collection ${collectionId} created`);
    } else {
      throw error;
    }
  }
};

/**
 * Index a face in the collection
 * @param {string} imagePath - Path to image file
 * @param {string} userId - User ID to associate with the face
 * @returns {Object} - Rekognition response
 */
const indexFace = async (imagePath, userId) => {
  try {
    const image = fs.readFileSync(imagePath);
    
    const params = {
      CollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID,
      Image: {
        Bytes: image
      },
      ExternalImageId: userId,
      DetectionAttributes: ['ALL']
    };
    
    const response = await rekognition.indexFaces(params).promise();
    return response;
  } catch (error) {
    console.error('Error indexing face:', error);
    throw new AppError('Failed to index face', 500);
  }
};

/**
 * Detect faces in an image
 * @param {string} imagePath - Path to image file
 * @returns {Object} - Rekognition response
 */
const detectFaces = async (imagePath) => {
  try {
    const image = fs.readFileSync(imagePath);
    
    const params = {
      Image: {
        Bytes: image
      },
      Attributes: ['ALL']
    };
    
    const response = await rekognition.detectFaces(params).promise();
    return response;
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw new AppError('Failed to detect faces', 500);
  }
};

/**
 * Search for faces in the collection
 * @param {string} imagePath - Path to image file
 * @returns {Object} - Rekognition response
 */
const searchFaces = async (imagePath) => {
  try {
    const image = fs.readFileSync(imagePath);
    
    const params = {
      CollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID,
      Image: {
        Bytes: image
      },
      MaxFaces: 5,
      FaceMatchThreshold: 90
    };
    
    const response = await rekognition.searchFacesByImage(params).promise();
    return response;
  } catch (error) {
    console.error('Error searching faces:', error);
    throw new AppError('Failed to search faces', 500);
  }
};

module.exports = {
  createCollectionIfNotExists,
  indexFace,
  detectFaces,
  searchFaces
};