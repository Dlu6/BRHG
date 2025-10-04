import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

class SmsMessage extends Model {}

SmsMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    providerMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: "Message ID from the SMS provider",
    },
    fromNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Sender's phone number",
    },
    toNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Recipient's phone number",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "The text content of the SMS",
    },
    direction: {
      type: DataTypes.ENUM("inbound", "outbound"),
      allowNull: false,
      comment: "Direction of the message relative to the system",
    },
    status: {
      type: DataTypes.ENUM(
        "queued",
        "sent",
        "delivered",
        "failed",
        "received",
        "undelivered"
      ),
      defaultValue: "queued",
      allowNull: false,
      comment: "Delivery status of the message",
    },
  },
  {
    sequelize,
    modelName: "SmsMessage",
    tableName: "SmsMessages",
    timestamps: true,
    indexes: [
      {
        fields: ["fromNumber"],
      },
      {
        fields: ["toNumber"],
      },
      {
        fields: ["createdAt"],
      },
    ],
  }
);

export default SmsMessage;
