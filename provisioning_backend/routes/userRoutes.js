const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorizeAdmin } = require("../middleware/auth");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get("/", protect, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
router.get("/:id", protect, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (user) {
      res.json({
        success: true,
        data: user,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
