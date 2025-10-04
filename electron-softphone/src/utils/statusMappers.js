// Not Using this currently
// src/utils/statusMappers.js
export const deviceStateMap = {
  INUSE: "On Call",
  BUSY: "On Call",
  RINGING: "Ringing",
  RINGINUSE: "Ringing",
  ONHOLD: "On Hold",
  UNAVAILABLE: "Unavailable",
  NOT_INUSE: "Available",
  INVALID: "Unknown",
  UNKNOWN: "Unknown",
};

export const presenceStateMap = {
  READY: "Ready",
  NOT_READY: "Not Ready",
  BUSY: "Busy",
  BREAK: "On Break",
};

export const statusColorMap = {
  registered: "#0ca",
  unregistered: "#999",
  error: "#f44",
  READY: "#0ca",
  NOT_READY: "#f44",
  BUSY: "#f90",
  BREAK: "#fc0",
  "On Call": "#f44",
  Ringing: "#f90",
  Available: "#0ca",
  Unavailable: "#999",
};

export const getStatusColor = (status) => statusColorMap[status] || "#999";
export const mapDeviceState = (state) => deviceStateMap[state] || "Unknown";
export const mapPresenceState = (state) => presenceStateMap[state] || "Unknown";
