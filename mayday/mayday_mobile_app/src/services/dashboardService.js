import { ENDPOINTS } from "../config/endpoints";

// This is a placeholder for our authenticated fetch helper
async function fetchWithAuth(url, options = {}) {
  const { token, ...fetchOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    const authHeader = token.startsWith?.("Bearer ")
      ? token
      : `Bearer ${token}`;
    headers["Authorization"] = authHeader;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  const contentType = res.headers?.get?.("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { message: `Request failed with status ${res.status}` };
      }
      const msg =
        errorData.message ||
        errorData.error ||
        errorData.detail ||
        "API request failed";
      throw new Error(msg);
    } else {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Request failed (${res.status}). Unexpected response: ${text?.slice(
          0,
          120
        )}`
      );
    }
  }

  if (!isJson) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Unexpected response format (expected JSON). ${text?.slice(0, 120)}`
    );
  }

  return res.json();
}

function toISO(d) {
  // Ensure proper ISO for query
  return new Date(d).toISOString();
}

function parseHhMmToSeconds(hhmm) {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return 0;
  const [m, s] = hhmm.split(":");
  const mi = parseInt(m, 10) || 0;
  const se = parseInt(s, 10) || 0;
  return mi * 60 + se;
}

export const getMyPerformanceStats = async (token, timeframe = "today") => {
  // Primary endpoint (new)
  const primary = `${ENDPOINTS.BASE_URL}/reports/my-performance?timeframe=${timeframe}`;
  try {
    return await fetchWithAuth(primary, { token });
  } catch (e) {
    // Fallback to existing endpoint with explicit date range for last 24h
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const startDate = toISO(start);
    const endDate = toISO(now);

    const fallback = `${
      ENDPOINTS.BASE_URL
    }/reports/agent-performance?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}`;

    const json = await fetchWithAuth(fallback, { token });

    // Normalize fallback data to expected shape
    // Expected json: [{ name, calls, avgHandleTime, satisfaction }, ...]
    if (Array.isArray(json)) {
      const totalCalls = json.reduce((sum, a) => sum + (a.calls || 0), 0);
      // Weighted average by calls if available
      const totalWeightedSeconds = json.reduce((sum, a) => {
        const sec = parseHhMmToSeconds(a.avgHandleTime);
        const calls = a.calls || 0;
        return sum + sec * calls;
      }, 0);
      const avgSec =
        totalCalls > 0 ? Math.round(totalWeightedSeconds / totalCalls) : 0;
      const mm = Math.floor(avgSec / 60);
      const ss = (avgSec % 60).toString().padStart(2, "0");
      return {
        success: true,
        data: {
          totalCalls,
          inbound: 0, // Not available in this fallback dataset
          outbound: 0, // Not available in this fallback dataset
          missed: 0, // Not available in this fallback dataset
          avgHandleTime: `${mm}:${ss}`,
        },
      };
    }

    // If structure is unexpected, throw to surface a helpful error
    throw new Error("Unexpected response for agent-performance fallback");
  }
};
