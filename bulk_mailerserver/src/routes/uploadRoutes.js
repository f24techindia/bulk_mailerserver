const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const uploadController = require('../controller/uploadController.js');

const router = express.Router();

// Configure multer for CSV uploads
const csvStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/csv/';
    await fs.ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recipients-' + uniqueSuffix + '.csv');
  }
});

const csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_CSV_SIZE) || 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Routes
router.post('/csv', csvUpload.single('csvFile'), uploadController.uploadAndParseCSV);
router.get('/sample-csv', uploadController.getSampleCSV);

module.exports = router;