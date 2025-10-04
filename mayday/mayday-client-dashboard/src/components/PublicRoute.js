import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    // Redirect to the page they came from, or dashboard as default
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
