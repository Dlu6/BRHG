// services/transferHistoryService.js
import { storageService } from "./storageService";

class TransferHistoryService {
  constructor() {
    this.history = this.loadHistory();
    this.maxHistorySize = 100; // Keep last 100 transfers
  }

  // Load transfer history from localStorage
  loadHistory() {
    try {
      const saved = localStorage.getItem("transferHistory");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading transfer history:", error);
      return [];
    }
  }

  // Save transfer history to localStorage
  saveHistory() {
    try {
      localStorage.setItem("transferHistory", JSON.stringify(this.history));
    } catch (error) {
      console.error("Error saving transfer history:", error);
    }
  }

  // Add a transfer record
  addTransfer(transferData) {
    const transfer = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fromExtension: storageService.getUserData()?.user?.extension || "unknown",
      transferType: transferData.transferType || "blind",
      ...transferData,
    };

    this.history.unshift(transfer);

    // Keep only the last maxHistorySize transfers
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveHistory();
    return transfer;
  }

  // Get transfer history
  getHistory(limit = 50) {
    return this.history.slice(0, limit);
  }

  // Get transfers by date range
  getTransfersByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return this.history.filter((transfer) => {
      const transferTime = new Date(transfer.timestamp).getTime();
      return transferTime >= start && transferTime <= end;
    });
  }

  // Get transfers by target extension
  getTransfersByTarget(targetExtension) {
    return this.history.filter(
      (transfer) => transfer.targetExtension === targetExtension
    );
  }

  // Get transfer statistics
  getTransferStats() {
    const stats = {
      total: this.history.length,
      successful: 0,
      failed: 0,
      byTarget: {},
      byDate: {},
    };

    this.history.forEach((transfer) => {
      // Count success/failure
      if (transfer.status === "success" || transfer.status === "completed") {
        stats.successful++;
      } else if (
        transfer.status === "failed" ||
        transfer.status === "rejected"
      ) {
        stats.failed++;
      }

      // Count by target
      const target = transfer.targetExtension;
      if (!stats.byTarget[target]) {
        stats.byTarget[target] = 0;
      }
      stats.byTarget[target]++;

      // Count by date
      const date = transfer.timestamp.split("T")[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = 0;
      }
      stats.byDate[date]++;
    });

    return stats;
  }

  // Get most frequent transfer targets
  getMostFrequentTargets(limit = 5) {
    const stats = this.getTransferStats();
    const targets = Object.entries(stats.byTarget)
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return targets;
  }

  // Clear transfer history
  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  // Export transfer history
  exportHistory() {
    return {
      history: this.history,
      stats: this.getTransferStats(),
      exportDate: new Date().toISOString(),
    };
  }

  // Import transfer history
  importHistory(data) {
    if (data.history && Array.isArray(data.history)) {
      this.history = data.history;
      this.saveHistory();
      return true;
    }
    return false;
  }
}

// Create singleton instance
const transferHistoryService = new TransferHistoryService();

export default transferHistoryService;
