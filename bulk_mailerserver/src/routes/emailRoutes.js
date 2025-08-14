
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { validateEmailConfig, validateBulkEmailRequest } = require('../middleware/validation');
const emailController = require('../controller/emailController.js');

const router = express.Router();

// Configure multer for file attachments
const attachmentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/attachments/';
    await fs.ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, documents, and archives are allowed.'));
    }
  }
});

// Routes - using the bound methods
router.post('/test-config', validateEmailConfig, emailController.testEmailConfig);
router.post('/send-bulk', 
  attachmentUpload.array('attachments', 5),
  validateBulkEmailRequest,
  emailController.sendBulkEmails
);
router.get('/status/:jobId', emailController.getEmailStatus);
router.get('/history', emailController.getEmailHistory);

module.exports = router;