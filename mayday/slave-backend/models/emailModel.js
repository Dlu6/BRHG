import { DataTypes } from "sequelize";

export const EmailModel = (sequelize) => {
  const Email = sequelize.define(
    "Email",
    {
      id: {
        // DB uses CHAR(36) UUID; let Sequelize generate UUID v4
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: "Unique message ID for email tracking",
      },
      threadId: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      inReplyTo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      from: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      to: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Comma-separated list of recipients",
      },
      cc: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      bcc: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      htmlBody: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "sent",
          "delivered",
          "failed",
          "bounced",
          "opened",
          "replied"
        ),
        defaultValue: "draft",
        allowNull: false,
      },
      priority: {
        type: DataTypes.ENUM("low", "normal", "high", "urgent"),
        defaultValue: "normal",
        allowNull: false,
      },
      attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      userId: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      agentId: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      customerId: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      ticketId: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      isStarred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "emails",
      timestamps: true,
      paranoid: false, // DB does not have deletedAt
      indexes: [
        { fields: ["messageId"] },
        { fields: ["from"] },
        { fields: ["status"] },
        { fields: ["userId"] },
        { fields: ["agentId"] },
        { fields: ["customerId"] },
        { fields: ["ticketId"] },
        { fields: ["threadId"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return Email;
};

export const setupEmailAssociations = (
  Email,
  { UserModel, CustomerModel = null, TicketModel = null }
) => {
  // Email belongs to User (creator/sender)
  // Using constraints: false because User.id is UUID but Email.userId is STRING(36)
  // This allows the association without creating database-level foreign key constraints
  Email.belongsTo(UserModel, {
    foreignKey: "userId",
    as: "user",
    constraints: false, // Disable FK constraint to prevent sync errors
  });

  // Email belongs to User (assigned agent)
  // Using constraints: false because User.id is UUID but Email.agentId is STRING(36)
  Email.belongsTo(UserModel, {
    foreignKey: "agentId",
    as: "agent",
    constraints: false, // Disable FK constraint to prevent sync errors
  });

  // Email belongs to Customer (if applicable)
  if (CustomerModel) {
    Email.belongsTo(CustomerModel, {
      foreignKey: "customerId",
      as: "customer",
    });
  }

  // Email belongs to Ticket (if applicable)
  if (TicketModel) {
    Email.belongsTo(TicketModel, {
      foreignKey: "ticketId",
      as: "ticket",
    });
  }

  // User has many Emails (as creator)
  UserModel.hasMany(Email, {
    foreignKey: "userId",
    as: "emails",
  });

  // User has many Emails (as assigned agent)
  UserModel.hasMany(Email, {
    foreignKey: "agentId",
    as: "assignedEmails",
  });
};
