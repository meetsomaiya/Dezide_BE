const express = require('express');
const fs = require('fs');
const path = require('path');
const { connectToDatabase } = require('./connect2.js'); // Database connection function

const router = express.Router();

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// GET endpoint to retrieve and save actionName and fetch corresponding data
router.get('/', async (req, res) => {
    let actionName = req.query.actionName; // Retrieve the actionName from query parameters

    if (!actionName) {
        return res.status(400).json({ error: 'actionName query parameter is required.' });
    }

    // Remove trailing period if it exists
    actionName = actionName.replace(/\.$/, '').trim(); // Remove a trailing period and trim any spaces

    // Define the JSON file path
    const jsonFilePath = path.join(__dirname, 'image_explanation_action.json');

    // Prepare the data to write
    const data = {
        actionName,
        timestamp: new Date().toISOString(), // Include a timestamp for logging
    };

    try {
        // Connect to the database
        const connection = await connectToDatabase();

        // Updated query to reorder columns (varchar(100) comes before varchar(max))
        const query = `
            SELECT TOP (1) 
                [ExplainationID],
                [ActionID],
                [CreatedBy],              -- varchar(100) comes before varchar(max)
                [CreatedOn],
                [UpdatedBy],              -- varchar(100) comes before varchar(max)
                [UpdatedOn],
                [IsActive],
                [ActionName],             -- varchar(max) columns come after varchar(100)
                [ActionExplaination],     -- varchar(max) columns come after varchar(100)
                [ActionImageURL]          -- varchar(max) columns come after varchar(100)
            FROM [Dezide_UAT].[dbo].[Tbl_Action_Explaination]
            WHERE RTRIM([ActionName]) LIKE ?
        `;
        
        const result = await connection.query(query, [`${actionName}%`]);

        if (result.length === 0) {
            return res.status(404).json({ error: 'No matching records found for the given actionName.' });
        }

        const record = result[0]; // Retrieve the first record

        let imageBase64 = null;
        
        // Check if ActionImageURL exists or not
        if (record.ActionImageURL) {
            const imagePath = path.join(__dirname, record.ActionImageURL);

            // Check if the image file exists
            if (fs.existsSync(imagePath)) {
                // Read the image file
                const imageData = fs.readFileSync(imagePath);
                imageBase64 = imageData.toString('base64');
            }
        }

        // If image is not found in the database, try reading from the default path
        if (!imageBase64) {
            const defaultImagePath = path.join(__dirname, `../DEZIDE/Explaination_Images/${record.ActionID}/${record.ActionID}.png`);
            if (fs.existsSync(defaultImagePath)) {
                const imageData = fs.readFileSync(defaultImagePath);
                imageBase64 = imageData.toString('base64');
            }
        }

        // If no image found in both locations
        if (!imageBase64) {
            return res.status(404).json({ error: 'Image not found for the specified action.' });
        }

        // Prepare the response data
        data.record = {
            actionExplaination: record.ActionExplaination,
            actionImage: `data:image/png;base64,${imageBase64}`, // Embed the image as Base64
            isActive: record.IsActive,
        };

        // Write data to the JSON file
        fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error('Error writing to JSON file:', err);
                return res.status(500).json({ error: 'Failed to save data to JSON file.' });
            }

            console.log(`ActionName "${actionName}" and its data saved to file.`);

            // Respond with the fetched record
            res.json({
                message: 'Action data retrieved successfully.',
                actionExplaination: record.ActionExplaination,
                actionImage: `data:image/png;base64,${imageBase64}`, // Send Base64 image
                isActive: record.IsActive,
            });
        });

        // Close the database connection
        await connection.close();
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal server error while fetching data.' });
    }
});

module.exports = router;
