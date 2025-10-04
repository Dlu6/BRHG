import React from "react";
import "./FeaturesPage.css";
import softphoneDashboard from "../assets/images/softphone_dashboard.png";
import ivrBuilder from "../assets/images/ivr_builder.png";
import playInboundRecord from "../assets/images/play_inbound_record.png";

// Import integration logos
import zohoLogo from "../assets/images/integrations/zoho.svg";
import zendeskLogo from "../assets/images/integrations/zendesk.svg";
import salesforceLogo from "../assets/images/integrations/salesforce.svg";
import whatsappLogo from "../assets/images/integrations/whatsapp.png";
import generic1Logo from "../assets/images/integrations/generic-1.svg";
import generic2Logo from "../assets/images/integrations/generic-2.svg";
import openaiLogo from "../assets/images/integrations/openai.svg";
import msDynamicsLogo from "../assets/images/integrations/ms-dynamics.svg";

const FeaturesPage = () => {
  const integrations = [
    { src: zohoLogo, alt: "Zoho" },
    { src: zendeskLogo, alt: "Zendesk" },
    { src: salesforceLogo, alt: "Salesforce" },
    { src: whatsappLogo, alt: "WhatsApp Business" },
    { src: generic1Logo, alt: "HubSpot" },
    { src: generic2Logo, alt: "Intercom" },
    { src: openaiLogo, alt: "OpenAI" },
    { src: msDynamicsLogo, alt: "Microsoft Dynamics 365" },
  ];

  return (
    <div className="features-page">
      <div className="features-intro">
        <h1>Powerful Features to Elevate Your Business</h1>
        <p>
          Discover what makes Mayday the ideal CRM solution. We provide the
          tools to enhance communication, automate workflows, and gain valuable
          insights—all in one platform.
        </p>
      </div>

      <section className="features-showcase">
        {/* Feature 1 */}
        <div className="feature-item">
          <div className="feature-content">
            <h2>Omni-Channel Communication</h2>
            <p>
              Connect with your customers seamlessly across various channels
              including voice, email, chat, and social media. Our unified
              dashboard gives you a 360-degree view of every interaction, all
              from one platform.
            </p>
          </div>
          <div className="feature-visual">
            <img src={softphoneDashboard} alt="Mayday Softphone Dashboard" />
          </div>
        </div>

        {/* Feature 2 */}
        <div className="feature-item">
          <div className="feature-content">
            <h2>Intelligent Automation</h2>
            <p>
              Automate routine tasks and streamline workflows with our intuitive
              drag-and-drop IVR builder. Free up your agents to focus on
              high-value interactions by designing complex call flows with ease.
            </p>
          </div>
          <div className="feature-visual">
            <img src={ivrBuilder} alt="Mayday IVR Builder" />
          </div>
        </div>

        {/* Feature 3 */}
        <div className="feature-item">
          <div className="feature-content">
            <h2>In-depth Call Analysis</h2>
            <p>
              Monitor calls, review recordings, and use detailed analytics to
              improve agent performance and ensure quality standards. Access
              transcripts, sentiment analysis, and key metrics for every call.
            </p>
          </div>
          <div className="feature-visual">
            <img src={playInboundRecord} alt="Mayday Call Recording Playback" />
          </div>
        </div>
      </section>

      <section className="integrations-section">
        <div className="integrations-container">
          <div className="integrations-content">
            <span className="integrations-label">INTEGRATIONS</span>
            <h2>Enlarge productivity with more than 10 integrations</h2>
            <a href="/integrations" className="btn btn-primary">
              SEE ALL INTEGRATIONS
            </a>
          </div>
          <div className="integrations-grid">
            {integrations.map((logo, index) => (
              <div className="integration-logo" key={index}>
                <img src={logo.src} alt={logo.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
