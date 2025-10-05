export const createRegisterOptions = (extension, config) => ({
  instanceId: config?.pjsip?.instance_id || Date.now().toString(),
  regId: 1,
  registrar: {
    uri:
      config?.registrar_uri || `sip:${config?.server_ip || "cs.backspace.ug"}`,
    wsServers: [`wss://${config?.server_ip || "cs.backspace.ug"}:8088/ws`],
  },
  contactName: extension,
});
