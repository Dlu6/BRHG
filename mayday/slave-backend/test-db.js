import sequelize from './config/sequelize.js';

async function testDatabase() {
  try {
    console.log("Testing database connection...");
    await sequelize.authenticate();
    console.log("✓ Database connection successful");
    
    console.log("Testing foreign key disable...");
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log("✓ Foreign key checks disabled");
    
    console.log("Testing foreign key enable...");
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log("✓ Foreign key checks enabled");
    
    console.log("All tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testDatabase();