document.addEventListener("DOMContentLoaded", () => {
  const statusContainer = document.getElementById("status-container");
  const statusText = document.getElementById("status-text");
  const infoContainer = document.getElementById("info-container");

  const serverTimeEl = document.getElementById("server-time");
  const environmentEl = document.getElementById("environment");
  const portEl = document.getElementById("port");
  const uptimeEl = document.getElementById("uptime");
  const lastCheckedEl = document.getElementById("last-checked");

  function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  }

  async function checkStatus() {
    if (lastCheckedEl) lastCheckedEl.textContent = new Date().toLocaleString();
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Server responded with an error");
      }
      const data = await response.json();

      statusContainer.className = "status-container running";
      statusText.textContent = "Status: RUNNING";

      if (serverTimeEl) serverTimeEl.textContent = data.serverTime;
      if (environmentEl) environmentEl.textContent = data.environment;
      if (portEl) portEl.textContent = data.port;
      if (uptimeEl) uptimeEl.textContent = formatUptime(data.uptime);

      if (infoContainer) infoContainer.style.display = "block";
    } catch (error) {
      statusContainer.className = "status-container unreachable";
      statusText.textContent = "Status: UNREACHABLE";
      if (infoContainer) infoContainer.style.display = "none";
    }
  }

  // Check immediately on load, then every 5 seconds
  checkStatus();
  setInterval(checkStatus, 5000);
});
