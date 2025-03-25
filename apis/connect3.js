const sql = require('mssql');

// MSSQL Connection Configuration (Matching ODBC)

const config = {
    user: 'DEZIDE_UAT',
    password: 'Suzlon$322',
    server: 'SELPUNMBDWEB01\\OMS_UAT', // Use only the main server name
    database: 'Dezide_UAT',
    port: 7002, // Use explicit port
    options: {
        encrypt: false, // Same as ODBC `Encrypt=no`
        trustServerCertificate: true, // Same as ODBC `TrustServerCertificate=yes`
        enableArithAbort: true, // Prevents certain query issues
        rowCollectionOnRequestCompletion: true, // Ensures proper row handling
    },
    connectionTimeout: 30000,  // 30 seconds
    requestTimeout: 30000,
};

// Function to connect to MSSQL
async function connectToDatabase(qry) {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to MSSQL database');

        // Execute the query
        const result = await pool.request().query(qry);
        console.log('✅ Query result:', result.recordset);
        return result.recordset;
    } catch (err) {
        console.error('❌ Error executing query:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close(); // Always close the connection pool
        }
    }
}

module.exports = { connectToDatabase };
