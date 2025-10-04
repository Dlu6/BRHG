import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css"; // Styles will be completely revamped

// An icon component that can be styled to look like a retro console light/indicator
const StatusIndicator = ({ active }) => (
  <div className={`status-indicator ${active ? "active" : ""}`}></div>
);

const HomePage = () => {
  const navigate = useNavigate();

  const handleRequestDemo = () => {
    navigate("/contact", { state: { subject: "Demo Request" } });
  };
  const navigateToWiki = () => {
    if (process.env.NODE_ENV === "development") {
      // In development, the Docusaurus server runs on a different port.
      window.open("http://localhost:3002/wiki/", "_blank");
    } else {
      // In production, open the /wiki path in a new tab.
      window.open("/wiki", "_blank");
    }
  };

  const features = [
    {
      icon: "🔊",
      title: "Built on Battle-Tested Telephony",
      description:
        "Powered by Asterisk 20.11.0, the world's most reliable open-source telephony engine, delivering a fully integrated softphone for crystal-clear communication.",
    },

    {
      icon: "🛠️",
      title: "Designed for Call Centers, Ready for Any Team",
      description:
        "Intelligent routing, live monitoring, queue analytics, and agent dashboards out of the box — flexible enough for any team that needs to move fast.",
    },
    {
      icon: "🕹️",
      title: "Vintage Feel, Modern Control",
      description:
        "An interface that feels sharp, reliable, and timeless — like an old-school mission control room reimagined for today's challenges.",
    },
    {
      icon: "🍳",
      title: "Simple to use, but powerful",
      description:
        "Our platform is designed to be intuitive & easy to use, but powerful enough to handle any call center needs. We've built in features that are designed to help you get the most out of your telephony system.",
    },
    {
      icon: "🔗",
      title: "Compatible with any CRM",
      description:
        "Our platform is designed to be compatible with any CRM system. We've built in features that are designed to help you get the most out of your in-house systems.",
    },
    {
      icon: "♻️",
      title: "True 360° CRM",
      description:
        "Connect seamlessly with Salesforce, Zoho, Freshdesk, and more. View every customer's journey in one place and act fast with full context.",
    },
  ];

  const benefits = [
    "Never miss a critical signal — every interaction is logged, tracked, and visible in real time.",
    "Empower your agents with the tools to respond, resolve, and retain faster.",
    "Built for scale — deploy Mayday on-premise or in the cloud with full control.",
  ];

  return (
    <>
      <div className="home-page">
        <div className="background-effects">
          <div className="scanline"></div>
          <div className="grid"></div>
          <div className="glowing-orb"></div>
          <div className="data-arc data-arc-1"></div>
          <div className="data-arc data-arc-2"></div>
          <div className="data-arc data-arc-3"></div>
        </div>
        <div className="scroll-container">
          <header className="hero-section">
            <h1 className="hero-title">
              <span>MAYDAY CRM</span>
              <span className="hero-subtitle">BUILT FOR URGENCY! ☎️ </span>
            </h1>
            <p className="hero-intro">
              In customer support, every interaction could be the moment that
              defines your brand. We built Mayday CRM — a mission-critical, 360°
              communication hub that ensures no signal is missed, and no
              customer is left unheard.
            </p>
            <button className="cta-button" onClick={handleRequestDemo}>
              Request a Demo
            </button>
          </header>

          <main>
            <section className="philosophy-section">
              <h2>
                Mayday isn't just a name — <br />
                it's a philosophy 🫧
              </h2>
              <p>
                Inspired by the universal distress call, Mayday CRM treats every
                customer interaction with the urgency and clarity it deserves.
                Our platform unifies calls, tickets, chats, and emails into one
                command center built for action, insight, and resolution.
              </p>
            </section>

            <section className="features-section" id="features">
              <h2 className="section-title">What Sets Mayday Apart 🍭</h2>
              <div className="features-grid">
                {features.map((feature, index) => (
                  <div className="feature-card" key={index}>
                    <div className="feature-card-header">
                      <h3>{feature.title}</h3>
                      <div className="feature-icon">{feature.icon}</div>
                    </div>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="benefits-section">
              <h2 className="section-title">
                Mission-Grade Tools for Your Frontline
              </h2>
              <ul className="benefits-list">
                {benefits.map((benefit, index) => (
                  <li key={index}>
                    <StatusIndicator active />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="cta-section">
              <h2>🛑 Because Every Interaction is a Mayday 🚨</h2>
              <p>
                Your customers deserve more than a ticket number. They deserve
                to be heard — loud and clear. With Mayday CRM, you're not just
                managing communications. You're commanding them.
              </p>
              <button className="cta-button-secondary" onClick={navigateToWiki}>
                View Documentation
              </button>
            </section>
          </main>
        </div>
      </div>
    </>
  );
};

export default HomePage;
