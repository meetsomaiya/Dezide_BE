const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Database connection function

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

// Ensure express parses incoming JSON data in the request body
router.use(express.json()); // This middleware is required for parsing JSON requests

// Helper functions
async function getEventIdAndModelId(connection, mainEvent) {
  try {
    const query = `SELECT EventID, ModelID FROM Tbl_Events_Main WHERE EventName = ?`;
    const result = await connection.query(query, [mainEvent]);

    if (result.length === 0) throw new Error(`Main event "${mainEvent}" not found.`);
    return { eventId: result[0].EventID, modelId: result[0].ModelID };
  } catch (error) {
    throw new Error(`Error retrieving EventID and ModelID: ${error.message}`);
  }
}

async function upsertEvent(connection, modelId, eventName, parentId, isParent, probability) {
  try {
    const createdOn = moment().format('YYYY-MM-DD HH:mm:ss');
    const updatedOn = createdOn;
    const createdBy = '40139'; // Use string for createdBy as it is varchar
    const updatedBy = '40139'; // Use string for updatedBy as it is varchar
    const isActive = 1; // `IsActive` should be 1 (active)

    // Check if the event already exists
    const selectQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ? AND ParentID = ?`;
    const existingEvent = await connection.query(selectQuery, [eventName, parentId]);

    if (existingEvent.length > 0) {
      // Update probability percentage for existing event
      const updateQuery = `
        UPDATE Tbl_Events_Main 
        SET ProbabilityPercentage = ?, UpdatedOn = ?, UpdatedBy = ? 
        WHERE EventID = ?
      `;
      await connection.query(updateQuery, [probability, updatedOn, updatedBy, existingEvent[0].EventID]);
      return existingEvent[0].EventID;
    }

    // Insert new event
    const insertQuery = `
      INSERT INTO Tbl_Events_Main 
      (ModelID, EventName, ParentID, IsParent, CreatedOn, CreatedBy, UpdatedOn, UpdatedBy, IsActive, ProbabilityPercentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await connection.query(insertQuery, [
      modelId,
      eventName,
      parentId,
      isParent ? 1 : 0, // Convert boolean to bit (1 or 0)
      createdOn,
      createdBy,
      updatedOn,
      updatedBy,
      isActive,
      probability,
    ]);
    return result.insertId; // Return the new EventID
  } catch (error) {
    throw new Error(`Error inserting/updating event: ${error.message}`);
  }
}

// POST route to handle the submission of cause data
router.post('/', async (req, res) => {
  const connection = await connectToDatabase();
  const { mainEvent, causes } = req.body;

  if (!mainEvent || !Array.isArray(causes)) {
    return res.status(400).json({
      message: 'Invalid payload format',
      error: 'Missing required properties: mainEvent or causes.',
    });
  }

  try {
    console.log('Received data:', req.body);

    // Step 1: Get EventID and ModelID for mainEvent
    const { eventId: mainEventId, modelId } = await getEventIdAndModelId(connection, mainEvent);

    // Step 2: Insert or update causes
    for (const cause of causes) {
      const causeId = await upsertEvent(connection, modelId, cause.causeName, mainEventId, cause.subcauses.length > 0 ? 1 : 0, cause.probability);

      // Step 3: Insert or update subcauses
      for (const subcause of cause.subcauses) {
        const subcauseId = await upsertEvent(connection, modelId, subcause.subCauseName, causeId, subcause.nestedSubcauses.length > 0 ? 1 : 0, subcause.probability);

        // Step 4: Insert or update nested subcauses
        for (const nestedSubcause of subcause.nestedSubcauses) {
          await upsertEvent(connection, modelId, nestedSubcause.eventName, subcauseId, 0, nestedSubcause.probability);
        }
      }
    }

        // Log the received data (for debugging purposes)
        console.log('Received data:', req.body);
    
        // Save the received data to a simple JSON file called 'cause_data_on_backend.json'
        const filePath = './cause_data_on_backend.json';
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
        
    // Respond back to the frontend with a success message
    res.status(200).json({
      message: 'Data successfully processed and saved to the database.',
    });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({
      message: 'Error processing data',
      error: error.message,
    });
  } finally {
    // Close the database connection
    await connection.close();
  }
});

// Export the router
module.exports = router;
