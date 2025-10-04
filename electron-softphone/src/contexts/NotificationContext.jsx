import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback(
    ({ message, severity = "info", duration = 6000 }) => {
      setNotification({ message, severity, duration });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ showNotification, hideNotification }}
    >
      {children}
      {notification && (
        <Snackbar
          open={!!notification}
          autoHideDuration={notification.duration}
          onClose={hideNotification}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <Alert
            onClose={hideNotification}
            severity={notification.severity}
            sx={{ width: "100%", marginTop: "30px" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
