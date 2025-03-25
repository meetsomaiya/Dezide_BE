const express = require('express');
const fs = require('fs'); // For file operations
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Import the connection function
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
router.use(express.json());

// Endpoint to handle the incoming request and save data to a JSON file
router.post('/', async (req, res) => {
  // Extract the data from the request body
  const requestData = req.body;

  // Log the received data for debugging
  console.log('Data received on backend:', requestData);

  // Define the file path for saving the JSON data
  const filePath = './question_retrieved_on_backend.json';

  try {
    // Step 1: Fetch EventID from Tbl_Events_Main
    const connection = await connectToDatabase(); // Connect to the database
    const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    const eventResult = await connection.query(eventQuery, [requestData.modalName]);

    if (eventResult.length === 0) {
      throw new Error(`Event with name '${requestData.modalName}' not found.`);
    }

    const eventID = eventResult[0].EventID; // Extract EventID

    // Step 2: Insert questions into Tbl_Questions
    const insertQuery = `
      INSERT INTO Tbl_Questions (
        EventID, SubEventID, QuestionName, QuestionTime, QuestionCost,
        CreatedOn, CreatedBy, UpdatedOn, UpdatedBy, IsActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Loop through each question and insert into the database
    for (const question of requestData.questions) {
      const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss'); // Get current date and time
      const insertParams = [
        eventID, // EventID
        eventID, // SubEventID (same as EventID)
        question.questionName, // QuestionName
        question.questionTime, // QuestionTime
        question.questionCost, // QuestionCost
        currentDateTime, // CreatedOn
        40139, // CreatedBy (hardcoded as per requirement)
        currentDateTime, // UpdatedOn
        40139, // UpdatedBy (hardcoded as per requirement)
        1, // IsActive (hardcoded as per requirement)
      ];

      await connection.query(insertQuery, insertParams); // Execute the insert query
    }

    // Close the database connection
    await connection.close();

    // Step 3: Save the received data to a JSON file (unchanged)
    fs.writeFile(filePath, JSON.stringify(requestData, null, 2), (err) => {
      if (err) {
        console.error('Error saving data to file:', err);
        return res.status(500).json({ error: 'Failed to save data to file.' });
      }

      // Respond to the client indicating success
      res.status(200).json({
        message: 'Data received, saved to database, and saved to file successfully.',
        savedData: requestData,
      });
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message || 'An error occurred while processing the request.' });
  }
});

module.exports = router;