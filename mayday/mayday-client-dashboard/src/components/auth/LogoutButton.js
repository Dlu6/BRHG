import { IconButton, Tooltip } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import useAuth from "../../hooks/useAuth";

const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Tooltip title="Logout">
      <IconButton
        color="error"
        onClick={handleLogout}
        sx={{
          "& .MuiSvgIcon-root": {
            fontSize: 30,
          },
          marginLeft: -1,
        }}
      >
        <LogoutIcon />
      </IconButton>
    </Tooltip>
  );
};

export default LogoutButton;
