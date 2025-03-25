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

// Route to handle the POST request and save data to JSON file
router.post('/', async (req, res) => {
  // Extract data from the request body
  const { questionName, newAnswer, modalName } = req.body;

  // Create an object with the retrieved data
  const dataToSave = {
    questionName,
    newAnswer,
    modalName,
    timestamp: moment().tz('UTC').format(), // Add a timestamp in UTC
  };

  // Define the file path
  const filePath = 'answer_retrieved_for_insertion.json';

  // Write the data to the JSON file
  fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), (err) => {
    if (err) {
      console.error('Error writing to JSON file:', err);
      return res.status(500).json({ success: false, message: 'Failed to save data to file' });
    }

    console.log('Data successfully written to JSON file:', filePath);
  });

  try {
    // Connect to the database
    const dbConnection = await connectToDatabase();

    // Step 1: Get EventID from Tbl_Events_Main using modalName
    const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    const eventResult = await dbConnection.query(eventQuery, [modalName]);

    if (eventResult.length === 0) {
      throw new Error(`No event found with name: ${modalName}`);
    }

    const { EventID } = eventResult[0];

    // Step 2: Get QuestionID from Tbl_Questions using EventID and questionName
    const questionQuery = `SELECT QuestionID FROM Tbl_Questions WHERE EventID = ? AND QuestionName = ?`;
    const questionResult = await dbConnection.query(questionQuery, [EventID, questionName]);

    if (questionResult.length === 0) {
      throw new Error(`No question found with name: ${questionName} for EventID: ${EventID}`);
    }

    const { QuestionID } = questionResult[0];

    // Step 3: Insert into Tbl_Question_Answer
    const insertQuery = `
      INSERT INTO Tbl_Question_Answer 
      (QuestionID, EventID, SubEventID, QuestionAnswer, CreatedBy, CreatedOn, UpdatedBy, UpdatedOn, IsActive)
      VALUES (?, ?, ?, ?, ?, GETDATE(), ?, GETDATE(), ?)
    `;
    const insertParams = [QuestionID, EventID, EventID, newAnswer, 40139, 40139, 1];

    await dbConnection.query(insertQuery, insertParams);

    console.log('Data successfully inserted into Tbl_Question_Answer');

    // Close the database connection
    await dbConnection.close();

    // Respond to the client
    res.status(200).json({ success: true, message: 'Data saved and processed successfully', data: dataToSave });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ success: false, message: 'Failed to process data', error: error.message });
  }
});

module.exports = router;