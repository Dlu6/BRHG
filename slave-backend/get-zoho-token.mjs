import integrationService from "./services/integrationService.js";
import { default as sequelize } from "./config/sequelize.js";

async function run() {
  try {
    const integrations = await integrationService.getAllIntegrations();
    if (!integrations.success || !integrations.data) {
      console.error("Could not fetch integrations from the database.");
      return;
    }
    const zohoIntegration = integrations.data.find((i) => i.type === "zoho");
    if (!zohoIntegration) {
      console.error("Zoho integration not found in the database.");
      return;
    }
    const config = integrationService.normalizeConfig(zohoIntegration.config);
    const accessToken = config.accessToken;

    if (!accessToken) {
      console.error(
        "Access Token not found in the Zoho integration configuration."
      );
      return;
    }

    // Output the token between markers so it's easy to parse
    console.log("---ZOHO-ACCESS-TOKEN---");
    console.log(accessToken);
    console.log("---END-ZOHO-ACCESS-TOKEN---");
  } catch (error) {
    console.error(
      "An error occurred while retrieving the token:",
      error.message
    );
  } finally {
    await sequelize.close();
  }
}

run();
