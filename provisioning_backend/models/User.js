const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: false, // Not required for super admin or initial users
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

// Static method to login user
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated or not verified!");
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return user;
};

// Static method to create default super admin
userSchema.statics.createDefaultSuperAdmin = async function () {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await this.findOne({ role: "super_admin" });

    if (existingSuperAdmin) {
      console.log("✅ Super admin already exists:", existingSuperAdmin.email);
      return existingSuperAdmin;
    }

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    // Create default super admin
    const superAdmin = await this.create({
      name: "Super Administrator",
      email: email,
      password: password,
      role: "super_admin",
      isActive: true,
    });

    console.log("🚀 Default super admin created successfully!");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("⚠️  Please change the password after first login!");

    return superAdmin;
  } catch (error) {
    console.error("❌ Error creating super admin:", error.message);
    throw error;
  }
};

// Static method to check if user has admin privileges
userSchema.statics.isAdmin = function (role) {
  return ["admin", "super_admin"].includes(role);
};

// Static method to check if user has super admin privileges
userSchema.statics.isSuperAdmin = function (role) {
  return role === "super_admin";
};

module.exports = mongoose.model("User", userSchema);
