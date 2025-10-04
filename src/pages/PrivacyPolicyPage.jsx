import React from "react";
import "./PrivacyPolicyPage.css";

const PrivacyPolicyPage = () => {
  return (
    <div className="privacy-policy-page">
      <div className="privacy-policy-container">
        <h1>Privacy Policy</h1>
        <p>Last updated: [12/06/2025]</p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to Mayday. We respect your privacy and are committed to
          protecting your personal data. This privacy policy will inform you as
          to how we look after your personal data when you visit our website
          (regardless of where you visit it from) and tell you about your
          privacy rights and how the law protects you.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We may collect, use, store and transfer different kinds of personal
          data about you which we have grouped together as follows:
        </p>
        <ul>
          <li>
            <strong>Identity Data</strong> includes first name, last name,
            username or similar identifier.
          </li>
          <li>
            <strong>Contact Data</strong> includes billing address, delivery
            address, email address and telephone numbers.
          </li>
          <li>
            <strong>Technical Data</strong> includes internet protocol (IP)
            address, your login data, browser type and version, time zone
            setting and location, browser plug-in types and versions, operating
            system and platform, and other technology on the devices you use to
            access this website.
          </li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>
          We will only use your personal data when the law allows us to. Most
          commonly, we will use your personal data in the following
          circumstances:
        </p>
        <ul>
          <li>
            Where we need to perform the contract we are about to enter into or
            have entered into with you.
          </li>
          <li>
            Where it is necessary for our legitimate interests (or those of a
            third party) and your interests and fundamental rights do not
            override those interests.
          </li>
          <li>Where we need to comply with a legal obligation.</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We have put in place appropriate security measures to prevent your
          personal data from being accidentally lost, used or accessed in an
          unauthorized way, altered or disclosed.
        </p>

        <h2>5. Your Legal Rights</h2>
        <p>
          Under certain circumstances, you have rights under data protection
          laws in relation to your personal data. These include the right to
          request access, correction, erasure, or transfer of your personal
          data.
        </p>

        <h2>6. Contact Us</h2>
        <p>
          If you have any questions about this privacy policy, please contact us
          at <a href="mailto:support@maydaycrm.com">support@maydaycrm.com</a>.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
