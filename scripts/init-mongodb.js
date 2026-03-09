const { DEFAULT_DB_NAME, DEFAULT_URI, closeMongo, ensureCollections, getDb } = require("../src/mongo");
const { ensureDataFile } = require("../src/store");

async function run() {
  await ensureCollections();
  await ensureDataFile();
  const db = await getDb();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();

  console.log(`MongoDB URI: ${DEFAULT_URI}`);
  console.log(`Database: ${DEFAULT_DB_NAME}`);
  console.log("Collections:");
  for (const collection of collections) {
    console.log(`- ${collection.name}`);
  }

  await closeMongo();
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
