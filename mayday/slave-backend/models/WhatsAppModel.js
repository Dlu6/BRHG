import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const Contact = sequelize.define(
  "whatsapp_contact",
  {
    // Core contact information
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        // E.164 format validation for WhatsApp
        is: /^\+[1-9]\d{1,14}$/,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    // WhatsApp specific fields
    unreadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastMessage: DataTypes.TEXT,
    lastInteraction: DataTypes.DATE,
    lastMessageSender: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    lastMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    avatar: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: "offline",
    },

    // Customer interaction fields
    customerType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        const rawValue = this.getDataValue("tags");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("tags", JSON.stringify(value || []));
      },
    },
    preferredLanguage: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Contact center specific
    assignedAgentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    lastContactChannel: {
      type: DataTypes.ENUM("whatsapp", "call", "email"),
      allowNull: true,
    },

    // Custom fields
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },

    // Timestamps are handled automatically by sequelize
    isGroup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true, // enables createdAt and updatedAt
    indexes: [
      {
        name: "ux_whatsapp_contact_phone_number",
        unique: true,
        fields: ["phoneNumber"],
      },
    ],
  }
);

const WhatsAppMessage = sequelize.define(
  "whatsapp_messages",
  {
    messageId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    template: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "sent",
    },
    replyTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "whatsapp_messages",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "text",
    },
    errorCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "whatsapp_conversations",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "whatsapp_messages",
    timestamps: true,
    indexes: [
      {
        name: "ux_whatsapp_messages_message_id",
        unique: true,
        fields: ["messageId"],
      },
    ],
  }
);

WhatsAppMessage.belongsTo(WhatsAppMessage, {
  as: "replyMessage",
  foreignKey: "replyTo",
});

const WhatsAppConfig = sequelize.define(
  "whatsapp_config",
  {
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lipaApiKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    templates: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
  },
  {
    tableName: "whatsapp_configs",
  }
);

// Define associations
Contact.hasMany(WhatsAppMessage, {
  foreignKey: "contactId",
  as: "messageHistory",
});

WhatsAppMessage.belongsTo(Contact, {
  foreignKey: "contactId",
});

export { Contact, WhatsAppMessage, WhatsAppConfig };

// New Conversation model to manage multi-agent interactions
const Conversation = sequelize.define(
  "whatsapp_conversations",
  {
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Contact.getTableName(), key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    provider: {
      type: DataTypes.ENUM("lipachat"),
      allowNull: false,
      defaultValue: "lipachat",
    },
    providerConversationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedAgentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    queueId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "open",
        "pending",
        "snoozed",
        "resolved",
        "archived"
      ),
      defaultValue: "open",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "urgent"),
      defaultValue: "normal",
    },
    unreadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    lockOwnerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    lockExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Disposition tracking for hospitality business
    disposition: {
      type: DataTypes.ENUM(
        "resolved",
        "escalated",
        "follow_up_required",
        "booking_confirmed",
        "booking_cancelled",
        "complaint_resolved",
        "complaint_escalated",
        "inquiry_answered",
        "no_response",
        "wrong_number",
        "spam"
      ),
      allowNull: true,
    },
    dispositionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dispositionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Hospitality specific fields
    customerType: {
      type: DataTypes.ENUM("guest", "prospect", "returning", "vip", "group"),
      allowNull: true,
    },
    serviceType: {
      type: DataTypes.ENUM(
        "booking",
        "complaint",
        "inquiry",
        "support",
        "feedback"
      ),
      allowNull: true,
    },
    reservationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Agent performance tracking
    responseTime: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true,
    },
    resolutionTime: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true,
    },
    customerSatisfaction: {
      type: DataTypes.INTEGER, // 1-5 rating
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
  },
  {
    tableName: "whatsapp_conversations",
    timestamps: true,
  }
);

// Associate messages to conversations
WhatsAppMessage.belongsTo(Conversation, { foreignKey: "conversationId" });
Conversation.hasMany(WhatsAppMessage, { foreignKey: "conversationId" });

// Associate conversation to contact
Conversation.belongsTo(Contact, { foreignKey: "contactId" });
Contact.hasMany(Conversation, { foreignKey: "contactId" });

// Extend WhatsAppConfig with provider fields if not present
if (!("provider" in WhatsAppConfig.getAttributes())) {
  WhatsAppConfig.removeAttribute && WhatsAppConfig.removeAttribute("provider");
}

// Note: altering existing table columns is handled by sequelize sync with alter in config
export { Conversation };
