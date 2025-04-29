const sql = require('mssql');

// Centralized configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'SELPUNMBDWEB01\\OMS_UAT',
  port: parseInt(process.env.DB_PORT) || 7002,
  user: process.env.DB_USER || 'DEZIDE_UAT',
  password: process.env.DB_PASSWORD || 'Suzlon$321',
  database: process.env.DB_NAME || 'Dezide_UAT',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    rowCollectionOnDone: true,
  },
  pool: {
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

// Singleton connection pool
let pool = null;
let isConnecting = false;

async function connectToMSSQL() {
  if (pool) {
    try {
      // Verify the connection is still alive
      await pool.request().query('SELECT 1');
      return pool;
    } catch (err) {
      console.log('Connection verification failed, reconnecting...');
      pool = null; // Force reconnection
    }
  }

  if (isConnecting) {
    // Wait if connection is already in progress
    await new Promise(resolve => setTimeout(resolve, 100));
    return connectToMSSQL();
  }

  isConnecting = true;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ MSSQL: Connection pool established');
    pool.on('error', err => {
      console.error('MSSQL Pool Error:', err);
      pool = null; // Reset pool on error
    });
    return pool;
  } catch (err) {
    console.error('❌ MSSQL Connection Failed:', err.message);
    throw new Error(`Database connection failed: ${err.message}`);
  } finally {
    isConnecting = false;
  }
}

async function testDatabaseConnection() {
  try {
    const pool = await connectToMSSQL();
    const result = await pool.request().query('SELECT 1 AS test_value');
    
    if (result.recordset?.[0]?.test_value === 1) {
      return {
        success: true,
        message: '✅ MSSQL connection test successful',
        server: dbConfig.server,
        database: dbConfig.database
      };
    }
    return {
      success: false,
      message: '⚠️ Connection test returned unexpected result'
    };
  } catch (err) {
    return {
      success: false,
      message: `❌ Connection test failed: ${err.message}`,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  }
}

async function disconnect() {
  if (pool) {
    try {
      await pool.close();
      console.log('🛑 MSSQL: Connection pool closed');
    } catch (err) {
      console.error('Error closing connection:', err);
    } finally {
      pool = null;
    }
  }
}

// Immediate test when module loads (optional)
if (process.env.TEST_DB_ON_STARTUP === 'true') {
  (async () => {
    console.log('Running startup database connection test...');
    const testResult = await testDatabaseConnection();
    console.log(testResult.message);
    if (!testResult.success) process.exit(1);
  })();
}

module.exports = {
  sql,
  connectToMSSQL,
  testDatabaseConnection,
  disconnect
};