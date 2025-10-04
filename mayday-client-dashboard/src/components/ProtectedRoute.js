// src/components/ProtectedRoute.js
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = () => {
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.status === "loading");

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
