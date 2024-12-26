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

// Route to handle GET request for turbine model or temperature variant
router.get('/', async (req, res) => {
    const { type, value } = req.query; // Extract type and value from the request query

    if (!type || !value) {
        return res.status(400).json({ error: 'Type and value are required' });
    }

    try {
        const connection = await connectToDatabase();

        if (type === 'model') {
            // Query to get ModelID for the given ModelName
            const modelIdQuery = `
                SELECT ModelID
                FROM Tbl_TurbineModels
                WHERE ModelName = ?
            `;
            const modelIdResult = await connection.query(modelIdQuery, [value]);

            if (modelIdResult.length === 0) {
                return res.status(404).json({ error: 'Model not found' });
            }

            const modelId = modelIdResult[0].ModelID;

            // Query to get ParentModelName and ChildrenModelNames
            const parentModelsQuery = `
                SELECT ModelName AS ParentModelName
                FROM Tbl_TurbineModels
                WHERE ModelID = ?
            `;
            const childrenModelsQuery = `
                SELECT ModelName AS ChildrenModelName
                FROM Tbl_TurbineModels
                WHERE ParentID = ?
            `;
            const parentModelsResult = await connection.query(parentModelsQuery, [modelId]);
            const childrenModelsResult = await connection.query(childrenModelsQuery, [modelId]);

            const parentModelNames = parentModelsResult.map(row => row.ParentModelName);
            const childrenModelNames = childrenModelsResult.map(row => row.ChildrenModelName);

            return res.status(200).json({
                parentModelNames,
                childrenModelNames
            });
        } else if (type === 'variant') {
            // Query to get TempID for the given TempVariant
            const tempIdQuery = `
                SELECT TempID
                FROM tbl_Temperature_Variant
                WHERE TempVariant = ?
            `;
            const tempIdResult = await connection.query(tempIdQuery, [value]);

            if (tempIdResult.length === 0) {
                return res.status(404).json({ error: 'Temperature variant not found' });
            }

            const tempId = tempIdResult[0].TempID;

            // Query to get ParentTempVariants and ChildrenTempVariants
            const parentVariantsQuery = `
                SELECT TempVariant AS ParentTempVariant
                FROM tbl_Temperature_Variant
                WHERE TempID = ?
            `;
            const childrenVariantsQuery = `
                SELECT TempVariant AS ChildrenTempVariant
                FROM tbl_Temperature_Variant
                WHERE ParentID = ?
            `;
            const parentVariantsResult = await connection.query(parentVariantsQuery, [tempId]);
            const childrenVariantsResult = await connection.query(childrenVariantsQuery, [tempId]);

            const parentTempVariants = parentVariantsResult.map(row => row.ParentTempVariant);
            const childrenTempVariants = childrenVariantsResult.map(row => row.ChildrenTempVariant);

            return res.status(200).json({
                parentTempVariants,
                childrenTempVariants
            });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
    } catch (error) {
        console.error('Database query failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
