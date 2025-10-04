import { EventEmitter } from "events";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import amiService from "./amiService.js";

const execAsync = promisify(exec);

const createOdbcService = () => {
  const state = {
    configPath: "/etc/odbc.ini",
    connections: new Map(),
    initialized: false,
  };

  const emitter = new EventEmitter();

  const readOdbcConfig = async () => {
    try {
      const content = await fs.readFile(state.configPath, "utf8");
      return parseOdbcConfig(content);
    } catch (error) {
      console.error("Error reading ODBC config:", error);
      return [];
    }
  };

  const parseOdbcConfig = (content) => {
    const sections = content
      .split(/\[([^\]]+)\]/g)
      .filter(Boolean)
      .reduce((acc, curr, i, arr) => {
        if (i % 2 === 0) return acc;
        const name = curr.trim();
        const config = arr[i + 1]?.trim() || "";
        if (name !== "general") {
          acc.push({ name, dsn: config });
        }
        return acc;
      }, []);

    return sections;
  };

  const writeOdbcConfig = async (connections) => {
    try {
      let content = "[general]\n\n";

      connections.forEach((conn) => {
        content += `[${conn.name}]\n${conn.dsn}\n\n`;
      });

      await fs.writeFile(state.configPath, content, "utf8");
      await reloadOdbcModule();

      return true;
    } catch (error) {
      console.error("Error writing ODBC config:", error);
      throw error;
    }
  };

  const reloadOdbcModule = async () => {
    try {
      // Reload ODBC module using AMI
      await amiService.executeAction({
        Action: "Command",
        Command: "module reload res_odbc.so",
      });

      // Also reload cdr_odbc if it exists
      await amiService.executeAction({
        Action: "Command",
        Command: "module reload cdr_odbc.so",
      });

      return true;
    } catch (error) {
      console.error("Error reloading ODBC module:", error);
      throw error;
    }
  };

  const testConnection = async (dsn) => {
    try {
      const { stdout, stderr } = await execAsync(`isql -v "${dsn}"`);

      if (stderr) {
        throw new Error(stderr);
      }

      return {
        success: true,
        message: "Connection successful",
        details: stdout,
      };
    } catch (error) {
      return {
        success: false,
        message: "Connection failed",
        error: error.message,
      };
    }
  };

  const initialize = async () => {
    try {
      const connections = await readOdbcConfig();
      connections.forEach((conn) => {
        state.connections.set(conn.name, conn);
      });
      state.initialized = true;
      emitter.emit("initialized", true);
      return true;
    } catch (error) {
      console.error("Error initializing ODBC service:", error);
      emitter.emit("error", error);
      return false;
    }
  };

  const getConnections = () => {
    return Array.from(state.connections.values());
  };

  const addConnection = async (connection) => {
    try {
      // Test connection before adding
      const testResult = await testConnection(connection.dsn);
      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      state.connections.set(connection.name, connection);
      await writeOdbcConfig(getConnections());
      emitter.emit("connection:added", connection);
      return connection;
    } catch (error) {
      console.error("Error adding ODBC connection:", error);
      throw error;
    }
  };

  const updateConnection = async (name, connection) => {
    try {
      if (!state.connections.has(name)) {
        throw new Error("Connection not found");
      }

      // Test new connection settings
      const testResult = await testConnection(connection.dsn);
      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      state.connections.set(name, connection);
      await writeOdbcConfig(getConnections());
      emitter.emit("connection:updated", connection);
      return connection;
    } catch (error) {
      console.error("Error updating ODBC connection:", error);
      throw error;
    }
  };

  const deleteConnection = async (name) => {
    try {
      if (!state.connections.has(name)) {
        throw new Error("Connection not found");
      }

      state.connections.delete(name);
      await writeOdbcConfig(getConnections());
      emitter.emit("connection:deleted", name);
      return true;
    } catch (error) {
      console.error("Error deleting ODBC connection:", error);
      throw error;
    }
  };

  return {
    initialize,
    getConnections,
    addConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    getState: () => ({
      initialized: state.initialized,
      connectionsCount: state.connections.size,
    }),
  };
};

const odbcService = createOdbcService();
export default odbcService;
