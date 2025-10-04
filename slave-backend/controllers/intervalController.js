// intervalController.js
import Interval from "../models/intervalModel.js";
import { v4 as uuidv4 } from "uuid";

// Get all intervals
export const getAllIntervals = async (req, res) => {
  try {
    const intervals = await Interval.findAll({
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json(intervals);
  } catch (error) {
    console.error("Error fetching intervals:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch intervals",
      error: error.message,
    });
  }
};

// Get interval by ID
export const getIntervalById = async (req, res) => {
  try {
    const { id } = req.params;
    const interval = await Interval.findByPk(id);

    if (!interval) {
      return res.status(404).json({
        success: false,
        message: "Interval not found",
      });
    }

    return res.status(200).json(interval);
  } catch (error) {
    console.error("Error fetching interval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interval",
      error: error.message,
    });
  }
};

// Create new interval
export const createInterval = async (req, res) => {
  try {
    const { name, type, timeRange, weekDays, monthDays, months, description } =
      req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const interval = await Interval.create({
      id: uuidv4(),
      name,
      type: type || "fixed",
      timeRange: timeRange || { from: "00:00", to: "23:59" },
      weekDays: weekDays || [],
      monthDays: monthDays || [],
      months: months || [],
      description: description || "",
    });

    return res.status(201).json({
      success: true,
      message: "Interval created successfully",
      interval,
    });
  } catch (error) {
    console.error("Error creating interval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create interval",
      error: error.message,
    });
  }
};

// Update interval
export const updateInterval = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, timeRange, weekDays, monthDays, months, description } =
      req.body;

    const interval = await Interval.findByPk(id);

    if (!interval) {
      return res.status(404).json({
        success: false,
        message: "Interval not found",
      });
    }

    // Update interval properties
    await interval.update({
      name: name || interval.name,
      type: type || interval.type,
      timeRange: timeRange || interval.timeRange,
      weekDays: weekDays || interval.weekDays,
      monthDays: monthDays || interval.monthDays,
      months: months || interval.months,
      description: description || interval.description,
    });

    return res.status(200).json({
      success: true,
      message: "Interval updated successfully",
      interval,
    });
  } catch (error) {
    console.error("Error updating interval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update interval",
      error: error.message,
    });
  }
};

// Delete interval
export const deleteInterval = async (req, res) => {
  try {
    const { id } = req.params;
    const interval = await Interval.findByPk(id);

    if (!interval) {
      return res.status(404).json({
        success: false,
        message: "Interval not found",
      });
    }

    await interval.destroy();

    return res.status(200).json({
      success: true,
      message: "Interval deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting interval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete interval",
      error: error.message,
    });
  }
};
