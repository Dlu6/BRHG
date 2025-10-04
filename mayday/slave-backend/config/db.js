// import { Sequelize } from "sequelize";
// import path from "path";
// import { fileURLToPath } from "url";
// import chalk from "chalk";

// // Load .env from the backend directory
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const requiredEnvVars = [
//   "DB_CONNECTION_STRING", // Example using a connection string for ODBC
// ];
// const missingEnvVars = requiredEnvVars.filter(
//   (varName) => !process.env[varName]
// );

// if (missingEnvVars.length > 0) {
//   console.warn(
//     chalk.yellow(
//       `[DB] Missing environment variables, database connection might fail: ${missingEnvVars.join(
//         ", "
//       )}`
//     )
//   );
//   // Decide if this should be fatal or just a warning
//   // throw new Error(`Missing required DB environment variables: ${missingEnvVars.join(', ')}`);
// }

// let sequelize = null; // Initialize sequelize to null

// // Export Op separately if needed (though models usually handle this)
// // export const { Op } = Sequelize;

// export const connectDatabase = async () => {
//   // Check if already connected
//   if (sequelize) {
//     try {
//       // Quick connection test
//       await sequelize.authenticate();
//       // console.log(chalk.blue('[DB] Already connected.'));
//       return true;
//     } catch (error) {
//       console.warn(
//         chalk.yellow(
//           "[DB] Existing connection seems stale, attempting reconnect..."
//         ),
//         error.message
//       );
//       // Proceed to reconnect if authentication fails
//       sequelize = null; // Reset instance to force re-creation
//     }
//   }

//   // Check for environment variable *after* server.js has loaded it
//   const connectionString = process.env.DB_CONNECTION_STRING;
//   if (!connectionString) {
//     console.warn(
//       chalk.yellow(
//         `[DB] DB_CONNECTION_STRING environment variable is not set. Database connection skipped.`
//       )
//     );
//     return false; // Cannot connect without connection string
//   }

//   console.log(chalk.blue("[DB] Creating new Sequelize instance..."));
//   try {
//     // Create the Sequelize instance *inside* the connect function
//     sequelize = new Sequelize(connectionString, {
//       dialect: "odbc", // Keep ODBC for now, but consider 'mysql'
//       logging: process.env.NODE_ENV === "development" ? console.log : false,
//       dialectOptions: {
//         // Specify ODBC options if needed
//         // connectTimeout: 60000,
//       },
//       pool: {
//         max: 5,
//         min: 0,
//         acquire: 30000,
//         idle: 10000,
//       },
//     });

//     await sequelize.authenticate();
//     console.log(
//       chalk.green("[DB] Connection has been established successfully.")
//     );
//     // Optional: Sync models if needed
//     // await sequelize.sync();
//     // console.log(chalk.green('[DB] Models synchronized.'));
//     return true;
//   } catch (error) {
//     console.error(
//       chalk.red("[DB] Unable to connect to the database:"),
//       error.message // Log the specific connection error
//     );
//     sequelize = null; // Ensure sequelize is null on connection failure
//     return false;
//   }
// };

// // Export a function to get the sequelize instance for models
// // Models should call this *after* connectDatabase has succeeded
// export const getSequelizeInstance = () => {
//   if (!sequelize) {
//     // This condition should ideally not be hit if connectDatabase was called first
//     console.error(
//       chalk.red(
//         "[DB] Sequelize instance requested before connection was established."
//       )
//     );
//     return null;
//   }
//   return sequelize;
// };

// // Note: Removed the direct default export of sequelize
