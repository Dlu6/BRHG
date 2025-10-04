import { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  InputBase,
  IconButton,
  Toolbar,
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";

function createData(phoneNumber, description) {
  return { phoneNumber, description };
}

const rows = [
  createData("230", "Lusuku Outbound"),
  createData("30", "demo outbound calls auto generated"),
];

export const DeleteAgent = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRows = rows.filter((row) => {
    return (
      row.phoneNumber.toLowerCase().includes(search.toLowerCase()) ||
      row.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar>
          <IconButton
            onClick={handleClearSearch}
            aria-label="clear search"
            sx={{ mr: 1 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {search !== "" && <ClearIcon />}
          </IconButton>
          <InputBase
            sx={{ flex: 1 }}
            placeholder="Search…"
            value={search}
            onChange={handleSearchChange}
          />
          <IconButton type="submit" sx={{ p: 1 }} aria-label="search">
            <SearchIcon />
          </IconButton>
        </Toolbar>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="custom table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Phone Number</TableCell>
                <TableCell align="left">Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.phoneNumber}>
                    <TableCell component="th" scope="row" align="left">
                      {row.phoneNumber}
                    </TableCell>
                    <TableCell align="left">{row.description}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default DeleteAgent;
