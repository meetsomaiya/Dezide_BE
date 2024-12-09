const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For working with file paths
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Your existing database connection logic

const router = express.Router(); // Define the router

// Set up CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    next();
});

// Fetch Action Explanation API
router.get('/', async (req, res) => {
    const actionName = req.query.actionName; // Retrieve actionName from query parameters

    if (!actionName) {
        return res.status(400).json({ error: 'actionName is required' });
    }

    try {
        // Connect to the database
        const connection = await connectToDatabase();

        // Query the Tbl_Action_Explaination table
        const query = `
            SELECT ActionID, ActionExplaination
            FROM Tbl_Action_Explaination 
            WHERE ActionName = ?
        `;
        const result = await connection.query(query, [actionName]);

        // Close the database connection
        await connection.close();

        // Check if a result was found
        if (result.length === 0) {
            return res.status(404).json({ error: 'No explanation found for the given actionName' });
        }

        // Fetch the explanation and ActionID
        const actionExplanation = result[0].ActionExplaination;
        const actionID = result[0].ActionID;

        console.log('Fetched Action Explanation:', actionExplanation);

        // Path to the image based on ActionID
        const imageFolder = path.join(
            'D:\\OneDrive - Suzlon Energy Ltd\\Pictures\\DEZIDE_ACTION_IMAGES\\DEZIDE\\Explaination_Images',
            String(actionID)
        );
        const imagePath = path.join(imageFolder, `${actionID}.png`);

        let base64Image = null;

        // Read and encode the image if it exists
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            console.log('Image successfully read and encoded.');
        } else {
            console.warn('Image not found:', imagePath);
        }

        // Prepare JSON data
        const actionData = {
            actionName,
            actionExplanation,
            actionID,
            image: base64Image, // Include the image in Base64 encoding
            timestamp: moment().format(), // Add a timestamp for validation
        };

        // Write the explanation to the JSON file
        const filePath = './action_explanation.json';
        fs.writeFile(filePath, JSON.stringify(actionData, null, 2), (err) => {
            if (err) {
                console.error('Error writing to JSON file:', err);
                return res.status(500).json({ error: 'Failed to write to JSON file' });
            }

            console.log('Action explanation written to file:', actionData);

            // Send a success response
            res.json({
                message: 'Action explanation saved successfully',
                actionData,
            });
        });
    } catch (err) {
        console.error('Error fetching action explanation:', err);
        res.status(500).json({ error: 'Failed to fetch action explanation' });
    }
});

module.exports = router;
