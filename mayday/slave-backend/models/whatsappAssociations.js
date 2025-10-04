export const setupWhatsAppAssociations = (
  UserModel,
  { Contact, WhatsAppMessage }
) => {
  // Associate Contact with User (Agent)
  Contact.belongsTo(UserModel, {
    foreignKey: "assignedAgentId",
    as: "assignedAgent",
  });

  UserModel.hasMany(Contact, {
    foreignKey: "assignedAgentId",
    as: "assignedContacts",
  });

  // Message associations
  Contact.hasMany(WhatsAppMessage, {
    foreignKey: "contactId",
    as: "messages",
  });

  WhatsAppMessage.belongsTo(Contact, {
    foreignKey: "contactId",
  });
};
