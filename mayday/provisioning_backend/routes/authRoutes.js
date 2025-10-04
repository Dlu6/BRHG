const express = require("express");
const {
  signup,
  login,
  logout,
  getMe,
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} = require("../middleware/validation");

const router = express.Router();

// Public routes
router.post("/signup", validateRegistration, signup);
router.post("/login", validateLogin, login);

// Protected routes (require authentication)
router.use(protect); // All routes after this middleware are protected

router.post("/logout", logout);
router.get("/me", getMe);
router.put("/profile", validateProfileUpdate, updateProfile);

module.exports = router;
