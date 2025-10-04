// // hooks/useSIPEvents.js
// import { useEffect, useState } from "react";
// import { useDispatch } from "react-redux";

// export function useSIPEvents() {
//   const dispatch = useDispatch();
//   const [sipState, setSipState] = useState({
//     registered: false,
//     contactHeader: null,
//     callId: null,
//     userAgent: null,
//   });

//   useEffect(() => {
//     if (!window.sipUA) return;

//     const handleRegistered = (e) => {
//       const data = {
//         registered: true,
//         contactHeader: e?.transport?.contact?.uri,
//         callId: e?.data?.call_id,
//         userAgent:
//           e?.response?.headers["User-Agent"]?.[0]?.raw || "Asterisk PBX",
//         timestamp: new Date().toISOString(),
//       };
//       setSipState(data);
//       dispatch({ type: "registration/updateStatus", payload: data });
//     };

//     const handleUnregistered = () => {
//       const data = {
//         registered: false,
//         contactHeader: null,
//         callId: null,
//         userAgent: null,
//         timestamp: new Date().toISOString(),
//       };
//       setSipState(data);
//       dispatch({ type: "registration/updateStatus", payload: data });
//     };

//     const handleRegistrationFailed = (e) => {
//       const data = {
//         registered: false,
//         error: e?.cause || "Registration failed",
//         timestamp: new Date().toISOString(),
//       };
//       setSipState((prev) => ({ ...prev, ...data }));
//       dispatch({ type: "registration/updateStatus", payload: data });
//     };

//     // Add event listeners to the global sipUA instance
//     window.sipUA.on("registered", handleRegistered);
//     window.sipUA.on("unregistered", handleUnregistered);
//     window.sipUA.on("registrationFailed", handleRegistrationFailed);

//     // If already registered when hook mounts, update state
//     if (window.sipUA.isRegistered()) {
//       handleRegistered({
//         transport: window.sipUA.transport,
//         response: window.sipUA.registrator?.response,
//       });
//     }

//     return () => {
//       window.sipUA.off("registered", handleRegistered);
//       window.sipUA.off("unregistered", handleUnregistered);
//       window.sipUA.off("registrationFailed", handleRegistrationFailed);
//     };
//   }, [dispatch]);

//   return sipState;
// }
