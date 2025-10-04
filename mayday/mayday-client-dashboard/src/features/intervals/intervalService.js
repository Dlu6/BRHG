// intervalService.js
import apiClient from "../../api/apiClient";

// Fetch all intervals
export const getIntervals = async () => {
  const response = await apiClient.get("/users/intervals");
  return response.data;
};

// Fetch a single interval by ID
export const getIntervalById = async (id) => {
  const response = await apiClient.get(`/users/intervals/${id}`);
  return response.data;
};

// Create a new interval
export const createInterval = async (data) => {
  // Ensure data is properly formatted
  const formattedData = {
    ...data,
    timeRange: data.timeRange || { from: "00:00", to: "23:59" },
    weekDays: Array.isArray(data.weekDays) ? data.weekDays : [],
    monthDays: Array.isArray(data.monthDays) ? data.monthDays : [],
    months: Array.isArray(data.months) ? data.months : [],
  };

  const response = await apiClient.post("/users/intervals", formattedData);
  return response.data;
};

// Update an existing interval
export const updateInterval = async (id, data) => {
  // Ensure data is properly formatted
  const formattedData = {
    ...data,
    timeRange: data.timeRange || { from: "00:00", to: "23:59" },
    weekDays: Array.isArray(data.weekDays) ? data.weekDays : [],
    monthDays: Array.isArray(data.monthDays) ? data.monthDays : [],
    months: Array.isArray(data.months) ? data.months : [],
  };

  const response = await apiClient.put(`/users/intervals/${id}`, formattedData);
  return response.data;
};

// Delete an interval
export const deleteInterval = async (id) => {
  const response = await apiClient.delete(`/users/intervals/${id}`);
  return response.data;
};
