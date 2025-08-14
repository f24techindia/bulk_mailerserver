const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// CSV Upload Configuration
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

// Attachment Upload Configuration
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

// File filter for CSV
const csvFileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || 
      file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// File filter for attachments
const attachmentFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and archives are allowed.'), false);
  }
};

// CSV Upload Middleware
const csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_CSV_SIZE) || 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: csvFileFilter
});

// Attachment Upload Middleware
const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024,
    files: parseInt(process.env.MAX_ATTACHMENTS) || 5
  },
  fileFilter: attachmentFileFilter
});

module.exports = {
  csvUpload,
  attachmentUpload
};
