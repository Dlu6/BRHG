import React from "react";
import { Box, Grid, IconButton, Typography } from "@mui/material";
import { Backspace, Phone as PhoneIcon } from "@mui/icons-material";
import { dtmfService } from "../services/dtmfService";

function DialPad({ onNumberClick, onDelete, onDial, currentNumber }) {
  const numbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  const handleNumberClick = (num) => {
    onNumberClick(num);
  };

  const handleDial = () => {
    if (currentNumber && onDial) {
      onDial(currentNumber);
    }
  };

  return (
    <Box
      sx={{
        width: "240px",
        backgroundColor: "#2c3338",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          padding: 2,
          borderBottom: "1px solid #444",
          minHeight: "60px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Typography
            variant="h7"
            sx={{
              color: "#fff",
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentNumber || "Enter Number"}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <IconButton
              onClick={onDelete}
              sx={{
                color: "#fff",
                "&:hover": { color: "#ff4444" },
              }}
            >
              <Backspace />
            </IconButton>
            <IconButton
              onClick={handleDial}
              disabled={!currentNumber}
              sx={{
                color: "#fff",
                backgroundColor: "#28a745",
                "&:hover": {
                  backgroundColor: "#218838",
                },
                "&:disabled": {
                  backgroundColor: "#1e7e34",
                  opacity: 0.7,
                },
              }}
            >
              <PhoneIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
      <Box sx={{ padding: 2 }}>
        <Grid container spacing={1}>
          {numbers.map((row, rowIndex) => (
            <Grid item xs={12} key={rowIndex}>
              <Grid container spacing={1}>
                {row.map((num) => (
                  <Grid item xs={4} key={num}>
                    <IconButton
                      onClick={() => handleNumberClick(num)}
                      sx={{
                        width: "100%",
                        height: "48px",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      <Typography variant="h6">{num}</Typography>
                    </IconButton>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default DialPad;
