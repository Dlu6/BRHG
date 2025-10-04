// src/index.js
import { createRoot } from "react-dom/client";
import App from "./App";
import { UserProvider } from "./auth/UserContext";
import { Provider } from "react-redux";
import { SnackbarProvider } from "notistack";
import { store } from "./store.js";

// Get the root element
const container = document.getElementById("root");
// Create a root
const root = createRoot(container);

// Render your app
root.render(
  <>
    <Provider store={store}>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <UserProvider>
          <App />
        </UserProvider>
      </SnackbarProvider>
    </Provider>
  </>
);
