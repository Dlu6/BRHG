import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const ContentFrame = ({
  open,
  onClose,
  title,
  headerColor = "#128C7E",
  children,
  sectionId,
  isCollapsed,
  hideCloseButton = false,
}) => {
  if (!open || isCollapsed) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 48,
        left: isCollapsed ? 0 : 60,
        right: 0,
        bottom: 0,
        backgroundColor: "#f0f2f5",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
      }}
      data-section={sectionId}
    >
      <Box
        sx={{
          backgroundColor: headerColor,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          minHeight: "64px",
        }}
      >
        <Typography variant="h6">{title}</Typography>
        {!hideCloseButton && (
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "white",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default ContentFrame;
