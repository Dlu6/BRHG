import apiClient from "../api/apiClient";

const odbcService = {
  getOdbcStatus: () => apiClient.get("/odbc/status"),
  testOdbcConnection: () => apiClient.post("/odbc/test"),
};

export default odbcService;
