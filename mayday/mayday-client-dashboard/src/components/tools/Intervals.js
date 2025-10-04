// Intervals.js
// Centralized interval definitions and utilities for call routing
import { store } from "../../app/store";

/**
 * This file now serves as a utility file for interval functionality.
 * The static interval definitions have been deprecated in favor of using
 * the dynamic intervals from the Redux store (state.intervals.intervals).
 *
 * To get intervals, use:
 * import { useSelector } from "react-redux";
 * const intervals = useSelector((state) => state.intervals.intervals);
 *
 * Or for non-component code:
 * import { store } from "../../app/store";
 * const intervals = store.getState().intervals.intervals;
 */

/**
 * Interval object structure:
 * @typedef {Object} Interval
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} type - 'fixed' | 'custom'
 * @property {Object} timeRange - { from: 'HH:mm', to: 'HH:mm' }
 * @property {number[]} weekDays - 0 (Sun) to 6 (Sat)
 * @property {number[]} monthDays - 1 to 31
 * @property {number[]} months - 0 (Jan) to 11 (Dec)
 * @property {string} [description] - Optional description
 */

/**
 * @deprecated Use intervals from Redux store instead
 * These static intervals are kept for backward compatibility only.
 * New code should use the dynamic intervals from the Redux store.
 */
const staticIntervals = [
  {
    id: "work_hours",
    name: "Work Hours",
    type: "fixed",
    timeRange: { from: "09:00", to: "17:00" },
    weekDays: [1, 2, 3, 4, 5], // Monday to Friday
    monthDays: [],
    months: [],
    description: "Monday to Friday, 9am to 5pm",
  },
  {
    id: "lunch_break",
    name: "Lunch Break",
    type: "fixed",
    timeRange: { from: "12:00", to: "13:00" },
    weekDays: [1, 2, 3, 4, 5],
    monthDays: [],
    months: [],
    description: "Monday to Friday, 12pm to 1pm",
  },
  {
    id: "weekends",
    name: "Weekends",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [0, 6], // Sunday, Saturday
    monthDays: [],
    months: [],
    description: "All day Saturday and Sunday",
  },
  {
    id: "after_hours",
    name: "After Hours",
    type: "fixed",
    timeRange: { from: "17:00", to: "09:00" },
    weekDays: [1, 2, 3, 4, 5],
    monthDays: [],
    months: [],
    description: "Monday to Friday, 5pm to 9am (overnight)",
  },
  {
    id: "holidays",
    name: "Holidays",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [],
    monthDays: [25], // Example: 25th of any month
    months: [11], // December
    description: "December 25th (Christmas)",
  },
  {
    id: "custom",
    name: "Custom",
    type: "custom",
    timeRange: {},
    weekDays: [],
    monthDays: [],
    months: [],
    description: "User-defined custom interval",
  },
];

/**
 * Get all intervals from the Redux store
 * @returns {Array} All intervals from the Redux store
 */
export function getAllIntervals() {
  const state = store.getState();
  return state.intervals.intervals || [];
}

/**
 * Find an interval by ID from the Redux store
 * @param {string} id - The interval ID to find
 * @returns {Interval|undefined} The found interval or undefined
 */
export function findIntervalById(id) {
  const intervals = getAllIntervals();
  return intervals.find((interval) => interval.id === id);
}

/**
 * Get a human-readable label for an interval.
 * @param {Interval} interval
 * @returns {string}
 */
export function getIntervalLabel(interval) {
  if (!interval) return "";

  // Safe check for arrays
  const weekDays = Array.isArray(interval.weekDays) ? interval.weekDays : [];
  const monthDays = Array.isArray(interval.monthDays) ? interval.monthDays : [];
  const months = Array.isArray(interval.months) ? interval.months : [];

  let label = interval.name;
  if (interval.type === "custom") return label;

  if (interval.timeRange?.from && interval.timeRange?.to) {
    label += ` (${interval.timeRange.from} - ${interval.timeRange.to})`;
  }

  if (weekDays.length) {
    const days = weekDays.map((d) => weekDayNames[d]).join(", ");
    label += `, Days: ${days}`;
  }

  if (monthDays.length) {
    label += `, Month Days: ${monthDays.join(", ")}`;
  }

  if (months.length) {
    const monthLabels = months.map((m) => monthNames[m]).join(", ");
    label += `, Months: ${monthLabels}`;
  }

  return label;
}

const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Validate an interval object.
 * @param {Interval} interval
 * @returns {boolean}
 */
export function validateInterval(interval) {
  if (!interval) return false;
  if (!interval.name || !interval.type) return false;
  if (interval.type === "fixed") {
    if (!interval.timeRange?.from || !interval.timeRange?.to) return false;
    // Optionally, check for valid time format
  }
  return true;
}

/**
 * Format an interval for display (long form).
 * @param {Interval} interval
 * @returns {string}
 */
export function formatInterval(interval) {
  if (!interval) return "";
  let str = `${interval.name}`;
  if (interval.description) str += `: ${interval.description}`;
  return str;
}

// For backward compatibility, export the static intervals as default
export default staticIntervals;
