const baseUrl = "http://localhost:8004/api";

const getQueueStats = async () => {
  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    const response = await fetch(`${baseUrl}/queues/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch queue stats");
    return response.json();
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    throw error;
  }
};

const joinQueue = async (queueId) => {
  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    await fetch(`${baseUrl}/queues/${queueId}/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Error joining queue:", error);
    throw error;
  }
};

export const queueService = {
  getQueueStats,
  joinQueue,
};
