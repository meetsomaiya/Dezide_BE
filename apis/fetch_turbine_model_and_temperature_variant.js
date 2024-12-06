const express = require('express');
const { connectToDatabase } = require('./connect2'); // Import the connection function
const router = express.Router();
const fs = require('fs'); // File system module for writing the JSON file

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// API to fetch turbine models and temperature variants and send them as a response
router.get('/', async (req, res) => {
    try {
        const connection = await connectToDatabase(); // Get the database connection

        // Query to fetch all model names where ParentID = '0' (for turbine models)
        const turbineModelsQuery = `
            SELECT [ModelName]
            FROM [Dezide_UAT].[dbo].[Tbl_TurbineModels]
            WHERE ParentID = '0'
        `;
        
        // Query to fetch all temperature variants where ParentID = '0' (for temperature variants)
        const temperatureVariantsQuery = `
            SELECT [TempVariant]
            FROM [Dezide_UAT].[dbo].[tbl_Temperature_Variant]
            WHERE ParentID = '0'
        `;

        // Execute the turbine models query
        const turbineModels = await connection.query(turbineModelsQuery);

        // Execute the temperature variants query
        const temperatureVariants = await connection.query(temperatureVariantsQuery);

        // Extract the model names and temperature variants into arrays
        const turbineModelsData = turbineModels.map(row => row.ModelName); // Extracting model names
        const temperatureVariantsData = temperatureVariants.map(row => row.TempVariant); // Extracting temperature variants

        // Write turbine models and temperature variants to a JSON file
        const jsonData = {
            turbineModels: turbineModelsData,
            temperatureVariants: temperatureVariantsData
        };
        
        // Save both turbine models and temperature variants as a JSON file
        fs.writeFileSync('turbine_models_sent_back.json', JSON.stringify(jsonData, null, 2)); // Save as JSON

        // Send the response with turbine models and temperature variants
        res.json(jsonData);

        // Close the database connection
        await connection.close();
    } catch (err) {
        console.error('Error fetching turbine models and temperature variants:', err);
        res.status(500).json({ error: 'Internal server error' }); // Send error if something goes wrong
    }
});

module.exports = router;
