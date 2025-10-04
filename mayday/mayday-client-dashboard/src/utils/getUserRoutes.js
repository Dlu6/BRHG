// src/utils/getUserRoutes.js

const getUserRoutes = (user) => {
  //   console.log(user, "User in getUserRoutes>>>>");
  if (!user || !user.role) {
    // Return an empty array or some default routes if no user or user role is defined
    return [];
  }
  // Assuming `user` is an object with a `role` or `permissions` property
  // Define routes available to each role
  const routes = {
    admin: [
      { name: "Dashboard", path: "/dashboard", default: true },
      {
        name: "Staff",
        path: "/staff",
        children: [
          { name: "Agents", path: "/agents" },
          // { name: "Delete Agents", path: "/staff/deleteAgent" },
        ],
      },
      {
        name: "Voice",
        path: "/voice",
        children: [
          { name: "Voice Queues", path: "/voice/voiceQueues", exact: false },
          {
            name: "Inbound Routes",
            path: "/voice/inboundRoutes",
            exact: false,
          },
          {
            name: "Outbound Routes",
            path: "/voice/outboundRoutes",
            exact: false,
            children: [
              { name: "Create Route", path: "/voice/outboundRoutes/create" },
              { name: "View Routes", path: "/voice/outboundRoutes/list" },
            ],
          },
          { name: "Contexts", path: "/voice/contexts", exact: false },
          { name: "Music On Hold", path: "/voice/musicOnhold", exact: false },
          { name: "Recordings", path: "/voice/recordings", exact: false },
          // { name: "Chan Spy", path: "/voice/chanSpies", exact: false },
          { name: "Realtime", path: "/voice/realtime", exact: false },
        ],
      },
      {
        name: "IVR",
        path: "/ivr",
        children: [
          { name: "IVR Projects", path: "/ivr/projects" },
          // { name: "IVR Builder", path: "/ivr/builder" },
          // { name: "IVR Builder Edit", path: "/ivr/builder/:id", hidden: true },
          { name: "ODBC", path: "/ivr/odbc" },
        ],
      },
      {
        name: "Tools",
        path: "/tools",
        children: [
          { name: "Trunks", path: "/tools/trunks" },
          { name: "Audio Manager", path: "/tools/audio" },
          { name: "Intervals", path: "/tools/intervals" },
          // { name: "Triggers", path: "/tools/triggers" },
          // { name: "Variables", path: "/tools/variables" },
        ],
      },
      {
        name: "Analytics",
        path: "/analytics",
        children: [
          { name: "Reports", path: "/analytics/reports" },
          // { name: "Extracted Reports", path: "/analytics/extractedReports" },
          // { name: "Metrics", path: "/analytics/metrics" },
        ],
      },

      {
        name: "Integrations",
        path: "/integrations",
        children: [
          {
            name: "Salesforce Account",
            path: "/integrations/salesforceAccount",
            feature: "salesforce",
          },
          // { name: "Freshdesk Account", path: "/integrations/freshdesk" },
          {
            name: "WhatsApp",
            path: "/whatsapp",
            feature: "whatsapp",
            // icon: <WhatsAppIcon sx={{ color: "white" }} />,
          },
          {
            name: "Zoho CRM",
            path: "/integrations/zoho",
            feature: "zoho",
          },
          {
            name: "SMS",
            path: "/integrations/sms",
            feature: "sms",
          },
        ],
      },
      // { name: 'Settings', path: '/settings' },
      {
        name: "Settings", // Add the Networks menu
        path: "/settings",
        children: [
          { name: "Networks", path: "/settings/networks" },
          // { name: "General", path: "/settings/general" },
          { name: "License", path: "/settings/license" },
          // { name: "System Health", path: "settings/system" },
          // Add more submenus as needed (e.g., /networks/devices, etc.)
        ],
      },
      {
        name: "Support", // Add the Networks menu
        path: "/support",
        children: [
          { name: "About", path: "/support/about" },
          // { name: "Tickets", path: "/support/ticket" },
          // Add more submenus as needed (e.g., /networks/devices, etc.)
        ],
      },
      { name: "Email Management", path: "/emails" },
      {
        name: "Documentation",
        // path: "https://cs.lusuku.shop/docs/",
        path: "https://www.maydaycrm.com/wiki/",
        external: true,
        target: "_blank",
      },
      // ...other admin routes
    ],
    manager: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Reports", path: "/reports" },
      // ...other manager routes
    ],
    staff: [
      { name: "Dashboard", path: "/dashboard" },
      // ...other staff routes
    ],
  };

  // Return the routes available to the user's role
  return routes[user.role] || [];
};

export default getUserRoutes;
