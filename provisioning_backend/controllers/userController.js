const User = require("../models/User");
const { validationResult } = require("express-validator");

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    // Build query
    const query = {};

    if (role && role !== "all") {
      query.role = role;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-password");

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error fetching users",
    });
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists with this email",
      });
    }

    // Only super admin can create other super admins
    if (role === "super_admin" && !User.isSuperAdmin(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message:
          "Only super administrators can create other super administrators",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "user",
      createdBy: req.user._id,
      isActive: true,
    });

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          createdBy: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
          },
        },
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error creating user",
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Prevent users from editing super admins unless they are super admin
    if (user.role === "super_admin" && !User.isSuperAdmin(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message:
          "Only super administrators can modify super administrator accounts",
      });
    }

    // Prevent promoting to super admin unless requester is super admin
    if (role === "super_admin" && !User.isSuperAdmin(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message:
          "Only super administrators can assign super administrator role",
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "Email already exists",
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error updating user",
    });
  }
};

// @desc    Delete user (Super Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Super Admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Prevent deleting super admins
    if (user.role === "super_admin") {
      return res.status(403).json({
        status: "error",
        message: "Super administrator accounts cannot be deleted",
      });
    }

    // Prevent users from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error deleting user",
    });
  }
};

// @desc    Verify user account (Super Admin only)
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Super Admin
const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // You can't verify an already active account
    if (user.isActive) {
      return res.status(400).json({
        status: "error",
        message: "User is already active",
      });
    }

    // Activate user
    user.isActive = true;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "User verified and activated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Verify user error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error verifying user",
    });
  }
};

// @desc    Get user statistics (Admin only)
// @route   GET /api/admin/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt isActive");

    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error fetching user statistics",
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyUser,
  getUserStats,
};
