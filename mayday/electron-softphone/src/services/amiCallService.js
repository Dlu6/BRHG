import { storageService } from "./storageService";

const getBase = () => {
  const host =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8004"
      : "https://cs.backspace.ug/mayday-api";
  return host;
};

const apiFetch = async (path, options = {}) => {
  const token =
    storageService.getAuthToken() || localStorage.getItem("authToken") || "";
  const res = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const msg = data?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
};

export const amiCallService = {
  originate: async ({
    fromExtension,
    to,
    context = "from-internal",
    priority = 1,
    callerId,
  }) => {
    return apiFetch("/api/calls/originate", {
      method: "POST",
      body: JSON.stringify({ fromExtension, to, context, priority, callerId }),
    });
  },

  hangup: async ({ extension, channel }) => {
    return apiFetch("/api/calls/hangup", {
      method: "POST",
      body: JSON.stringify({ extension, channel }),
    });
  },

  transferBlind: async ({
    extension,
    targetExtension,
    context = "from-internal",
  }) => {
    return apiFetch("/api/transfers/blind", {
      method: "POST",
      body: JSON.stringify({ extension, targetExtension, context }),
    });
  },

  transferManaged: async ({
    extension,
    targetExtension,
    context = "from-internal",
    consultationTimeout = 30000,
  }) => {
    return apiFetch("/api/transfers/managed", {
      method: "POST",
      body: JSON.stringify({
        extension,
        targetExtension,
        context,
        consultationTimeout,
      }),
    });
  },

  completeManaged: async ({ transferId }) => {
    return apiFetch("/api/transfers/complete", {
      method: "POST",
      body: JSON.stringify({ transferId, action: "complete" }),
    });
  },

  cancelManaged: async ({ transferId }) => {
    return apiFetch(`/api/transfers/${transferId}`, {
      method: "DELETE",
    });
  },

  // Fetch extension availability from backend (DB-authoritative)
  getExtensionStatus: async (extension) => {
    const token =
      storageService.getAuthToken() || localStorage.getItem("authToken") || "";
    const res = await fetch(
      `${getBase()}/api/users/agents/extension/${encodeURIComponent(
        extension
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const msg = data?.message || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data?.data || {};
  },

  getAvailableAgents: async (currentExtension) => {
    const token =
      storageService.getAuthToken() || localStorage.getItem("authToken") || "";
    const res = await fetch(
      `${getBase()}/api/transfers/available-agents?currentExtension=${encodeURIComponent(
        String(currentExtension || "")
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const msg = data?.message || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data?.data || [];
  },
};

export default amiCallService;
