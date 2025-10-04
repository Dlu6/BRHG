# Zoho CRM Integration Guide

## 🎯 **How to Access Zoho Integration**

### **Step 1: Navigate to Integrations**

1. Log into your Mayday Dashboard
2. In the left sidebar, click on **"Integrations"**
3. You'll see a submenu with available integrations
4. Click on **"Zoho CRM"**

### **Step 2: License Requirements**

The Zoho CRM integration is available in **all license plans**:

- ✅ **Basic Plan**: Available
- ✅ **Professional Plan**: Available
- ✅ **Enterprise Plan**: Available
- ✅ **Developer Plan**: Available

### **Step 3: Setup Process**

Once you access the Zoho CRM page, you'll see:

1. **Integration Status**: Shows if Zoho is connected
2. **Setup Button**: Click "Setup Zoho Integration" to configure
3. **Token Generator**: Use "Generate OAuth Tokens" for easy token creation
4. **Data Sync**: Sync leads, contacts, and deals from Zoho

## 🔧 **Getting Zoho API Credentials**

### **Option 1: Use Built-in Token Generator (Recommended)**

1. Click **"Generate OAuth Tokens"** button
2. Enter your Zoho Client ID and Client Secret
3. Follow the step-by-step OAuth flow
4. Copy the generated Access Token and Refresh Token

### **Option 2: Manual Setup**

1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Create a Self-Client application
3. Get your Client ID and Client Secret
4. Generate OAuth tokens manually

## 📋 **Required Information**

| Field                | Value                      | Source                 |
| -------------------- | -------------------------- | ---------------------- |
| **Integration Name** | `Zoho CRM Integration`     | You choose             |
| **Base URL**         | `https://www.zohoapis.com` | Fixed value            |
| **Access Token**     | `1000.abc123def456...`     | Generated via OAuth    |
| **Refresh Token**    | `1000.xyz789uvw012...`     | Generated via OAuth    |
| **Client ID**        | `1000.ABC123DEF456...`     | Zoho Developer Console |
| **Client Secret**    | `abc123def456...`          | Zoho Developer Console |

## 🚀 **Features Available**

- **Lead Management**: Import and sync leads from Zoho CRM
- **Contact Management**: Sync contact information
- **Deal Tracking**: Import deal data and status
- **Real-time Sync**: Keep data up to date
- **Data Analytics**: View Zoho data in your reports

## 🔍 **Troubleshooting**

### **Integration Not Visible**

- Check your license plan (should be available in all plans)
- Ensure you have admin access to the dashboard
- Refresh the page and try again

### **Token Generation Issues**

- Verify your Zoho Developer Console credentials
- Check that your redirect URI matches exactly
- Ensure you have the correct API permissions

### **Sync Problems**

- Verify your Access Token is valid and not expired
- Check your Zoho CRM permissions
- Review the sync logs for specific error messages

## 📞 **Support**

If you encounter issues:

1. Check the error messages in the integration interface
2. Review your Zoho API credentials
3. Contact support with specific error details
4. Provide your license information for faster resolution

## 🔄 **Next Steps**

After setting up Zoho integration:

1. **Test Connection**: Verify your credentials work
2. **Initial Sync**: Import your existing Zoho data
3. **Monitor Sync**: Check sync status regularly
4. **View Data**: Access Zoho data in your reports dashboard

---

**Note**: The Zoho CRM integration is designed to work seamlessly with your existing call center operations, providing valuable customer data alongside your call analytics.

---

## ✅ End‑to‑End Setup We Implemented

This section documents the full flow we now support in code, from OAuth tokens to data browsing and safe inline edits.

### 1) Prerequisites

- Ensure you have a valid internal API key configured in the dashboard environment:
  - `.env`: `REACT_APP_INTERNAL_API_KEY=your-internal-key`
- Backend must be running with the integrations routes enabled.
- Your Zoho account should have permissions for CRM modules (Leads, Contacts, Deals).

### 2) Generate OAuth Tokens (Built‑in Generator)

- Go to Integrations → Zoho CRM → Generate OAuth Tokens.
- In `ZohoTokenGenerator.jsx` flow:
  - Step 1: Enter Client ID and Client Secret.
  - Step 2: Click “Generate Authorization URL” (copied to clipboard), open it in a new tab, grant access, copy the Authorization Code.
  - Step 3: Paste the Authorization Code and click “Generate Tokens”.
  - Step 4: Copy Access Token and Refresh Token.
- Redirect URI used: `https://<your-dashboard-domain>/callback`.
- Scopes used (must include org access or `/crm/v3/org` test will fail):
  - `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.org.ALL,ZohoCRM.users.ALL`
- We request re‑consent when regenerating: `prompt=consent` so a new refresh token with the new scopes is issued.
- If your Zoho account isn’t in the US DC, use the matching Accounts and API base domains (e.g., `.eu`, `.in`).

### 3) Configure the Integration

- In Zoho CRM page, click “Setup Zoho Integration” (or “Configure”).
- Fill in:
  - Base URL: `https://www.zohoapis.com`
  - Access Token, Refresh Token, Client ID, Client Secret
- Save to persist configuration.

### 4) Test Connection (Required Headers)

- Click “Test Connection”.
- All integration calls require the header:
  - `x-internal-api-key: <REACT_APP_INTERNAL_API_KEY>`
- On success, the status becomes active. Errors are shown via snackbar in Integration Management.

### 5) Sync Data

- Click “Sync Data” → choose data type: All / Leads / Contacts / Deals.
- Long syncs are supported (extended timeout). If the request times out, the server may still complete; the UI will refresh shortly after.
- The backend calls Zoho with explicit `fields` per module to satisfy Zoho’s requirement and avoid `REQUIRED_PARAM_MISSING`:
  - Leads: `id,Full_Name,Email,Phone,Company,Lead_Status`
  - Contacts: `id,Full_Name,Email,Phone,Account_Name,Lead_Source`
  - Deals: `id,Deal_Name,Account_Name,Amount,Stage,Closing_Date`
- Pagination: we fetch pages in chunks (`per_page=200`) until `more_records=false`.

### 6) Browse Zoho Data (Tabs + Pagination)

- Tabs: Leads, Contacts, Deals.
- Client‑side pagination with page size options 10/25/50/100/200 and “All”.
- Row index column added; numbering is continuous per page.
- Values are parsed whether `item.data` is a JSON string or object.
- Field mapping in UI:
  - Name uses `Full_Name` for Leads/Contacts; Deals use `Deal_Name`.
  - `Account_Name` may be an object; we render `Account_Name.name` when present.

### 7) Manage/Reset Integration

- Regenerate Tokens: use the “Regenerate Tokens” button on the Zoho card to reopen the generator and mint fresh tokens (re‑consent enforced).
- Configure: update Base URL, tokens, and client credentials via “Configure”.
- Delete: remove the integration entirely via “Delete” (card or Configure modal) and set it up afresh.

### 7) Phone Column UX (Safe Edit + Actions)

- Read‑only by default to prevent accidental edits.
- Actions area (fixed width, neatly aligned):
  - Call: triggers softphone dialing.
  - Copy: copies the number.
  - Edit: enters explicit edit mode.
- Edit mode: pencil → input appears → save with Done icon or Enter; cancel with Esc.
- Persisted to backend and Zoho via:
  - `PUT /integrations/:id/data/:dataType/:externalId` with `{ updates: { Phone: "..." } }`.

### 8) Click‑to‑Call Wiring

- When Call icon is clicked, we normalize numbers to UG local format: `0XXXXXXXXX` (strip `+256`).
- We post a message to the page: `window.postMessage({ type: "reachmi:call", number })`.
- The Chrome extension softphone (`SoftphoneBar.jsx`) listens for this message and initiates the call.

### 9) Reports Page Integration

- Under Third‑Party Integrations → “Zoho CRM Data” card:
  - Tabs for Leads / Contacts / Deals are clickable.
  - Field parsing mirrors Zoho page so values render correctly (no spurious N/A).
  - Shows a recent sample; for full browsing and pagination, use the Zoho Integration page.

---

## 🔗 Backend API Reference (used by the UI)

All requests include the header:

```
x-internal-api-key: <REACT_APP_INTERNAL_API_KEY>
```

- Test integration

```
POST /integrations/:id/test
```

- Sync data

```
POST /integrations/:id/sync
Body: { "dataType": "all" | "leads" | "contacts" | "deals" }
```

- Get integration data (cached)

```
GET /integrations/:id/data
```

- Update a single record (e.g., Phone on Contacts/Leads)

```
PUT /integrations/:id/data/:dataType/:externalId
Body: { "updates": { "Phone": "+2567..." } }
```

- Exchange OAuth tokens

```
POST /integrations/zoho/token
Body: { code, clientId, clientSecret, redirectUri }
```

---

## 🧪 cURL Examples

```
curl -X POST \
  -H "x-internal-api-key: $REACT_APP_INTERNAL_API_KEY" \
  http://localhost:8004/integrations/123/test

curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $REACT_APP_INTERNAL_API_KEY" \
  -d '{"dataType":"contacts"}' \
  http://localhost:8004/integrations/123/sync

curl -H "x-internal-api-key: $REACT_APP_INTERNAL_API_KEY" \
  http://localhost:8004/integrations/123/data

curl -X PUT \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $REACT_APP_INTERNAL_API_KEY" \
  -d '{"updates":{"Phone":"+256772000000"}}' \
  http://localhost:8004/integrations/123/data/contacts/987654321
```

---

## 🩺 Troubleshooting (What We Fixed/Handle)

- 401/403 on Test Connection: ensure the `x-internal-api-key` header is sent.
- Sync appears to “hang”: long syncs can exceed client timeout; the server continues and UI refreshes after a short delay.
- Contacts show N/A: data parsing now handles JSON strings and objects; ensure records exist for the selected tab.
- Phone edit not saving: ensure Zoho tokens are valid and the CRM module permissions allow updates.
- Click‑to‑call not dialing: verify the Chrome extension is active and listening for `reachmi:call` messages.

---

## 🔒 Security Notes

- Do not expose tokens in client code; configuration is stored server‑side.
- Internal admin endpoints are protected by the internal API key header.

---

## 📘 Where to Look in Code

- Dashboard UI: `src/components/ZohoIntegration.jsx`
- Token generator: `src/components/ZohoTokenGenerator.jsx`
- Reports view (Zoho tables): `src/components/ReportsAdminView.js`
- Backend routes: `slave-backend/routes/integrationRoutes.js`
- Backend controller/service: `slave-backend/controllers/integrationController.js`, `slave-backend/services/integrationService.js`
