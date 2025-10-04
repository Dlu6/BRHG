import express from "express";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import sequelize from "../config/sequelize.js";
import RecordingRating from "../models/recordingRatingModel.js";

const router = express.Router();
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Add configurable recording base directory (same as in inboundRouteController.js)
const RECORDING_BASE_DIR =
  process.env.RECORDING_BASE_DIR || "/var/spool/asterisk/monitor";

// List recordings by date
router.get("/list/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const recordingDir = path.join(RECORDING_BASE_DIR, year, month, day);

    // Check if directory exists
    try {
      await stat(recordingDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "No recordings found for this date",
        error: error.message,
      });
    }

    // Get recordings
    const files = await readdir(recordingDir);
    const recordings = await Promise.all(
      files
        .filter((file) => file.endsWith(".wav"))
        .map(async (file) => {
          const filePath = path.join(recordingDir, file);
          const fileStat = await stat(filePath);

          // Parse filename to extract metadata
          const parts = file.split("-");
          let type = "unknown";
          let identifier = "";

          if (parts.length >= 2) {
            type = parts[0]; // e.g., "queue"
            // The last part will contain the uniqueid with .wav extension
            const uniqueId = parts[parts.length - 1].replace(".wav", "");

            // For queue recordings, the queue name is the second part
            if (type === "queue" && parts.length >= 3) {
              identifier = parts[1];
            }
          }

          // Try to find call details in CDR if available
          let callDetails = null;
          let duration = 0;
          try {
            const cdr = await sequelize.query(
              `SELECT src, dst, disposition, billsec, duration as call_duration, calldate 
             FROM cdr 
             WHERE uniqueid = ? OR recordingfile LIKE ?`,
              {
                replacements: [
                  parts[parts.length - 1].replace(".wav", ""),
                  `%${file}%`,
                ],
                type: sequelize.QueryTypes.SELECT,
              }
            );

            if (cdr && cdr.length > 0) {
              callDetails = cdr[0];
              // Use billsec first (actual talk time), fall back to duration (total call time)
              duration =
                callDetails.billsec > 0
                  ? callDetails.billsec
                  : callDetails.call_duration || 0;
            } else {
              console.log("No CDR details found for", file);
            }
          } catch (err) {
            console.error("Error fetching CDR info:", err);
          }

          // If we couldn't get duration from CDR, estimate from file size
          // Average WAV file size is about 85KB per minute for 8kHz 16-bit mono
          if (!duration && fileStat.size > 0) {
            // Rough approximation: 1.42KB per second for WAV files
            const estimatedSeconds = Math.round(fileStat.size / (1.42 * 1024));
            duration = estimatedSeconds > 0 ? estimatedSeconds : 0;
          }

          // Look up rating for this file
          let rating = null;
          let notes = null;
          try {
            const ratingRecord = await RecordingRating.findOne({
              where: {
                filename: file,
                path: path.join(year, month, day, file),
              },
            });

            if (ratingRecord) {
              rating = ratingRecord.rating;
              notes = ratingRecord.notes;
            }
          } catch (err) {
            console.error("Error fetching rating:", err);
          }

          return {
            filename: file,
            path: `/recordings/${year}/${month}/${day}/${file}`,
            downloadUrl: `/api/recordings/download/${year}/${month}/${day}/${file}`,
            size: fileStat.size,
            created: fileStat.birthtime || fileStat.ctime,
            duration: duration,
            type,
            identifier,
            callDetails,
            rating,
            notes,
          };
        })
    );

    // Filter out short, likely automated/unanswered calls and empty files
    const filteredRecordings = recordings.filter((recording) => {
      const isAnswered = recording.callDetails?.disposition === "ANSWERED";
      const isLongEnough = recording.duration > 2; // Longer than 2 seconds
      const isNotEmpty = recording.size > 1024; // Larger than 1KB

      // Log and filter out anything that's too short and wasn't answered
      if (!isLongEnough && !isAnswered) {
        console.log(
          `Filtering out short, unanswered call: ${recording.filename}, Duration: ${recording.duration}s`
        );
        return false;
      }
      // Also filter out any files that are essentially empty
      if (!isNotEmpty) {
        console.log(
          `Filtering out empty recording file: ${recording.filename}, Size: ${recording.size} bytes`
        );
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      recordings: filteredRecordings.sort((a, b) => b.created - a.created), // Sort by date, newest first
    });
  } catch (error) {
    console.error("Error listing recordings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recordings",
      error: error.message,
    });
  }
});

// Stream recording for playback
router.get("/play/:year/:month/:day/:filename", async (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const filePath = path.join(RECORDING_BASE_DIR, year, month, day, filename);

    // Asynchronously get file stats
    const fileStat = await stat(filePath);

    // Set appropriate headers
    res.setHeader("Content-Length", fileStat.size);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Accept-Ranges", "bytes");

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors
    fileStream.on("error", (error) => {
      console.error("Error streaming recording:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error streaming recording",
          error: error.message,
        });
      }
    });
  } catch (error) {
    // If stat fails (e.g., file not found), this will catch it
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }
    console.error("Error preparing recording for streaming:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stream recording",
      error: error.message,
    });
  }
});

// Download recording
router.get("/download/:year/:month/:day/:filename", (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const filePath = path.join(RECORDING_BASE_DIR, year, month, day, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "audio/wav");

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors
    fileStream.on("error", (error) => {
      console.error("Error downloading recording:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error downloading recording",
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Error downloading recording:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download recording",
      error: error.message,
    });
  }
});

// Rate recording
router.post("/rate/:year/:month/:day/:filename", async (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const { rating, notes } = req.body;
    const filePath = path.join(year, month, day, filename);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Store rating in database using the RecordingRating model
    const [ratingRecord, created] = await RecordingRating.findOrCreate({
      where: {
        filename,
        path: filePath,
      },
      defaults: {
        rating,
        notes: notes || "",
        created_at: new Date(),
      },
    });

    // If record already existed, update it
    if (!created) {
      ratingRecord.rating = rating;
      ratingRecord.notes = notes || "";
      ratingRecord.updated_at = new Date();
      await ratingRecord.save();
    }

    res.json({
      success: true,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("Error rating recording:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save rating",
      error: error.message,
    });
  }
});

// Get available dates with recordings
router.get("/dates", async (req, res) => {
  try {
    // If base dir doesn't exist, return empty dataset gracefully
    try {
      await stat(RECORDING_BASE_DIR);
    } catch (e) {
      return res.json({ success: true, dates: [] });
    }

    const years = await readdir(RECORDING_BASE_DIR);

    const dates = [];

    for (const year of years.filter((y) => /^\d{4}$/.test(y))) {
      const yearPath = path.join(RECORDING_BASE_DIR, year);
      let months = [];
      try {
        months = await readdir(yearPath);
      } catch (_) {
        continue;
      }

      for (const month of months.filter((m) => /^\d{2}$/.test(m))) {
        const monthPath = path.join(yearPath, month);
        let days = [];
        try {
          days = await readdir(monthPath);
        } catch (_) {
          continue;
        }

        for (const day of days.filter((d) => /^\d{2}$/.test(d))) {
          const dayPath = path.join(monthPath, day);
          let files = [];
          try {
            files = await readdir(dayPath);
          } catch (_) {
            continue;
          }

          if (files.some((file) => file.endsWith(".wav"))) {
            dates.push(`${year}-${month}-${day}`);
          }
        }
      }
    }

    res.json({
      success: true,
      dates: dates.sort().reverse(), // Sort by date, newest first
    });
  } catch (error) {
    console.error("Error getting recording dates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recording dates",
      error: error.message,
    });
  }
});

export default router;
