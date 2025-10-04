import {
  getAsteriskCdrForExtension,
  formatAsteriskCdrRecord,
} from "./services/asteriskCdrService.js";

async function testCdrIntegration() {
  try {
    console.log("Testing CDR integration for extension 1005...");

    // Test getting CDR records for extension 1005
    const records = await getAsteriskCdrForExtension("1005", {
      limit: 5,
      startDate: new Date("2025-09-08"),
      endDate: new Date("2025-09-10"),
    });

    console.log(`Found ${records.length} records for extension 1005:`);

    records.forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      console.log(`Raw CDR Data:`);
      console.log(`  Source: ${record.src}`);
      console.log(`  Destination: ${record.dst}`);
      console.log(`  Start: ${record.start}`);
      console.log(`  Answer: ${record.answer}`);
      console.log(`  End: ${record.end}`);
      console.log(`  Duration: ${record.duration} seconds (total time)`);
      console.log(`  Billsec: ${record.billsec} seconds (conversation time)`);
      console.log(`  Disposition: ${record.disposition}`);
      console.log(`  Channel: ${record.channel}`);
      console.log(`  Unique ID: ${record.uniqueid}`);

      // Test formatting
      const formatted = formatAsteriskCdrRecord(record, "1005");
      console.log(`\nFormatted for Dashboard:`);
      console.log(`  Phone Number: ${formatted.phoneNumber}`);
      console.log(`  Type: ${formatted.type}`);
      console.log(`  Status: ${formatted.status}`);
      console.log(`  Duration: ${formatted.duration}`);
      console.log(`  Timestamp: ${formatted.timestamp}`);
    });
  } catch (error) {
    console.error("Error testing CDR integration:", error);
  }
}

testCdrIntegration();
