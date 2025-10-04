import axios from "axios";

const apiClient = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api"
      : process.env.REACT_APP_API_URL || "http://localhost:8001/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add internal API key for license-related requests
    if (config.url.includes("/licenses")) {
      config.headers["X-Internal-API-Key"] =
        process.env.REACT_APP_SECRET_INTERNAL_API_KEY;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
