import React from "react";
import useLicense from "../hooks/useLicense";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";

const DebugLicense = () => {
  const { features, hasFeature, isLicensed, licenseStatus } =
    useLicense();

  return (
    <Card
      sx={{
        // Full width
        width: "100%",
        // maxWidth: 1200,
        // mx: "auto",
        // Left align the card
        alignSelf: "left",
        mt: 3,
      }}
    >
      <CardContent>
        {/* <Typography variant="h6" gutterBottom>
          License Summary!
        </Typography> */}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>License Status:</strong> {licenseStatus}
          </Typography>
          <Typography variant="body2">
            <strong>Is Licensed:</strong> {isLicensed ? "Yes" : "No"}
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom>
          Available Features:
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {Object.entries(features).map(([feature, enabled]) => (
            <Chip
              key={feature}
              label={`${feature}: ${enabled ? "✅" : "❌"}`}
              color={enabled ? "success" : "default"}
              variant={enabled ? "filled" : "outlined"}
            />
          ))}
        </Box>

        <Typography variant="h6" gutterBottom>
          Feature Checks:
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip
            label={`zoho: ${hasFeature("zoho") ? "✅" : "❌"}`}
            color={hasFeature("zoho") ? "success" : "error"}
            variant="filled"
          />
          <Chip
            label={`salesforce: ${hasFeature("salesforce") ? "✅" : "❌"}`}
            color={hasFeature("salesforce") ? "success" : "error"}
            variant="filled"
          />
          <Chip
            label={`whatsapp: ${hasFeature("whatsapp") ? "✅" : "❌"}`}
            color={hasFeature("whatsapp") ? "success" : "error"}
            variant="filled"
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Raw License Data:
        </Typography>

        <Box
          sx={{
            bgcolor: "grey.100",
            p: 2,
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.8rem",
            overflow: "auto",
          }}
        >
          {/* VERY IMPORTANT: DO NOT SHARE THIS DATA WITH ANYONE! */}
          {/* <pre>{JSON.stringify(license, null, 2)}</pre> */}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DebugLicense;
