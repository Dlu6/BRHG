const express = require("express");
const { protect, authorizeAdmin } = require("../middleware/auth");

const router = express.Router();

// Example protected route - requires authentication
router.get("/dashboard", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to your dashboard!",
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      dashboardData: {
        lastLogin: req.user.lastLogin,
        accountCreated: req.user.createdAt,
        totalLogins: "Feature coming soon...",
      },
    },
  });
});

// Example admin-only route - requires authentication and admin role (admin or super_admin)
router.get("/admin", protect, authorizeAdmin, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to admin panel!",
    data: {
      message: "This is an admin-only route",
      userRole: req.user.role,
      adminData: {
        totalUsers: "Available via /api/admin/users/stats",
        systemStats: "Feature coming soon...",
      },
    },
  });
});

// Example user management route info - admin only
router.get("/admin/users", protect, authorizeAdmin, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "User management panel",
    data: {
      message: "User management is available at /api/admin/users",
      features: [
        "View all users",
        "Create new users",
        "Update user details",
        "Activate/Deactivate users",
        "Manage user roles",
        "View user statistics",
        "Delete users (super admin only)",
      ],
      endpoints: {
        getAllUsers: "GET /api/admin/users",
        createUser: "POST /api/admin/users",
        updateUser: "PUT /api/admin/users/:id",
        deleteUser: "DELETE /api/admin/users/:id (super admin only)",
        getUserStats: "GET /api/admin/users/stats",
      },
    },
  });
});

// Example user settings route - any authenticated user
router.get("/settings", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "User settings page",
    data: {
      currentUser: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
      },
      availableSettings: [
        "Change password",
        "Update profile",
        "Notification preferences",
        "Privacy settings",
      ],
    },
  });
});

module.exports = router;
