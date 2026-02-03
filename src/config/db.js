import "dotenv/config";
import oracledb from "oracledb";

// Initialize Oracle Instant Client
// Update the path based on where you installed Instant Client
try {
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_INSTANT_CLIENT_PATH,
  });
  console.log("✅ Oracle Client initialized");
} catch (err) {
  console.error("❌ Oracle Client initialization failed:", err.message);
  console.error("Check ORACLE_INSTANT_CLIENT_PATH in your .env file");
  process.exit(1);
}

// Connection pool
let pool;

const connectDB = async () => {
  try {
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 2,
      poolTimeout: 60,
    });

    console.log("✅ DB Connected via Oracle");
    
    // Optional: Test connection with a simple query
    const connection = await pool.getConnection();
    const result = await connection.execute(`SELECT 'Connected!' FROM DUAL`);
    console.log("   Test query successful:", result.rows[0][0]);
    await connection.close();
    
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    if (pool) {
      await pool.close(10);
      console.log("🔌 DB Disconnected");
    }
  } catch (error) {
    console.error(`❌ Disconnect error: ${error.message}`);
  }
};

// Helper function to get a connection from the pool
const getConnection = async () => {
  if (!pool) {
    throw new Error("Connection pool not initialized. Call connectDB() first.");
  }
  return await pool.getConnection();
};

export { connectDB, disconnectDB, getConnection };