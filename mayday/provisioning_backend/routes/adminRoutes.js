const express = require("express");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyUser,
  getUserStats,
} = require("../controllers/userController");
const {
  protect,
  authorizeAdmin,
  authorizeSuperAdmin,
} = require("../middleware/auth");
const {
  validateCreateUser,
  validateUpdateUser,
} = require("../middleware/validation");

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect);
router.use(authorizeAdmin);

// User statistics
router.get("/users/stats", getUserStats);

// Verify user route (Super Admin only)
router.put("/users/:id/verify", authorizeSuperAdmin, verifyUser);

// User management
router.route("/users").get(getAllUsers).post(validateCreateUser, createUser);

router
  .route("/users/:id")
  .put(validateUpdateUser, updateUser)
  .delete(authorizeSuperAdmin, deleteUser); // Only super admin can delete users

module.exports = router;
