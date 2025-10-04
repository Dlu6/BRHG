import SoundFile from "../models/soundFileModel.js";
import fs from "fs";
import path from "path";
import multer from "multer";
import amiService from "../services/amiService.js";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

// Add these variables at the top of the file, after imports
let lastLogTime = 0;
let lastFilesCount = 0;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the Asterisk sounds directory
    const soundsDir = "/var/opt/mayday/sounds";

    // Create directory if it doesn't exist
    if (!fs.existsSync(soundsDir)) {
      // Use sudo mkdir to ensure proper permissions
      execPromise(`sudo mkdir -p ${soundsDir}`).catch(console.error);
    }

    cb(null, soundsDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename and keep original name for better reference
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/wav", "audio/x-wav", "audio/mpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only WAV and MP3 files are allowed."));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const listSoundFiles = async (req, res) => {
  try {
    // Get files from database
    const rows = await SoundFile.findAll({
      order: [["created_at", "DESC"]],
    });

    // Detect development mode
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      !fs.existsSync("/var/opt/mayday/sounds");

    // Process files with appropriate development/production handling
    const soundFiles = await Promise.all(
      rows.map(async (file) => {
        // In development, assume files don't exist but return data anyway
        const fileExists = isDevelopment
          ? true
          : await fs.promises
              .access(file.path)
              .then(() => true)
              .catch(() => false);

        // Get duration with simplified approach
        const duration = await getAudioDuration(file.path);

        return {
          ...file.toJSON(),
          exists: fileExists,
          fullPath: file.path,
          asteriskPath: `custom/${file.filename}`, // How Asterisk references the file
          duration: duration,
        };
      })
    );

    // Only log in development if count changed or 60 seconds passed since last log
    const now = Date.now();
    if (
      isDevelopment &&
      (soundFiles.length !== lastFilesCount || now - lastLogTime > 60000)
    ) {
      console.log(
        `Fetched ${soundFiles.length} sound files (development mode)`
      );
      lastLogTime = now;
      lastFilesCount = soundFiles.length;
    }

    res.json({
      success: true,
      data: soundFiles,
    });
  } catch (error) {
    console.error("Error listing sound files:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Play a sound file
export const playSoundFile = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await SoundFile.findByPk(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found!",
      });
    }
    res.sendFile(file.path);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Download a sound file
export const downloadSoundFile = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await SoundFile.findByPk(id);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    res.download(file.path, file.filename);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to get audio duration
async function getAudioDuration(filePath) {
  // Check if we're in development mode (simplified check based on file existence)
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    !fs.existsSync("/var/opt/mayday/sounds");

  if (isDevelopment) {
    // In development, return a reasonable default duration
    return 30; // Default 30 seconds for development
  }

  try {
    // In production, try to get actual duration from Asterisk
    const response = await amiService.executeAction({
      Action: "Command",
      Command: `file show ${filePath}`,
    });

    // Simplify response handling - assume we get an object with a response property
    const responseText = response?.response || "";

    // Parse duration from response
    const durationMatch = responseText.match(/length=(\d+)/);
    if (durationMatch) {
      return parseInt(durationMatch[1]);
    }

    // Fallback - use file size if Asterisk doesn't provide duration
    try {
      if (fs.existsSync(filePath)) {
        const stats = await fs.promises.stat(filePath);
        // Rough estimate for audio duration based on file size
        return Math.floor(stats.size / 10240);
      }
    } catch (err) {
      // Silently fail on stat errors
    }

    // Default fallback
    return 60; // Default 1 minute
  } catch (error) {
    console.log(
      `Using default duration for ${filePath} (AMI may not be available)`
    );
    return 60; // Default 1 minute on error
  }
}

export const uploadSoundFile = async (req, res) => {
  try {
    const { file } = req;
    const { description } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Save to database
    const soundFile = await SoundFile.create({
      filename: file.filename,
      description,
      format: path.extname(file.originalname).substring(1),
      path: file.path,
    });

    // Reload Asterisk audio files
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "core reload",
      });
    } catch (error) {
      console.error("Error reloading Asterisk core:", error);
      // Continue execution even if reload fails
    }

    res.json({
      success: true,
      message: "Sound file uploaded successfully",
      data: soundFile,
    });
  } catch (error) {
    console.error("Sound file upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a sound file
export const updateSoundFile = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  try {
    const file = await SoundFile.findByPk(id);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    await file.update({ description });
    res.json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSoundFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Get file info from database
    const file = await SoundFile.findByPk(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Delete file from disk
    await fs.promises.unlink(file.path);

    // Delete from database
    await file.destroy();

    res.json({
      success: true,
      message: "Sound file deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
