const odbc = require('odbc');

// ODBC connection string using SQL Server Authentication
const connectionString = 'Driver={ODBC Driver 17 for SQL Server};Server=SELPUNMBDWEB01\\OMS_UAT,7002;Database=Dezide_UAT;UID=DEZIDE_UAT;PWD=Suzlon$321;Encrypt=no;TrustServerCertificate=yes;Connection Timeout=30;';

// Function to connect to the database using ODBC
async function connectToDatabase() {
    try {
        // Establish a connection using ODBC
        const connection = await odbc.connect(connectionString);
        console.log('Connected to the database.');
        return connection;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

module.exports = { connectToDatabase };