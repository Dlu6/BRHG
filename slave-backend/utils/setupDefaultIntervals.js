// setupDefaultIntervals.js
import { v4 as uuidv4 } from "uuid";
import Interval from "../models/intervalModel.js";
import logger from "./logger.js";

// Define default intervals
const defaultIntervals = [
  {
    id: uuidv4(),
    name: "Work Hours",
    type: "fixed",
    timeRange: { from: "09:00", to: "17:00" },
    weekDays: [1, 2, 3, 4, 5], // Monday to Friday
    monthDays: [],
    months: [],
    description: "Standard work hours (Monday to Friday, 9am to 5pm)",
  },
  {
    id: uuidv4(),
    name: "After Hours",
    type: "fixed",
    timeRange: { from: "17:00", to: "09:00" },
    weekDays: [1, 2, 3, 4, 5], // Monday to Friday
    monthDays: [],
    months: [],
    description: "After work hours (Monday to Friday, 5pm to 9am)",
  },
  {
    id: uuidv4(),
    name: "Weekends",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [0, 6], // Sunday, Saturday
    monthDays: [],
    months: [],
    description: "Weekend hours (Saturday and Sunday, all day)",
  },
  {
    id: uuidv4(),
    name: "Lunch Break",
    type: "fixed",
    timeRange: { from: "12:00", to: "13:00" },
    weekDays: [1, 2, 3, 4, 5], // Monday to Friday
    monthDays: [],
    months: [],
    description: "Lunch break (Monday to Friday, 12pm to 1pm)",
  },
  {
    id: uuidv4(),
    name: "Christmas",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [],
    monthDays: [25],
    months: [11], // December (0-based, so 11 is December)
    description: "Christmas Day (December 25th)",
  },
  {
    id: uuidv4(),
    name: "New Year",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [],
    monthDays: [1],
    months: [0], // January
    description: "New Year's Day (January 1st)",
  },
  {
    id: uuidv4(),
    name: "Always",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [0, 1, 2, 3, 4, 5, 6], // All days
    monthDays: [],
    months: [],
    description: "24/7 (Always active)",
  },
];

/**
 * Initializes default intervals in the database if they don't exist
 */
export const setupDefaultIntervals = async () => {
  try {
    // Check if default intervals already exist
    const existingIntervals = await Interval.findAll();
    logger.info(`Found ${existingIntervals.length} existing intervals`);

    // Create a map of existing interval names for quick lookup
    const existingIntervalNames = new Set(
      existingIntervals.map((interval) => interval.name)
    );

    // Track how many intervals we create
    let createdCount = 0;

    // For each default interval, check if it exists by name
    for (const defaultInterval of defaultIntervals) {
      if (!existingIntervalNames.has(defaultInterval.name)) {
        // Create the interval with a new UUID
        await Interval.create({
          ...defaultInterval,
          id: uuidv4(), // Generate a fresh UUID
        });
        createdCount++;
        logger.info(`Created interval: ${defaultInterval.name}`);
      }
    }

    if (createdCount > 0) {
      logger.info(`Created ${createdCount} default intervals`);
    } else {
      logger.info(`All default intervals already exist, nothing to create`);
    }
  } catch (error) {
    logger.error("Error setting up default intervals:", error);
  }
};

export default setupDefaultIntervals;
