// config/amiClient.js
import net from "net";
import { EventEmitter } from "events";
import chalk from "chalk";

function createAMIClient() {
  const client = new EventEmitter();
  let netClient = null;
  let connected = false;
  const callbacks = new Map();
  const pendingActions = [];
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 5000;
  let loginSent = false;
  let currentResponse = null;

  const host = process.env.AMI_HOST;
  const port = process.env.AMI_PORT;
  const username = process.env.ASTERISK_AMI_USERNAME;
  const password = process.env.AMI_PASSWORD;

  function connect() {
    // If already connected, return immediately
    if (connected) {
      console.log(
        chalk.blue("[AMI] Already connected, skipping connection attempt")
      );
      return Promise.resolve(true);
    }

    if (netClient) {
      netClient.destroy();
    }

    return new Promise((resolve, reject) => {
      // Validate required environment variables
      if (!host || !port || !username || !password) {
        const missingVars = [];
        if (!host) missingVars.push("AMI_HOST");
        if (!port) missingVars.push("AMI_PORT");
        if (!username) missingVars.push("ASTERISK_AMI_USERNAME");
        if (!password) missingVars.push("AMI_PASSWORD");

        console.error(
          chalk.red(
            `[AMI] Missing required environment variables: ${missingVars.join(
              ", "
            )}`
          )
        );
        return reject(
          new Error(`Missing AMI configuration: ${missingVars.join(", ")}`)
        );
      }

      console.log(chalk.blue(`[AMI] Connecting to ${host}:${port}...`));

      netClient = net.createConnection({ host, port }, () => {
        console.log(chalk.blue("[AMI] TCP Connection established"));
      });

      netClient.on("error", (err) => {
        console.error(chalk.red("[AMI] TCP Connection error:"), err.message);
        reject(err);
      });

      const loginTimeout = setTimeout(() => {
        if (!connected) {
          reject(new Error("AMI connection timeout"));
          netClient.destroy();
        }
      }, 30000); // Increased from 10 to 30 seconds

      const handleLogin = async () => {
        if (loginSent) return;
        loginSent = true;

        try {
          console.log(chalk.blue("[AMI] Sending login credentials..."));
          const response = await sendAction({
            Action: "Login",
            Username: username,
            Secret: password,
            Events: "system,call,all",
          });

          if (response.Response === "Success") {
            connected = true;
            reconnectAttempts = 0;
            clearTimeout(loginTimeout);
            console.log(chalk.green("[AMI] Authentication successful"));

            while (pendingActions.length > 0) {
              const action = pendingActions.shift();
              sendAction(action.action)
                .then(action.resolve)
                .catch(action.reject);
            }

            client.emit("connect");
            resolve(true);
          } else {
            const error = new Error(
              `Authentication failed: ${JSON.stringify(response, null, 2)}`
            );
            console.warn(
              chalk.yellow(`[AMI] Authentication failed: ${response.Message}`)
            );
            client.emit("error", error);
            reject(error);
          }
        } catch (error) {
          clearTimeout(loginTimeout);
          client.emit("error", error);
          reject(error);
        }
      };

      const onInitialData = (data) => {
        const message = data.toString();
        if (message.includes("Asterisk Call Manager")) {
          netClient.removeListener("data", onInitialData);
          netClient.on("data", onData);
          handleLogin();
        }
      };

      netClient.on("data", onInitialData);
      netClient.on("end", onDisconnect);
      netClient.on("close", onDisconnect);
    });
  }

  function onData(data) {
    const messages = data.toString().split("\r\n\r\n");
    messages.forEach((message) => {
      if (!message.trim()) return;

      const parsed = parseMessage(message);

      // Handle command responses with proper lifecycle
      if (parsed.ActionID && callbacks.has(parsed.ActionID)) {
        const { resolve } = callbacks.get(parsed.ActionID);

        if (parsed.Response === "Follows") {
          // Initialize response collection
          currentResponse = {
            ...parsed,
            Output: parsed.Output || "",
            complete: false,
          };
        } else if (
          parsed.Response === "Success" ||
          parsed.Response === "Error"
        ) {
          if (currentResponse && currentResponse.ActionID === parsed.ActionID) {
            // Append final output and mark as complete
            if (parsed.Output) {
              currentResponse.Output += parsed.Output;
            }
            currentResponse.complete = true;
            resolve(currentResponse);
            currentResponse = null;
          } else {
            // Single response
            resolve(parsed);
          }
          callbacks.delete(parsed.ActionID);
        } else if (
          currentResponse &&
          currentResponse.ActionID === parsed.ActionID
        ) {
          // Accumulate output for multi-line responses
          if (parsed.Output) {
            currentResponse.Output += parsed.Output;
          }
        }
      } else if (parsed.Event) {
        client.emit("event", parsed);
        client.emit(parsed.Event, parsed);
      }
    });
  }

  function parseMessage(message) {
    return message.split("\r\n").reduce((obj, line) => {
      const [key, value] = line.split(": ");
      if (key && value) obj[key.trim()] = value.trim();
      return obj;
    }, {});
  }

  function sendAction(action) {
    return new Promise((resolve, reject) => {
      if (!connected && action.Action !== "Login") {
        console.warn(
          chalk.yellow("[AMI] Not connected, queuing action:", action)
        );
        pendingActions.push({ action, resolve, reject });
        return;
      }

      const actionID = `ami_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      action.ActionID = actionID;

      // Set a shorter timeout for Command actions
      const timeout = action.Action === "Command" ? 5000 : 10000;

      callbacks.set(actionID, {
        resolve,
        reject,
        timer: setTimeout(() => {
          if (callbacks.has(actionID)) {
            console.warn(
              chalk.yellow(`[AMI] Action timeout: ${action.Action}`)
            );
            callbacks.delete(actionID);
            currentResponse = null;
            reject(new Error(`AMI Action timeout: ${action.Action}`));
          }
        }, timeout),
      });

      const message =
        Object.entries(action)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\r\n") + "\r\n\r\n";

      console.log(chalk.gray(`[AMI] Sending action: ${action.Action}`));
      netClient.write(message);
    });
  }

  function onDisconnect() {
    if (connected) {
      console.warn(
        chalk.yellow("[AMI] Connection lost. Attempting to reconnect...")
      );
      connected = false;
      client.emit("disconnect");
      attemptReconnect();
    }
  }

  function onError(err) {
    console.error(chalk.red("[AMI] Connection error:", err.message));
    client.emit("error", err);
  }

  function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        chalk.red("[AMI] Max reconnect attempts reached. Stopping retry.")
      );
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
    console.log(
      chalk.yellow(`[AMI] Reconnecting in ${delay / 1000} seconds...`)
    );

    setTimeout(() => {
      reconnectAttempts++;
      connect().catch(() => {
        // Only attempt reconnect if we're not already connected
        if (!connected) {
          attemptReconnect();
        }
      });
    }, delay);
  }

  function disconnect() {
    if (netClient && connected) {
      sendAction({ Action: "Logoff" }).catch((error) => {
        console.warn(chalk.yellow("[AMI] Error during logoff:", error.message));
      });
      netClient.end();
      connected = false;
      client.emit("disconnect");
    }
  }

  return {
    connect,
    disconnect,
    sendAction,
    isConnected: () => connected,
    on: (event, listener) => client.on(event, listener),
    off: (event, listener) => client.off(event, listener),
  };
}

// Create a singleton instance
const amiClient = createAMIClient();

export const getAmiClient = () => amiClient;

export const getAmiState = () => ({
  connected: amiClient.isConnected(),
});
export default amiClient;
