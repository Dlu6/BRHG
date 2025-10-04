import { parseISO, isValid, isBefore, isAfter, addYears } from "date-fns";

/**
 * Middleware to validate date range parameters in requests
 * Supports both query parameters and request body
 */
export function validateDateRange(req, res, next) {
  try {
    // Check if dates are in query params or request body
    const startDate = req.query.startDate || req.body.startDate;
    const endDate = req.query.endDate || req.body.endDate;

    // Validate presence of required dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required",
        details: {
          startDate: !startDate ? "Start date is missing" : null,
          endDate: !endDate ? "End date is missing" : null,
        },
      });
    }

    // Parse the dates
    const parsedStartDate = parseISO(startDate);
    const parsedEndDate = parseISO(endDate);

    // Validate date formats
    if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
      return res.status(400).json({
        error: "Invalid date format",
        details: {
          startDate: !isValid(parsedStartDate)
            ? "Invalid start date format"
            : null,
          endDate: !isValid(parsedEndDate) ? "Invalid end date format" : null,
          expectedFormat: "YYYY-MM-DD or ISO 8601 format",
        },
      });
    }

    // Validate date range logic
    if (isBefore(parsedEndDate, parsedStartDate)) {
      return res.status(400).json({
        error: "Invalid date range",
        details: "End date must be after start date",
      });
    }

    // Prevent queries for dates too far in the past or future
    const minDate = addYears(new Date(), -2); // 2 years ago
    // Max date should be current date
    const maxDate = new Date();

    if (isBefore(parsedStartDate, minDate)) {
      return res.status(400).json({
        error: "Date range too old",
        details: "Start date cannot be more than 3 years in the past",
      });
    }

    if (isAfter(parsedEndDate, maxDate)) {
      return res.status(400).json({
        error: "Date range too far in future",
        details: "End date cannot be more than current date",
      });
    }

    // Add validated dates to the request object for controller use
    req.validatedDates = {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };

    next();
  } catch (error) {
    console.error("Error in validateDateRange middleware:", error);
    return res.status(500).json({
      error: "Date validation failed",
      details: "Internal server error during date validation",
    });
  }
}

/**
 * Middleware to validate pagination parameters
 * Supports both query parameters and request body
 */
export function validatePagination(req, res, next) {
  try {
    // Get pagination parameters from query or body
    const page = parseInt(req.query.page || req.body.page || "1");
    const limit = parseInt(req.query.limit || req.body.limit || "25");

    // Validate page number
    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: "Page number must be a positive integer",
      });
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: "Limit must be between 1 and 100",
      });
    }

    // Add validated pagination parameters to request object
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
    };

    next();
  } catch (error) {
    console.error("Error in validatePagination middleware:", error);
    return res.status(500).json({
      error: "Pagination validation failed",
      details: "Internal server error during pagination validation",
    });
  }
}

export default {
  validateDateRange,
  validatePagination,
};
