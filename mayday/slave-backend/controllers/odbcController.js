import OdbcConnection from "../models/odbcModel.js";
import odbcService from "../services/odbcService.js";

// Get all ODBC connections
export const getOdbcConnections = async (req, res) => {
  try {
    const connections = await OdbcConnection.findAll();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new ODBC connection
export const createOdbcConnection = async (req, res) => {
  try {
    const { name, dsn, description } = req.body;

    // Test the connection before saving
    await odbcService.testConnection(dsn);

    // Save to database
    const connection = await OdbcConnection.create({
      name,
      dsn,
      description,
    });

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update ODBC connection
export const updateOdbcConnection = async (req, res) => {
  try {
    const { name, dsn, description, enabled } = req.body;
    const connection = await OdbcConnection.findByPk(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    // Test new DSN if it changed
    if (dsn !== connection.dsn) {
      await odbcService.testConnection(dsn);
    }

    // Update connection
    await connection.update({
      name,
      dsn,
      description,
      enabled,
    });

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete ODBC connection
export const deleteOdbcConnection = async (req, res) => {
  try {
    const connection = await OdbcConnection.findByPk(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await connection.destroy();

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.json({ message: "Connection deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
