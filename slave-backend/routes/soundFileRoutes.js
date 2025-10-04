import express from "express";
import {
  deleteSoundFile,
  downloadSoundFile,
  listSoundFiles,
  playSoundFile,
  updateSoundFile,
  upload,
  uploadSoundFile,
} from "../controllers/soundFileController.js";

const router = express.Router();

// List all sound files
router.get("/", listSoundFiles);

// Upload a new sound file
router.post("/upload", upload.single("file"), uploadSoundFile);

// Delete a sound file
router.delete("/:id", deleteSoundFile);

// Play a sound file
router.get("/play/:id", playSoundFile);

// Download audio file route
router.get("/download/:id", downloadSoundFile);

// Add update route for editing description
router.put("/:id", updateSoundFile);

export default router;
