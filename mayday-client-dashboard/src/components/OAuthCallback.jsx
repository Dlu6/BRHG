import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import { ContentCopy, ArrowBack } from "@mui/icons-material";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authCode = params.get("code");
    const err = params.get("error");

    if (err) {
      setError(err);
    }

    if (authCode) {
      setCode(authCode);
      // Copy to clipboard for convenience
      try {
        navigator.clipboard.writeText(authCode);
        setCopied(true);
      } catch (_) {
        // Ignore clipboard errors
      }
    }
  }, [location.search]);

  const handleBackToZoho = () => {
    navigate("/integrations/zoho");
  };

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 720, width: "100%" }}>
        <CardHeader
          title="OAuth Callback"
          subheader="Zoho authorization response"
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}

          {code ? (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Authorization code received. It has{" "}
                {copied ? "been copied" : "not been copied"} to your clipboard.
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: (theme) => theme.palette.grey[100],
                  borderRadius: 1,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  mb: 2,
                }}
              >
                {code}
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<ContentCopy />}
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopied(true);
                  }}
                >
                  Copy Code
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleBackToZoho}
                >
                  Back to Zoho Integration
                </Button>
              </Stack>
            </>
          ) : (
            <Typography variant="body1">
              No authorization code found in the URL.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OAuthCallback;
