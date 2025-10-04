import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import emailjs from "@emailjs/browser";
// Removed antd dependency to avoid React 19 compatibility issues
import "./ContactPage.css";
const countryCodes = require("country-codes-list");

const ContactPage = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    subject: "",
    plan: "",
    message: "",
    country: "",
    phone: "",
  });

  const [countries, setCountries] = useState([]);
  const [consent, setConsent] = useState({
    consent1: false,
    consent2: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const recaptchaRef = useRef();

  // Custom notification system to replace antd
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto hide after 5 seconds
  };

  // IMPORTANT: Replace with your actual credentials
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_CONTACT;
  const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    if (location.state?.subject) {
      setFormData((prev) => ({ ...prev, subject: location.state.subject }));
    }
  }, [location.state]);

  useEffect(() => {
    const countryData = countryCodes.customList(
      "countryNameEn",
      "{countryCode} +{countryCallingCode}"
    );
    const countryList = Object.entries(countryData).map(([name, code]) => {
      const [countryCode, countryCallingCode] = code.split(" ");
      return {
        label: name,
        value: countryCode,
        dialCode: countryCallingCode,
      };
    });

    // Remove duplicates based on country code
    const uniqueCountries = countryList.filter(
      (country, index, array) =>
        array.findIndex((c) => c.value === country.value) === index
    );

    setCountries(uniqueCountries);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validate firstName
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Validate lastName
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Business email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Validate company
    if (!formData.company.trim()) {
      newErrors.company = "Company name is required";
    }

    // Validate country
    if (!formData.country) {
      newErrors.country = "Please select a country";
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    // Validate subject
    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    // Validate plan
    if (!formData.plan) {
      newErrors.plan = "Please select a plan";
    }

    // Validate message
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    // Validate consent1
    if (!consent.consent1) {
      newErrors.consent1 = "You must agree to the privacy policy to proceed";
    }

    // Validate reCAPTCHA
    if (!recaptchaToken) {
      newErrors.recaptcha = "Please complete the reCAPTCHA verification";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    const country = countries.find((c) => c.value === countryCode);
    setFormData((prev) => ({
      ...prev,
      country: countryCode,
      phone: country ? country.dialCode : "",
    }));

    // Clear country error when user selects a country
    if (countryCode && errors.country) {
      setErrors((prev) => ({ ...prev, country: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (value.trim() && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleConsentChange = (e) => {
    const { name, checked } = e.target;
    setConsent((prev) => ({ ...prev, [name]: checked }));

    // Clear consent error when user checks the required consent
    if (name === "consent1" && checked && errors.consent1) {
      setErrors((prev) => ({ ...prev, consent1: "" }));
    }
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);

    // Clear reCAPTCHA error when user completes it
    if (token && errors.recaptcha) {
      setErrors((prev) => ({ ...prev, recaptcha: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      showNotification(
        "Please fill in all required fields correctly.",
        "error"
      );
      return;
    }

    setIsSubmitting(true);

    const templateParams = {
      ...formData,
      consent1: consent.consent1 ? "Yes" : "No",
      consent2: consent.consent2 ? "Yes" : "No",
      "g-recaptcha-response": recaptchaToken,
    };

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      showNotification(
        "Thank you for your message! We'll be in touch soon.",
        "success"
      );
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        company: "",
        subject: "",
        plan: "",
        message: "",
        country: "",
        phone: "",
      });
      setConsent({ consent1: false, consent2: false });
      setErrors({});
      setRecaptchaToken(null);
      recaptchaRef.current.reset();
    } catch (error) {
      console.error("Submission error:", error);
      showNotification("An error occurred. Please try again.", "error");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="contact-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="background-effects">
        <div className="scanline"></div>
        <div className="grid"></div>
        <div className="glowing-orb"></div>
        <div className="data-arc data-arc-1"></div>
        <div className="data-arc data-arc-2"></div>
        <div className="data-arc data-arc-3"></div>
      </div>

      <h1 className="contact-form-header">Contact Mayday CRM</h1>
      <section className="contact-form-section">
        {/* Form Header */}
        <p>
          We'd love to hear from you! Whether you have a question about
          features, pricing, want a demo or anything else, our team is ready to
          answer all your questions.
        </p>
        <form onSubmit={handleSubmit} className="contact-form" noValidate>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                name="firstName"
                placeholder="First name*"
                required
                onChange={handleChange}
                value={formData.firstName}
                disabled={isSubmitting}
                className={errors.firstName ? "error" : ""}
              />
              {errors.firstName && (
                <span className="error-message">{errors.firstName}</span>
              )}
            </div>
            <div className="form-field">
              <input
                type="text"
                name="lastName"
                placeholder="Last name*"
                required
                onChange={handleChange}
                value={formData.lastName}
                disabled={isSubmitting}
                className={errors.lastName ? "error" : ""}
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName}</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <input
                type="email"
                name="email"
                placeholder="Business e-mail*"
                required
                onChange={handleChange}
                value={formData.email}
                disabled={isSubmitting}
                className={errors.email ? "error" : ""}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>
            <div className="form-field">
              <input
                type="text"
                name="company"
                placeholder="Company*"
                required
                onChange={handleChange}
                value={formData.company}
                disabled={isSubmitting}
                className={errors.company ? "error" : ""}
              />
              {errors.company && (
                <span className="error-message">{errors.company}</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <select
                name="country"
                id="country"
                required
                value={formData.country}
                onChange={handleCountryChange}
                disabled={isSubmitting}
                className={errors.country ? "error" : ""}
              >
                <option value="">Select a country*</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.country && (
                <span className="error-message">{errors.country}</span>
              )}
            </div>
            <div className="form-field">
              <input
                type="tel"
                name="phone"
                placeholder="Phone number*"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                className={errors.phone ? "error" : ""}
              />
              {errors.phone && (
                <span className="error-message">{errors.phone}</span>
              )}
            </div>
          </div>
          <div className="form-field">
            <input
              type="text"
              name="subject"
              placeholder="Subject*"
              required
              onChange={handleChange}
              value={formData.subject}
              disabled={isSubmitting}
              className={errors.subject ? "error" : ""}
            />
            {errors.subject && (
              <span className="error-message">{errors.subject}</span>
            )}
          </div>
          <div className="form-field">
            <select
              name="plan"
              id="plan"
              required
              value={formData.plan}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.plan ? "error" : ""}
            >
              <option value="">Select a plan*</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {errors.plan && (
              <span className="error-message">{errors.plan}</span>
            )}
          </div>
          <div className="form-field">
            <textarea
              name="message"
              placeholder="Your Message*"
              rows={5}
              onChange={handleChange}
              value={formData.message}
              disabled={isSubmitting}
              className={errors.message ? "error" : ""}
            ></textarea>
            {errors.message && (
              <span className="error-message">{errors.message}</span>
            )}
          </div>

          <div className="consent-group">
            <input
              type="checkbox"
              id="consent1"
              name="consent1"
              required
              checked={consent.consent1}
              onChange={handleConsentChange}
              disabled={isSubmitting}
              className={errors.consent1 ? "error" : ""}
            />
            <label htmlFor="consent1">
              I declare that I have read the{" "}
              <a href="/privacy-policy">privacy policy</a> and authorize the
              processing of personal data.*
            </label>
            {errors.consent1 && (
              <span className="error-message consent-error">
                {errors.consent1}
              </span>
            )}
          </div>
          <div className="consent-group">
            <input
              type="checkbox"
              id="consent2"
              name="consent2"
              checked={consent.consent2}
              onChange={handleConsentChange}
              disabled={isSubmitting}
            />
            <label htmlFor="consent2">
              I consent to the sharing of my data for marketing purposes as
              indicated in the <a href="/privacy-policy">privacy policy</a>.
            </label>
          </div>

          <div className="recaptcha-container">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              theme="dark"
              onChange={handleRecaptchaChange}
            />
            {errors.recaptcha && (
              <span className="error-message recaptcha-error">
                {errors.recaptcha}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ContactPage;
