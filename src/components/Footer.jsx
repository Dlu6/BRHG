import React from "react";
import "./Footer.css"; // We'll create this CSS file next

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section about">
          <h4>Mayday CRM</h4>
          <p
            style={{
              fontSize: "0.85rem",
            }}
          >
            Your go-to solution for seamless customer relationship management.
            Integrate your system with a call center centric management system
            and leverage a wide range of Mayday's APIs to streamline
            communication and enhance your workforce productivity 🚀.
          </p>
        </div>
        <div className="footer-section links">
          <h4>Quick Links</h4>
          <ul
            style={{
              fontSize: "0.85rem",
            }}
          >
            <li>
              <a href="/features">Features</a>
            </li>
            <li>
              <a href="/solutions">Solutions</a>
            </li>
            <li>
              <a href="/pricing">Pricing</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
            <li>
              <a href="/privacy-policy">Privacy Policy</a>
            </li>
            <li>
              <a href="https://maydaycrm.com/wiki">Documentation</a>
            </li>
          </ul>
        </div>
        <div className="footer-section contact-info">
          <h4>Contact Us</h4>
          <p>Email: support@maydaycrm.com</p>
          <p>Phone: 0323 300 500</p>
          <p>WhatsApp: +256 700 771 301</p>
          {/* Add social media icons here if desired */}
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          &copy; {new Date().getFullYear()} A product of MM-iCT. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
