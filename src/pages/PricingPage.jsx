import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";
import ReCAPTCHA from "react-google-recaptcha";
// Removed antd dependency to avoid React 19 compatibility issues
import "./PricingPage.css";
const countryCodes = require("country-codes-list");

const PricingPage = () => {
  const plans = [
    {
      name: "Basic",
      price: "$9",
      period: "/month/user",
      features: [
        "Core CRM Features",
        "Agent Softphone",
        "Visual IVR System",
        "Call Recording",
        "Up to 12 Channels",
        "Analytics & Reporting",
        "Whatsapp Integration",
      ],
      buttonText: "Choose Basic",
      popular: false,
    },
    {
      name: "Pro",
      price: "$19",
      period: "/month/user",
      features: [
        "All Basic Features",
        "Up to 32 Channels",
        "Agent Softphone",
        "Visual IVR System",
        "Advanced Reporting & Analytics",
        "Automation Workflows",
        "Ai Chatbot",
        "Whatsapp & SMS Support",
        "Priority Email & Chat Support",
      ],
      buttonText: "Choose Pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "Contact Us",
      features: [
        "All Pro Features & Ai",
        "62+ Channels",
        "Video Call Support",
        "Dedicated Account Manager",
        "Custom API Integrations",
        "24/7 Premium Support",
      ],
      buttonText: "Contact Sales",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "Can I change my plan later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "We offer a 14-day free trial for our Pro plan. No credit card required.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards and bank transfers.",
    },
  ];

  const contactFormSectionRef = useRef(null);
  const recaptchaRef = useRef();

  // State management for the form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    country: "",
    phone: "",
    plan: "",
    message: "",
  });
  const [countries, setCountries] = useState([]);
  const [consent, setConsent] = useState({
    consent1: false,
    consent2: false,
    consent3: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [notification, setNotification] = useState(null);

  // Custom notification system to replace antd
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto hide after 5 seconds
  };

  // Environment variables for EmailJS and ReCAPTCHA
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_PRICING;
  const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

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

    // Validate plan
    if (!formData.plan) {
      newErrors.plan = "Please select a plan";
    }

    // Validate message
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    // Validate consent1 (required)
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (value.trim() && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
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

  const handleChoosePlanClick = (planName) => {
    setFormData((prev) => ({ ...prev, plan: planName.toLowerCase() }));
    contactFormSectionRef.current?.scrollIntoView({ behavior: "smooth" });
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
      submission_timestamp: new Date().toLocaleString(),
      consent1: consent.consent1 ? "Yes" : "No",
      consent2: consent.consent2 ? "Yes" : "No",
      consent3: consent.consent3 ? "Yes" : "No",
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
        "Thank you for your inquiry! We'll be in touch soon.",
        "success"
      );
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        company: "",
        country: "",
        phone: "",
        plan: "",
        message: "",
      });
      setConsent({ consent1: false, consent2: false, consent3: false });
      setErrors({});
      setRecaptchaToken(null);
      recaptchaRef.current.reset();
    } catch (error) {
      console.error("Submission error:", error);
      showNotification("An error occurred. Please try again later.", "error");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="pricing-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Reusing the same background effects for consistency */}
      <div className="background-effects">
        <div className="scanline"></div>
        <div className="grid"></div>
        <div className="glowing-orb"></div>
        <div className="data-arc data-arc-1"></div>
        <div className="data-arc data-arc-2"></div>
        <div className="data-arc data-arc-3"></div>
      </div>

      <div className="scroll-container">
        <section className="page-header">
          <h1 className="page-title">Mission-Ready Pricing</h1>
          <p className="page-subtitle">
            Choose from below the right plan to power your command center. We
            have a 14-day trial that enables you to appreciate from the various
            plans. Whether you're a small SME with 2 agents upto one with 100+
            agents, we have the right plan to meet your scalability needs.
          </p>
        </section>

        <section className="pricing-plans-section">
          <div className="pricing-grid">
            {plans.map((plan, index) => (
              <div
                className={`plan-card ${plan.popular ? "popular" : ""}`}
                key={index}
              >
                {plan.popular && (
                  <div className="popular-badge">Most Popular</div>
                )}
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <div className="price">
                    {plan.price}
                    <span>{plan.period}</span>
                  </div>
                </div>
                <ul className="features-list">
                  {plan.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
                <button
                  className="choose-plan-button"
                  onClick={() => handleChoosePlanClick(plan.name)}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-form-section" ref={contactFormSectionRef}>
          <h2 className="section-title" style={{ marginBottom: "-3rem" }}>
            Get in Touch
          </h2>
          <p
            className="contact-form-subtitle"
            style={{ marginBottom: "-1rem" }}
          >
            Have a question or need a custom quote? Fill out the form below and
            we'll get back to you!
          </p>
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-field">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name*"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
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
                  value={formData.lastName}
                  onChange={handleChange}
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
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={errors.email ? "error" : ""}
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>
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
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <span className="error-message">{errors.country}</span>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <input
                  type="text"
                  name="company"
                  placeholder="Company*"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={errors.company ? "error" : ""}
                />
                {errors.company && (
                  <span className="error-message">{errors.company}</span>
                )}
              </div>
              <div className="form-field">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {/* Plan Selection */}
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
            {/* Text area for message */}
            <div className="form-field">
              <textarea
                name="message"
                placeholder="Your Message*"
                required
                value={formData.message}
                onChange={handleChange}
                style={{ marginBottom: "1rem" }}
                rows={6}
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
                <a href="/privacy-policy">privacy policy</a> in accordance with
                Regulation 2016/679 and authorize the processing of the personal
                data provided.*
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
                I consent to the sharing of my personal data with other
                companies and partners for MM-iCT to be processed for
                promotional, commercial and marketing purposes according to the
                terms and conditions indicated in the{" "}
                <a href="/privacy-policy">privacy policy</a>.
              </label>
            </div>

            <div className="consent-group">
              <input
                type="checkbox"
                id="consent3"
                name="consent3"
                checked={consent.consent3}
                onChange={handleConsentChange}
                disabled={isSubmitting}
              />
              <label htmlFor="consent3">
                I consent to the sharing of my provided data with Business
                Partners to be processed for promotional or other commercial
                purposes according to the terms and conditions indicated in the{" "}
                <a href="/privacy-policy">privacy policy</a>.
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
              className="choose-plan-button"
              style={{ width: "100%", marginTop: "1rem" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </form>
        </section>

        <section className="faq-section">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div className="faq-item" key={index}>
                <h4>{faq.question}</h4>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PricingPage;
