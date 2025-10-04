export const setupPJSIPAssociations = (
  UserModel,
  { PJSIPEndpoint, PJSIPAuth, PJSIPAor },
  QueueMember,
  VoiceQueue
) => {
  UserModel.hasOne(PJSIPEndpoint, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
  });

  UserModel.hasOne(PJSIPAuth, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
  });

  UserModel.hasOne(PJSIPAor, {
    foreignKey: "id",
    onDelete: "CASCADE",
  });

  // Associate PJSIP Endpoint with User model
  PJSIPEndpoint.belongsTo(UserModel, {
    foreignKey: "id",
    onDelete: "CASCADE",
    targetKey: "extension",
    as: "user",
  });

  PJSIPAuth.belongsTo(UserModel, { foreignKey: "user_id" });
  PJSIPAor.belongsTo(UserModel, { foreignKey: "id" });

  // Update QueueMember associations with more specific aliases
  QueueMember.belongsTo(PJSIPEndpoint, {
    foreignKey: "endpoint_id",
    targetKey: "id",
    as: "pjsip_endpoint",
  });

  PJSIPEndpoint.hasMany(QueueMember, {
    foreignKey: "endpoint_id",
    sourceKey: "id",
    as: "queue_members",
  });

  // Add VoiceQueue and QueueMember associations
  VoiceQueue.hasMany(QueueMember, {
    foreignKey: "queue_id",
    as: "queue_members",
  });

  QueueMember.belongsTo(VoiceQueue, {
    foreignKey: "queue_id",
    as: "queue",
  });
};

export const setupIntegrationAssociations = (
  IntegrationModel,
  IntegrationDataModel
) => {
  // Integration has many IntegrationData records
  IntegrationModel.hasMany(IntegrationDataModel, {
    foreignKey: "integrationId",
    as: "data",
    onDelete: "CASCADE",
  });

  // IntegrationData belongs to Integration
  IntegrationDataModel.belongsTo(IntegrationModel, {
    foreignKey: "integrationId",
    as: "integration",
  });
};
