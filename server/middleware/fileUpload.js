const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const { ValidationError } = require('./errorHandler');
const winston = require('winston');

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadsDir = await createUploadsDir();
      
      // Create subdirectories based on file type
      let subDir = 'general';
      if (file.mimetype.startsWith('image/')) {
        subDir = 'images';
      } else if (file.mimetype === 'application/pdf' || 
                 file.mimetype.includes('document') || 
                 file.mimetype === 'text/plain') {
        subDir = 'documents';
      }
      
      const targetDir = path.join(uploadsDir, subDir);
      await fs.mkdir(targetDir, { recursive: true });
      
      cb(null, targetDir);
    } catch (error) {
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    // Generate secure filename
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    const filename = `${timestamp}_${randomBytes}_${baseName}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedMimeTypes = {
    images: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    general: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ]
  };

  // Get allowed types based on upload context
  const uploadType = req.uploadType || 'general';
  const allowed = allowedMimeTypes[uploadType] || allowedMimeTypes.general;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    winston.warn('File type not allowed', {
      filename: file.originalname,
      mimetype: file.mimetype,
      uploadType,
      traceId: req.traceId
    });
    
    cb(new ValidationError(`File type ${file.mimetype} is not allowed for ${uploadType} uploads`), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB default
    files: 10, // Maximum 10 files
    fields: 20, // Maximum 20 non-file fields
    fieldNameSize: 100, // Maximum field name size
    fieldSize: 1024 * 1024 // Maximum field value size (1MB)
  }
});

// Upload middleware factory
const createUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'files',
    maxFiles = 10,
    maxFileSize = 25 * 1024 * 1024,
    uploadType = 'general',
    required = false
  } = options;

  return [
    // Set upload type for file filter
    (req, res, next) => {
      req.uploadType = uploadType;
      next();
    },
    
    // Configure multer with custom limits
    multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
        fields: 20,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024
      }
    }).array(fieldName, maxFiles),
    
    // Post-upload validation and processing
    async (req, res, next) => {
      try {
        const files = req.files || [];
        
        // Check if files are required
        if (required && files.length === 0) {
          throw new ValidationError('At least one file is required');
        }
        
        // Additional file validation
        for (const file of files) {
          // Validate file size again (multer should catch this, but double-check)
          if (file.size > maxFileSize) {
            // Remove uploaded file
            await fs.unlink(file.path).catch(() => {});
            throw new ValidationError(`File ${file.originalname} exceeds maximum size of ${maxFileSize} bytes`);
          }
          
          // Add metadata
          file.uploadedAt = new Date();
          file.uploadedBy = req.user?._id;
          file.traceId = req.traceId;
          
          // Generate public URL
          const relativePath = path.relative(path.join(__dirname, '../'), file.path);
          file.url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
        }
        
        winston.info('Files uploaded successfully', {
          fileCount: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          uploadType,
          userId: req.user?._id,
          traceId: req.traceId
        });
        
        next();
      } catch (error) {
        // Clean up uploaded files on error
        if (req.files) {
          for (const file of req.files) {
            await fs.unlink(file.path).catch(() => {});
          }
        }
        next(error);
      }
    }
  ];
};

// Single file upload middleware
const createSingleUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'file',
    maxFileSize = 25 * 1024 * 1024,
    uploadType = 'general',
    required = false
  } = options;

  return [
    // Set upload type for file filter
    (req, res, next) => {
      req.uploadType = uploadType;
      next();
    },
    
    // Configure multer for single file
    multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: 1,
        fields: 20,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024
      }
    }).single(fieldName),
    
    // Post-upload validation and processing
    async (req, res, next) => {
      try {
        const file = req.file;
        
        // Check if file is required
        if (required && !file) {
          throw new ValidationError('File is required');
        }
        
        if (file) {
          // Validate file size
          if (file.size > maxFileSize) {
            await fs.unlink(file.path).catch(() => {});
            throw new ValidationError(`File exceeds maximum size of ${maxFileSize} bytes`);
          }
          
          // Add metadata
          file.uploadedAt = new Date();
          file.uploadedBy = req.user?._id;
          file.traceId = req.traceId;
          
          // Generate public URL
          const relativePath = path.relative(path.join(__dirname, '../'), file.path);
          file.url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
          
          winston.info('File uploaded successfully', {
            filename: file.originalname,
            size: file.size,
            uploadType,
            userId: req.user?._id,
            traceId: req.traceId
          });
        }
        
        next();
      } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
      }
    }
  ];
};

// File cleanup utility
const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    winston.info('File cleaned up', { filePath });
  } catch (error) {
    winston.warn('Failed to cleanup file', { filePath, error: error.message });
  }
};

// Cleanup old files utility
const cleanupOldFiles = async (maxAge = 30 * 24 * 60 * 60 * 1000) => { // 30 days default
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    const cutoffTime = Date.now() - maxAge;
    
    const cleanupDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await cleanupDirectory(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(fullPath);
            winston.info('Old file cleaned up', { filePath: fullPath });
          }
        }
      }
    };
    
    await cleanupDirectory(uploadsDir);
  } catch (error) {
    winston.error('Failed to cleanup old files', { error: error.message });
  }
};

// Error handling middleware for multer errors
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
    
    winston.warn('Multer upload error', {
      code: error.code,
      message: error.message,
      traceId: req.traceId
    });
    
    return next(new ValidationError(message));
  }
  
  next(error);
};

module.exports = {
  upload,
  createUploadMiddleware,
  createSingleUploadMiddleware,
  cleanupFile,
  cleanupOldFiles,
  handleUploadErrors
};
