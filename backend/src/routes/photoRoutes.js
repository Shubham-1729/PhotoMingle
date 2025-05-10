const express = require('express');
const { 
  uploadPhotos, 
  getEventPhotos, 
  getUserPhotos, 
  deletePhoto 
} = require('../controllers/photoController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.post('/upload/:eventId', upload.array('photos', 10), uploadPhotos);
router.get('/event/:eventId', getEventPhotos);
router.get('/user', getUserPhotos);
router.delete('/:id', deletePhoto);

module.exports = router;