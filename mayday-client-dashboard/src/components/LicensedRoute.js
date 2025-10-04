import React from "react";
import useLicense from "../hooks/useLicense";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

const LicensedRoute = ({ feature, children }) => {
  const { isLoading, hasFeature, isLicensed, licenseStatus } = useLicense();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
        <Typography ml={2}>Verifying license...</Typography>
      </Box>
    );
  }

  if (!isLicensed) {
    return <Navigate to="/settings/license" replace />;
  }

  if (licenseStatus !== "active") {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Your license is currently {licenseStatus}. Please contact support to
          access this feature.
        </Alert>
      </Box>
    );
  }

  if (!hasFeature(feature)) {
    // Or show a "Feature Not Available" component
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          This feature is not included in your current license plan.
        </Alert>
      </Box>
    );
  }

  return children;
};

export default LicensedRoute;
