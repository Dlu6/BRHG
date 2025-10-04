import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { UserProvider } from "./auth/UserContext";
import PublicRoute from "./components/PublicRoute";
import { Provider } from "react-redux";

import Dashboard from "./components/Dashboard.js";
import General from "./components/General.js";
import Staff from "./components/Staff.js";
import DeleteAgent from "./components/DeleteAgent.js";
import Voice from "./components/Voice.js";
import Tools from "./components/Tools.js";
import Trunks from "./components/Trunks.js";
import Layout from "./components/Layout.js";
import Settings from "./components/Settings.jsx";
import Analytics from "./components/Analytics.js";
import Integrations from "./components/Integrations.js";
import NotFound from "./components/NotFound.js";
import LoginMayday from "./components/LoginMayday.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import AgentsComponent from "./components/Agents.js";
import Profile from "./components/Profile.js";
import AgentEdit from "./components/AgentEdit.js";
import useWebSocket from "./hooks/useWebSocket.js";
import Networks from "./components/Networks.jsx";
import VoiceQueues from "./components/VoiceQueues.js";
import TrunkEdit from "./components/TrunkEdit.js";
import QueueEdit from "./components/QueueEdit.js";
import InboundRoute from "./components/Routes/InboundRoute.js";
import InboundRouteEdit from "./components/Routes/InboundRouteEdit.js";
import AudioManager from "./components/tools/AudioManager";
import IntervalsComponent from "./components/IntervalsComponent";
import OutboundRoute from "./components/Routes/OutboundRoute.js";
import ReportsAdminView from "./components/ReportsAdminView.js";
import About from "./components/About.js";
import IVRBuilder from "./components/ivr/IVRBuilder.jsx";
import Odbc from "./components/Odbc.js";
import IVRProjects from "./components/ivr/IVRProjects.js";
import WhatsappWebConfig from "./components/WhatsappWebConfig.js";
import OutboundRouteEdit from "./components/Routes/OutboundRouteEdit.js";
import store from "./store.js";
import Recordings from "./components/Routes/Recordings.js";
import LicenseManagement from "./components/LicenseManagement.jsx";
import LicensedRoute from "./components/LicensedRoute.js";
import SalesforceIntegration from "./components/SalesforceIntegration.jsx";
import ZohoIntegration from "./components/ZohoIntegration.jsx";
import OAuthCallback from "./components/OAuthCallback.jsx";
import EmailManagement from "./components/EmailManagement.jsx";
import Contexts from "./components/Contexts.jsx";
import SmsConfig from "./components/SmsConfig.jsx";

const App = () => {
  useWebSocket();

  return (
    <Provider store={store}>
      <Router basename="/callcenter">
        <UserProvider>
          <Routes>
            <Route path="/docs/*" element={<Navigate to="/docs" replace />} />
            {/* OAuth public callback route (must be outside ProtectedRoute) */}
            <Route path="/callback" element={<OAuthCallback />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginMayday />
                </PublicRoute>
              }
            />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="general" element={<General />} />
                <Route path="staff" element={<Staff />} />
                <Route path="staff/deleteAgent" element={<DeleteAgent />} />
                <Route path="agents" element={<AgentsComponent />} />
                <Route path="agents/edit/:agentId" element={<AgentEdit />} />
                <Route path="voice" element={<Voice />} />
                <Route path="voice/voiceQueues" element={<VoiceQueues />} />
                <Route path="voice/contexts" element={<Contexts />} />
                <Route path="voice/inboundRoutes" element={<InboundRoute />} />
                <Route
                  path="voice/inboundRoutes/:inboundRouteId"
                  element={<InboundRouteEdit />}
                />
                <Route
                  path="voice/outboundRoutes"
                  element={<OutboundRoute />}
                />
                <Route
                  path="voice/outboundRoutes/:outboundRouteId/edit"
                  element={<OutboundRouteEdit />}
                />
                <Route path="voice/recordings" element={<Recordings />} />
                <Route
                  path="voice/voiceQueues/:queueId"
                  element={<QueueEdit />}
                />
                <Route path="analytics" element={<Analytics />} />
                <Route
                  path="analytics/reports"
                  element={<ReportsAdminView />}
                />
                <Route path="tools" element={<Tools />} />
                <Route path="tools/trunks" element={<Trunks />} />
                <Route path="tools/trunks/:trunkId" element={<TrunkEdit />} />
                <Route path="tools/audio" element={<AudioManager />} />
                <Route
                  path="tools/intervals"
                  element={<IntervalsComponent />}
                />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/networks" element={<Networks />} />
                <Route
                  path="settings/license"
                  element={<LicenseManagement />}
                />
                <Route path="integrations/sms" element={<SmsConfig />} />
                <Route path="integrations" element={<Integrations />} />
                <Route
                  path="integrations/salesforceAccount"
                  element={
                    <LicensedRoute feature="salesforce">
                      <SalesforceIntegration />
                    </LicensedRoute>
                  }
                />
                <Route
                  path="integrations/zoho"
                  element={
                    <LicensedRoute feature="zoho">
                      <ZohoIntegration />
                    </LicensedRoute>
                  }
                />
                <Route path="profile" element={<Profile />} />
                <Route path="emails" element={<EmailManagement />} />
                <Route path="support/about" element={<About />} />
                <Route path="ivr/projects" element={<IVRProjects />} />
                <Route path="ivr/projects/:id" element={<IVRBuilder />} />
                <Route path="ivr/odbc" element={<Odbc />} />
                <Route
                  path="whatsapp"
                  element={
                    <LicensedRoute feature="whatsapp">
                      <WhatsappWebConfig />
                    </LicensedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </UserProvider>
      </Router>
    </Provider>
  );
};

export default App;
