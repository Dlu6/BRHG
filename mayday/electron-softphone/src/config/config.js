const config = {
  development: {
    apiUrl: "http://localhost:8004",
    wsUrl: "ws://localhost:8004",
    baseUrl: "http://localhost:5173",
    sipWsUrl: "ws://13.234.18.2:8088/ws",
  },
  production: {
    apiUrl: "https://cs.hugamara.com/mayday-api",
    wsUrl: "wss://cs.hugamara.com/ws",
    baseUrl: "https://cs.hugamara.com/mayday-api",
    // sipWsUrl: "ws://13.234.18.2:8088/ws",
    sipWsUrl: "wss://cs.hugamara.com/ws",
  },
};

const environment = process.env.NODE_ENV || "development";
export default config[environment];
