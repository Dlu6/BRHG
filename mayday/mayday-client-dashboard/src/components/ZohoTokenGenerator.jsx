import apiClient from "../api/apiClient";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Grid,
} from "@mui/material";
import { ContentCopy, Refresh } from "@mui/icons-material";

const ZohoTokenGenerator = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    code: "",
    accessToken: "",
    refreshToken: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const steps = [
    "Enter Client Credentials",
    "Generate Authorization URL",
    "Get Authorization Code",
    "Generate Access Token",
  ];

  const handleInputChange = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const generateAuthUrl = () => {
    if (!credentials.clientId) {
      setError("Please enter your Client ID");
      return;
    }

    const scopes = [
      "ZohoCRM.modules.ALL",
      "ZohoCRM.settings.ALL",
      "ZohoCRM.org.ALL",
      "ZohoCRM.users.ALL",
    ].join(",");

    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?response_type=code&prompt=consent&client_id=${
      credentials.clientId
    }&scope=${scopes}&redirect_uri=${encodeURIComponent(
      window.location.origin + "/callback"
    )}&access_type=offline`;

    // Copy to clipboard
    navigator.clipboard.writeText(authUrl);
    setSuccess("Authorization URL copied to clipboard! Open it in a new tab.");
    setActiveStep(1);
  };

  const generateTokens = async () => {
    if (
      !credentials.clientId ||
      !credentials.clientSecret ||
      !credentials.code
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post(
        "/integrations/zoho/token",
        {
          code: credentials.code,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          redirectUri: window.location.origin + "/callback",
        },
        {
          headers: {
            "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
          },
        }
      );

      const { success, data, error } = response.data;

      if (success && data?.access_token) {
        setCredentials((prev) => ({
          ...prev,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        }));
        setSuccess("Tokens generated successfully!");
        setActiveStep(3);
      } else {
        setError(
          error || data?.error_description || "Failed to generate tokens"
        );
      }
    } catch (error) {
      setError("Failed to generate tokens: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${field} copied to clipboard!`);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 1: Enter Your Zoho Client Credentials
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the Client ID and Client Secret from your Zoho Developer
              Console.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client ID"
                  value={credentials.clientId}
                  onChange={(e) =>
                    handleInputChange("clientId", e.target.value)
                  }
                  placeholder="1000.ABC123DEF456..."
                  helperText="Found in your Zoho Developer Console"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client Secret"
                  type="password"
                  value={credentials.clientSecret}
                  onChange={(e) =>
                    handleInputChange("clientSecret", e.target.value)
                  }
                  placeholder="abc123def456..."
                  helperText="Found in your Zoho Developer Console"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={generateAuthUrl}
                disabled={!credentials.clientId}
              >
                Generate Authorization URL
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 2: Get Authorization Code
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The authorization URL has been copied to your clipboard. Follow
              these steps:
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="body2" component="div">
                <strong>Instructions:</strong>
                <ol>
                  <li>Open a new browser tab</li>
                  <li>Paste the authorization URL (Ctrl+V)</li>
                  <li>Sign in to your Zoho account if prompted</li>
                  <li>Grant permissions to the application</li>
                  <li>Copy the authorization code from the redirect URL</li>
                </ol>
              </Typography>
            </Paper>

            <TextField
              fullWidth
              label="Authorization Code"
              value={credentials.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              placeholder="1000.abc123def456..."
              helperText="Paste the authorization code from the redirect URL"
            />

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                disabled={!credentials.code}
              >
                Next: Generate Tokens
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 3: Generate Access Token
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click the button below to generate your access and refresh tokens.
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={generateTokens}
                disabled={loading}
                startIcon={loading ? <Refresh /> : null}
              >
                {loading ? "Generating Tokens..." : "Generate Tokens"}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 4: Your Tokens Are Ready!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Copy these tokens and use them in your Zoho integration setup.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Token"
                  value={credentials.accessToken}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={() =>
                          copyToClipboard(
                            credentials.accessToken,
                            "Access Token"
                          )
                        }
                        startIcon={<ContentCopy />}
                      >
                        Copy
                      </Button>
                    ),
                  }}
                  helperText="Use this as your Access Token in the integration setup"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Refresh Token"
                  value={credentials.refreshToken}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={() =>
                          copyToClipboard(
                            credentials.refreshToken,
                            "Refresh Token"
                          )
                        }
                        startIcon={<ContentCopy />}
                      >
                        Copy
                      </Button>
                    ),
                  }}
                  helperText="Use this as your Refresh Token in the integration setup"
                />
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Success!</strong> Your tokens have been generated. Copy
                them and use them in your Zoho integration setup.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 3 }}>
      <CardHeader
        title="Zoho OAuth Token Generator"
        subheader="Generate access and refresh tokens for your Zoho CRM integration"
      />
      <CardContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {renderStepContent()}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Quick Reference
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Base URL:</strong> https://www.zohoapis.com
          <br />
          <strong>Client ID & Secret:</strong> From Zoho Developer Console
          <br />
          <strong>Access Token:</strong> Generated via OAuth flow
          <br />
          <strong>Refresh Token:</strong> Generated via OAuth flow
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ZohoTokenGenerator;
