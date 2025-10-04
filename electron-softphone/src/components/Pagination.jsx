import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from "@mui/icons-material";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "background.paper",
        borderRadius: 1,
        p: 0.5,
        boxShadow: 1,
      }}
    >
      <IconButton
        size="small"
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        sx={{ color: "primary.main" }}
      >
        <FirstPageIcon />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        sx={{ color: "primary.main" }}
      >
        <PrevIcon />
      </IconButton>

      <Typography
        variant="body2"
        sx={{
          mx: 2,
          color: "text.secondary",
          fontWeight: 500,
        }}
      >
        Page {currentPage} of {totalPages}
      </Typography>

      <IconButton
        size="small"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        sx={{ color: "primary.main" }}
      >
        <NextIcon />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        sx={{ color: "primary.main" }}
      >
        <LastPageIcon />
      </IconButton>
    </Box>
  );
};

export default Pagination;
