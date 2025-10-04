import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Provider } from "react-redux";
import store from "./store";
import { NotificationProvider } from "./contexts/NotificationContext";
import apiInterceptor from "./services/apiInterceptor";

// Initialize API interceptor once at startup
// The module import side-effect sets up interceptors globally
void apiInterceptor;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <NotificationProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </NotificationProvider>
    </Provider>
  </React.StrictMode>
);
