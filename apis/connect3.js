const sql = require('mssql');

// Exact MSSQL equivalent of your working ODBC connection
const config = {
    user: 'DEZIDE_UAT',
    password: 'Suzlon$321',
    server: 'SELPUNMBDWEB01\\OMS_UAT', // Include instance name with double backslash
    port: 7002, // Explicit port
    database: 'Dezide_UAT',
    options: {
        encrypt: false, // Matches Encrypt=no
        trustServerCertificate: true, // Matches TrustServerCertificate=yes
        enableArithAbort: true, // Recommended for consistency
        connectTimeout: 30000, // 30 seconds connection timeout
        requestTimeout: 30000, // 30 seconds request timeout
        useUTC: false // Match ODBC's default timezone handling
    }
};

async function connectToDatabase() {
    try {
        console.log('Attempting to connect with exact ODBC-equivalent configuration...');
        
        // Connect using the pool
        const pool = await sql.connect(config);
        console.log('✅ Connected to MSSQL database');

        // Test query (using parameterized query for security)
        const result = await pool.request()
            .query('SELECT 1 AS test');
        
        console.log('Test query result:', result.recordset);
        return pool; // Return the connection pool
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        
        // Detailed troubleshooting
        console.error('Connection Details Attempted:');
        console.error(`- Server: ${config.server}`);
        console.error(`- Port: ${config.port}`);
        console.error(`- Instance: OMS_UAT`);
        console.error(`- Database: ${config.database}`);
        
        // Network troubleshooting
        console.log('\nTroubleshooting Network Connectivity:');
        console.log(`1. Try ping SELPUNMBDWEB01`);
        console.log(`2. Test port with: telnet SELPUNMBDWEB01 7002`);
        console.log(`3. Verify SQL Server is configured to listen on port 7002`);
        console.log(`4. Check firewall rules on both client and server`);
        
        throw err;
    }
}

// Test connection immediately with error handling
(async () => {
    try {
        const pool = await connectToDatabase();
        
        // Additional verification query
        const dbResult = await pool.request()
            .query(`SELECT DB_NAME() AS currentDB, @@SERVERNAME AS serverName`);
        
        console.log('Database Verification:');
        console.log(`- Connected to database: ${dbResult.recordset[0].currentDB}`);
        console.log(`- Server name: ${dbResult.recordset[0].serverName}`);
        
        await pool.close();
    } catch (error) {
        console.error('Connection test failed:', error);
        process.exit(1); // Exit with error code if connection fails
    }
})();

module.exports = { 
    connectToDatabase,
    sql, // Export sql for parameterized queries
    config // Export config for verification
};