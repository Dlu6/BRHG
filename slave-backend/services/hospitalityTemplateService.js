// Hospitality-specific WhatsApp message templates
// These templates are designed for hotel and hospitality businesses

export const HOSPITALITY_TEMPLATES = {
  // Booking Templates
  BOOKING_CONFIRMATION: {
    name: "booking_confirmation",
    category: "BOOKING",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🏨 Booking Confirmation - {{hotel_name}}",
      },
      {
        type: "BODY",
        text: "Dear {{guest_name}},\n\nYour booking has been confirmed!\n\n📅 Check-in: {{checkin_date}}\n📅 Check-out: {{checkout_date}}\n🏨 Room: {{room_type}}\n👥 Guests: {{guest_count}}\n\nConfirmation #: {{booking_reference}}\n\nWe look forward to welcoming you!\n\nBest regards,\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "For any questions, reply to this message or call {{hotel_phone}}",
      },
    ],
  },

  BOOKING_REMINDER: {
    name: "booking_reminder",
    category: "BOOKING",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🔔 Check-in Reminder - {{hotel_name}}",
      },
      {
        type: "BODY",
        text: "Hello {{guest_name}},\n\nJust a friendly reminder that your check-in is tomorrow!\n\n📅 Check-in: {{checkin_date}}\n🏨 Room: {{room_type}}\n\nWe're excited to have you stay with us. If you have any special requests, please let us know.\n\nSafe travels!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Need assistance? Reply to this message",
      },
    ],
  },

  BOOKING_CANCELLATION: {
    name: "booking_cancellation",
    category: "BOOKING",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "❌ Booking Cancelled - {{hotel_name}}",
      },
      {
        type: "BODY",
        text: "Dear {{guest_name}},\n\nYour booking has been cancelled as requested.\n\n📅 Original Check-in: {{checkin_date}}\n📅 Original Check-out: {{checkout_date}}\n\nRefund details will be processed within 5-7 business days.\n\nWe hope to welcome you back soon!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Questions? Contact us at {{hotel_phone}}",
      },
    ],
  },

  // Service Templates
  ROOM_SERVICE_ORDER: {
    name: "room_service_order",
    category: "SERVICE",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🍽️ Room Service Order Confirmation",
      },
      {
        type: "BODY",
        text: "Hello {{guest_name}},\n\nYour room service order has been received!\n\n📋 Order: {{order_items}}\n💰 Total: {{order_total}}\n⏰ Estimated delivery: {{delivery_time}}\n\nRoom: {{room_number}}\n\nThank you for choosing our room service!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Need to modify your order? Reply to this message",
      },
    ],
  },

  MAINTENANCE_REQUEST: {
    name: "maintenance_request",
    category: "SERVICE",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🔧 Maintenance Request Received",
      },
      {
        type: "BODY",
        text: "Hello {{guest_name}},\n\nWe've received your maintenance request for room {{room_number}}.\n\nIssue: {{issue_description}}\nPriority: {{priority_level}}\n\nOur maintenance team will address this within {{estimated_time}}.\n\nThank you for your patience!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Urgent issues? Call {{hotel_phone}}",
      },
    ],
  },

  // Feedback Templates
  FEEDBACK_REQUEST: {
    name: "feedback_request",
    category: "FEEDBACK",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "⭐ How was your stay?",
      },
      {
        type: "BODY",
        text: "Dear {{guest_name}},\n\nThank you for staying with us at {{hotel_name}}!\n\nWe hope you had a wonderful experience. Your feedback is important to us and helps us improve our services.\n\nPlease take a moment to rate your stay:\n\n⭐ Service Quality\n⭐ Room Comfort\n⭐ Overall Experience\n\nReply with your rating (1-5 stars) and any comments.\n\nThank you!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Your feedback helps us improve!",
      },
    ],
  },

  // Complaint Templates
  COMPLAINT_ACKNOWLEDGMENT: {
    name: "complaint_acknowledgment",
    category: "COMPLAINT",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "📝 Complaint Received - {{hotel_name}}",
      },
      {
        type: "BODY",
        text: "Dear {{guest_name}},\n\nWe sincerely apologize for the inconvenience you experienced during your stay.\n\nIssue: {{complaint_description}}\nReference #: {{complaint_reference}}\n\nOur management team is reviewing your complaint and will respond within 24 hours.\n\nWe value your feedback and are committed to resolving this matter.\n\n{{hotel_name}} Management",
      },
      {
        type: "FOOTER",
        text: "Need immediate assistance? Call {{hotel_phone}}",
      },
    ],
  },

  // General Templates
  WELCOME_MESSAGE: {
    name: "welcome_message",
    category: "GENERAL",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🎉 Welcome to {{hotel_name}}!",
      },
      {
        type: "BODY",
        text: "Hello {{guest_name}},\n\nWelcome to {{hotel_name}}! We're delighted to have you as our guest.\n\n🏨 Check-in: {{checkin_date}}\n🏨 Check-out: {{checkout_date}}\n🏨 Room: {{room_number}}\n\nOur team is here to make your stay exceptional. If you need anything, just reply to this message!\n\nEnjoy your stay!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Need assistance? Reply anytime!",
      },
    ],
  },

  CHECKOUT_REMINDER: {
    name: "checkout_reminder",
    category: "GENERAL",
    language: "en",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🕐 Check-out Reminder - {{hotel_name}}",
      },
      {
        type: "BODY",
        text: "Hello {{guest_name}},\n\nJust a friendly reminder that check-out is at {{checkout_time}}.\n\n📅 Check-out: {{checkout_date}}\n🏨 Room: {{room_number}}\n\nIf you need a late check-out, please let us know as soon as possible.\n\nThank you for staying with us!\n\n{{hotel_name}} Team",
      },
      {
        type: "FOOTER",
        text: "Need assistance? Reply to this message",
      },
    ],
  },
};

// Template variable replacement function
export const replaceTemplateVariables = (template, variables) => {
  let text = template;

  Object.keys(variables).forEach((key) => {
    const placeholder = `{{${key}}}`;
    const value = variables[key] || "";
    text = text.replace(new RegExp(placeholder, "g"), value);
  });

  return text;
};

// Get template by name
export const getTemplate = (templateName) => {
  return HOSPITALITY_TEMPLATES[templateName.toUpperCase()];
};

// Get templates by category
export const getTemplatesByCategory = (category) => {
  return Object.values(HOSPITALITY_TEMPLATES).filter(
    (template) => template.category === category.toUpperCase()
  );
};

// Get all templates
export const getAllTemplates = () => {
  return Object.values(HOSPITALITY_TEMPLATES);
};

// Validate template variables
export const validateTemplateVariables = (template, variables) => {
  const requiredVariables = [];
  const templateText = JSON.stringify(template);

  // Extract all {{variable}} placeholders
  const matches = templateText.match(/\{\{([^}]+)\}\}/g);
  if (matches) {
    matches.forEach((match) => {
      const variable = match.replace(/\{\{|\}\}/g, "");
      if (!requiredVariables.includes(variable)) {
        requiredVariables.push(variable);
      }
    });
  }

  // Check if all required variables are provided
  const missingVariables = requiredVariables.filter(
    (variable) => !variables.hasOwnProperty(variable)
  );

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    requiredVariables,
  };
};

export default {
  HOSPITALITY_TEMPLATES,
  replaceTemplateVariables,
  getTemplate,
  getTemplatesByCategory,
  getAllTemplates,
  validateTemplateVariables,
};
