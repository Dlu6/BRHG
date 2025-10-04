import getUserRoutes from "../utils/getUserRoutes";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  AppBar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Paper,
  Typography,
  CssBaseline,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import DashboardIcon from "@mui/icons-material/Dashboard"; // Import the icons you need
import SettingsIcon from "@mui/icons-material/Settings";
import BookIcon from "@mui/icons-material/Book";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SchemaIcon from "@mui/icons-material/Schema";
import PeopleIcon from "@mui/icons-material/People";
import AnalyticsIcon from "@mui/icons-material/Assessment";
import IntegrationIcon from "@mui/icons-material/IntegrationInstructions";
import UsersIcon from "@mui/icons-material/SupportAgent";
import VoiceIcon from "@mui/icons-material/DialerSip";
import EmailIcon from "@mui/icons-material/Email";
import { Outlet } from "react-router-dom";
import ExpandMore from "@mui/icons-material/NavigateNext";
import ExpandLess from "@mui/icons-material/ExpandMore";
import { useLocation } from "react-router-dom";
import Collapse from "@mui/material/Collapse";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutButton from "./auth/LogoutButton";
// import reachmilogo from "../assets/images/reachmi-logo.svg";
// import morvenlogo from "../assets/images/morven-logo.png";
import brLogo from "../assets/images/br-logo.svg";
import useLicense from "../hooks/useLicense";

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { hasFeature } = useLicense();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [open, setOpen] = useState({});
  const location = useLocation();
  const [selectedRoutePath, setSelectedRoutePath] = useState("");
  const [activeMenuName, setActiveMenuName] = useState("Dashboard");
  const navigate = useNavigate();

  const userRoutes = useMemo(() => {
    if (!isAuthenticated) return [];

    const allRoutes = getUserRoutes(user);

    const filterRoutes = (routes) => {
      return routes.reduce((acc, route) => {
        if (route.feature && !hasFeature(route.feature)) {
          return acc;
        }

        if (route.children) {
          const filteredChildren = filterRoutes(route.children);
          if (filteredChildren.length > 0) {
            acc.push({ ...route, children: filteredChildren });
          } else {
            // If all children are filtered out, don't show the parent either, unless it's a link itself
            if (route.path && route.path !== "#") {
              const { children, ...rest } = route;
              acc.push(rest);
            }
          }
        } else {
          acc.push(route);
        }
        return acc;
      }, []);
    };

    return filterRoutes(allRoutes);
  }, [isAuthenticated, user, hasFeature]);

  const userRoutesRef = useRef();
  userRoutesRef.current = userRoutes;

  useEffect(() => {
    const findRouteName = (routes, pathname) => {
      for (let route of routes) {
        if (route.path === pathname) {
          return route.name;
        }
        if (route.children) {
          const foundName = findRouteName(route.children, pathname);
          if (foundName) return foundName;
        }
      }
      return null;
    };

    const findParentName = (routes, pathname) => {
      for (const route of routes) {
        if (route.children?.some((child) => child.path === pathname)) {
          return route.name;
        }
      }
      return null;
    };

    const activeRouteName = findRouteName(
      userRoutesRef.current,
      location.pathname
    );
    setActiveMenuName(activeRouteName || "~");
    setSelectedRoutePath(location.pathname);

    const parentName = findParentName(userRoutesRef.current, location.pathname);
    setOpen((currentOpen) => {
      const newOpenState = {};
      if (parentName) {
        newOpenState[parentName] = true;
      }

      // Deep compare to avoid needless re-renders and loops
      if (JSON.stringify(currentOpen) === JSON.stringify(newOpenState)) {
        return currentOpen;
      }
      return newOpenState;
    });
  }, [location.pathname]); // Depend only on pathname to avoid re-running on other location changes

  const iconsMap = {
    Dashboard: <DashboardIcon sx={{ color: "white" }} />,
    Settings: <SettingsIcon sx={{ color: "red" }} />,
    Documentation: <BookIcon sx={{ color: "white" }} />,
    Support: <SupervisorAccountIcon sx={{ color: "white" }} />,
    IVR: <SchemaIcon sx={{ color: "white" }} />,
    Tools: <SettingsIcon sx={{ color: "white" }} />,
    Voice: <VoiceIcon sx={{ color: "white" }} />,
    People: <PeopleIcon sx={{ color: "white" }} />,
    Analytics: <AnalyticsIcon sx={{ color: "white" }} />,
    Integrations: <IntegrationIcon sx={{ color: "white" }} />,
    Staff: <UsersIcon sx={{ color: "white" }} />,
    "Email Management": <EmailIcon sx={{ color: "white" }} />,
  };

  const drawerWidth = 240;

  const handleClick = (name) => {
    setOpen((prevOpen) => {
      const isCurrentlyOpen = !!prevOpen[name];
      // If clicking an already open menu, close it. Otherwise, open the new one.
      return isCurrentlyOpen ? {} : { [name]: true };
    });
  };

  const getActiveMenuIcon = (activeMenuName) => {
    // Find the route object that matches the activeMenuName
    const activeRoute = userRoutes.find(
      (route) => route.name === activeMenuName
    );
    // Return the corresponding icon from iconsMap, or null if not found
    return activeRoute ? iconsMap[activeRoute.name] : null;
  };

  // Toggle drawer function
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Updated color scheme
  const colors = {
    primary: "#002F4C", // Base drawer color
    secondary: "#004B7D", // Light blue for child items
    // accent: "#F26800", // Orange for active parent
    accent: "#9FC131", // Orange for active parent
    hover: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff",
    icon: "#ffffff",
    iconSelected: "#F26800",
  };

  // Modified drawer styles
  const drawerStyles = {
    width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    transition: (theme) =>
      theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    "& .MuiDrawer-paper": {
      width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
      overflowX: "hidden",
      transition: (theme) =>
        theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      backgroundColor: colors.primary,
      color: colors.text,
    },
  };

  // Add this helper function to check if a route is active
  const isRouteActive = (route) => {
    // Direct match
    if (selectedRoutePath === route.path) return true;
    // Check if any children are active
    if (route.children) {
      return route.children.some((child) => selectedRoutePath === child.path);
    }
    return false;
  };

  // Modified listItemStyles to handle different active states for parent and child
  const listItemStyles = (route) => {
    const isActive = isRouteActive(route);
    const hasChildren = Boolean(route.children);
    const isParentWithActiveChild = hasChildren && isActive;

    return {
      backgroundColor: isParentWithActiveChild ? colors.accent : "transparent",
      "&:hover": {
        backgroundColor: isParentWithActiveChild ? colors.accent : colors.hover,
      },
      "& .MuiListItemIcon-root": {
        color: isActive ? colors.iconSelected : colors.icon,
        transition: "color 0.2s",
      },
      "& .MuiListItemText-primary": {
        color: isParentWithActiveChild ? colors.text : "inherit",
        fontWeight: isParentWithActiveChild ? 600 : 400,
      },
      "&.Mui-selected": {
        backgroundColor: isParentWithActiveChild
          ? colors.accent
          : colors.secondary,
        "&:hover": {
          backgroundColor: isParentWithActiveChild
            ? colors.accent
            : colors.secondary,
        },
        "& .MuiListItemIcon-root": {
          color: colors.iconSelected,
        },
      },
    };
  };

  // Modified submenuItemStyles for consistent child styling
  const submenuItemStyles = (isSelected) => ({
    pl: 8,
    backgroundColor: isSelected ? colors.secondary : "transparent",
    "&:hover": {
      backgroundColor: isSelected ? colors.secondary : colors.hover,
    },
    "&.Mui-selected": {
      backgroundColor: colors.secondary,
      "&:hover": {
        backgroundColor: colors.secondary,
      },
    },
    "& .MuiListItemText-primary": {
      fontSize: "0.9rem",
      color: isSelected ? colors.text : "rgba(255, 255, 255, 0.7)",
    },
  });

  const handleRouteClick = (route) => {
    if (route.external) {
      // For external routes, navigate directly to the path
      window.location.href = route.path;
    } else if (route.children) {
      handleClick(route.name);
    } else {
      navigate(route.path);
      setSelectedRoutePath(route.path);
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#011D2B",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ marginRight: "12px", "& .MuiSvgIcon-root": { fontSize: 28 } }}
          >
            {drawerOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          {/* Logo with white shadow and larger size */}
          <img
            src={brLogo}
            alt="Mayday Logo"
            style={{
              width: "150px",
              height: "60px",
              objectFit: "contain",
              marginRight: "10px",
              marginTop: "10px",
              filter:
                "drop-shadow(0 0 8px rgb(176, 233, 248)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.31))",
              // alignSelf: "center",
            }}
          />

          {/* Spacer to push user section to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* User Profile Section - positioned at extreme right */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              marginLeft: "auto",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "#fff",
                fontWeight: 500,
              }}
            >
              {user?.name || user?.username || "Admin"}
            </Typography>
            <IconButton
              color="inherit"
              aria-label="user profile"
              onClick={() => navigate("/profile")}
              sx={{
                "& .MuiSvgIcon-root": { fontSize: 38 },
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <AccountCircleIcon />
            </IconButton>
            <LogoutButton />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={drawerStyles}>
        <Toolbar />{" "}
        {/* This adds space at the top of the drawer content, under the AppBar */}
        <Box sx={{ overflow: "auto" }}>
          <List>
            {userRoutes.map((route) => (
              <React.Fragment key={route.name}>
                <ListItem
                  button
                  onClick={() => handleRouteClick(route)}
                  selected={isRouteActive(route)}
                  sx={listItemStyles(route)}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "40px",
                    }}
                  >
                    {iconsMap[route.name] || <Box />}
                  </ListItemIcon>
                  <ListItemText primary={route.name} />
                  {route.children ? (
                    open[route.name] ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )
                  ) : null}
                </ListItem>
                {route.children && (
                  <Collapse in={open[route.name]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {route.children.map((child) => (
                        <ListItem
                          key={child.name}
                          button
                          selected={selectedRoutePath === child.path}
                          sx={submenuItemStyles(
                            selectedRoutePath === child.path
                          )}
                          onClick={() => {
                            navigate(child.path);
                            setSelectedRoutePath(child.path);
                          }}
                        >
                          <ListItemText primary={child.name} />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* This ensures content starts below the AppBar */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: "#0f4c75",
            color: "#fff",
            padding: 1.5,
            marginBottom: -7,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {getActiveMenuIcon(activeMenuName)}
            <Typography
              variant="h6"
              sx={{ marginLeft: "10px", fontWeight: 600 }}
            >
              {activeMenuName}
            </Typography>
          </Box>
        </Paper>
        <Toolbar /> {/* This ensures content starts below the AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
