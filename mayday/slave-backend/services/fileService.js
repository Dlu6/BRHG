import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import crypto from "crypto";

const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "email-attachments");

    try {
      await mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Upload single file
export const uploadFile = (req, res, next) => {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(req.file);
      }
    });
  });
};

// Upload multiple files
export const uploadFiles = (req, res, next) => {
  return new Promise((resolve, reject) => {
    upload.array("files", 5)(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(req.files);
      }
    });
  });
};

// Delete file
export const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// Get file info
export const getFileInfo = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    console.error("Error getting file info:", error);
    return null;
  }
};

// Validate file type
export const validateFileType = (filePath, allowedTypes) => {
  const ext = path.extname(filePath).toLowerCase();
  return allowedTypes.includes(ext);
};

// Get file size in human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Clean up old files
export const cleanupOldFiles = async (
  directory,
  maxAge = 7 * 24 * 60 * 60 * 1000
) => {
  try {
    const files = await fs.promises.readdir(directory);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old files:", error);
    return 0;
  }
};

// Create directory if it doesn't exist
export const ensureDirectoryExists = async (dirPath) => {
  try {
    await mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error("Error creating directory:", error);
    return false;
  }
};

// Get file extension
export const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Check if file is image
export const isImageFile = (filename) => {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
};

// Check if file is document
export const isDocumentFile = (filename) => {
  const docExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
  ];
  const ext = getFileExtension(filename);
  return docExtensions.includes(ext);
};

// Generate unique filename
export const generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const uniqueSuffix = crypto.randomBytes(8).toString("hex");
  return `${name}-${uniqueSuffix}${ext}`;
};

export default {
  upload,
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileInfo,
  validateFileType,
  formatFileSize,
  cleanupOldFiles,
  ensureDirectoryExists,
  getFileExtension,
  isImageFile,
  isDocumentFile,
  generateUniqueFilename,
};
