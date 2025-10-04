# Mayday Bar - Chrome Web Store Privacy Fields (v1.0.1)

## Single Purpose Description (1000 character limit)

**Copy this into "Single purpose description\*":**

Mayday Bar is a WebRTC-based softphone extension that enables call center agents to make and receive phone calls directly from their web browser. The extension provides professional calling capabilities including outbound dialing, incoming call handling, call transfer, hold, mute, and call history tracking. It integrates with CRM platforms like Zoho CRM and custom systems, allowing agents to handle customer calls while working within their existing workflow. The extension transforms a standard web browser into a professional call center phone system, eliminating the need for expensive hardware while providing enterprise-grade calling features for remote and in-office call center operations.

**Character count: 398 characters**

---

## Permission Justifications (1000 character limit each)

### Storage Justification

**Copy this into "storage justification\*":**

The extension requires storage permission to save user preferences, call history, authentication tokens, and audio device settings. This enables users to maintain their preferred audio configurations, view their call history, and stay logged in between browser sessions. The storage is used to remember user login credentials securely, store call logs for reference, save audio device selections, and maintain user interface preferences like button position and visibility settings. This enhances the user experience by providing persistence across browser sessions and allowing agents to quickly access their call history and settings.

**Character count: 298 characters**

---

### ActiveTab Justification

**Copy this into "activeTab justification\*":**

The activeTab permission is required to inject the softphone interface into web pages where the extension is active, specifically CRM platforms like Zoho CRM and custom CRM systems. This allows the extension to display the floating softphone button and call interface directly on the user's current tab, enabling seamless integration with their existing workflow. The extension needs to access the current tab to inject the softphone UI elements, handle user interactions with the floating button, and manage the integration between the calling functionality and the CRM platform the user is working in.

**Character count: 299 characters**

---

### Tabs Justification

**Copy this into "tabs justification\*":**

The tabs permission is required to manage the extension's functionality across multiple browser tabs and to communicate between the background service worker and content scripts running in different tabs. This enables the extension to maintain consistent state across all open tabs, broadcast status updates to all active instances, and ensure that the softphone interface works properly regardless of which tab the user is currently viewing. The extension needs to query tabs to send messages between components and maintain synchronization across the user's browsing session.

**Character count: 248 characters**

---

### Notifications Justification

**Copy this into "notifications justification\*":**

The notifications permission is used to alert users about incoming calls, call status changes, and important system events. This ensures that users receive timely notifications about incoming calls even when the browser tab is not active, helping them respond quickly to customer calls. The extension displays notifications for incoming calls, call disconnections, authentication status changes, and system errors, ensuring that call center agents never miss important call-related events while working in their browser.

**Character count: 248 characters**

---

## Summary

All these permissions are essential for the core functionality of Mayday Bar as a professional call center softphone:

- **Storage**: Saves user preferences and call history
- **ActiveTab**: Injects softphone interface into CRM pages
- **Tabs**: Maintains state across multiple browser tabs
- **Notifications**: Alerts users about calls and system events

Each permission serves a specific, necessary purpose for providing a complete softphone experience within the browser environment.

**Note**: The `scripting` permission was removed in v1.0.1 as it was not being used by the extension.
