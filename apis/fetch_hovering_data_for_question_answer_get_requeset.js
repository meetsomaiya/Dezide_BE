const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// JSON parsing
router.use(express.json());

// Path to the JSON file
const HOVERING_ITEMS_FILE = path.join(__dirname, 'hovering_items_for_question.json');

// Function to fetch event names for subevent IDs
async function fetchEventNames(connection, subEventIds) {
  try {
    const eventNames = [];
    
    // Process each subevent ID
    for (const subEventId of subEventIds) {
      const query = `
        SELECT EventName 
        FROM Tbl_Events_Main 
        WHERE EventID = ?
      `;
      const result = await connection.query(query, [subEventId]);
      
      if (result.length > 0) {
        eventNames.push(result[0].EventName);
      }
    }
    
    return eventNames;
  } catch (error) {
    console.error('Error fetching event names:', error);
    throw error;
  }
}

// Endpoint to fetch and store hovering data
router.get('/', async (req, res) => {
  let connection;
  try {
    const { answer, questionName, modalName } = req.query; // Retrieve parameters from query string

    if (!answer || !questionName || !modalName) {
      return res.status(400).json({ 
        error: 'answer, questionName and modalName are all required' 
      });
    }

    // Connect to database
    connection = await connectToDatabase();

    // Step 1: Get EventID for modalName from Tbl_Events_Main
    const modalQuery = `
      SELECT EventID 
      FROM Tbl_Events_Main 
      WHERE EventName = ?
    `;
    const modalResult = await connection.query(modalQuery, [modalName]);
    
    if (modalResult.length === 0) {
      return res.status(404).json({ 
        error: `No event found with name: ${modalName}` 
      });
    }
    const eventId = modalResult[0].EventID;

    // Step 2: Get QuestionID from Tbl_Questions
    const questionQuery = `
      SELECT QuestionID, SubEventID 
      FROM Tbl_Questions 
      WHERE EventID = ? AND QuestionName = ?
    `;
    const questionResult = await connection.query(questionQuery, [eventId, questionName]);
    
    if (questionResult.length === 0) {
      return res.status(404).json({ 
        error: `No question found with name: ${questionName} for event ${modalName}` 
      });
    }
    const questionId = questionResult[0].QuestionID;
    const subEventId = questionResult[0].SubEventID;

    // Step 3: Get SubEventIDs from Tbl_Question_Answer
    const answerQuery = `
      SELECT SubEventID 
      FROM Tbl_Question_Answer 
      WHERE QuestionID = ? AND QuestionAnswer = ?
    `;
    const answerResult = await connection.query(answerQuery, [questionId, answer]);
    
    let subEventIds = [];
    let eventNames = [];
    
    if (answerResult.length > 0 && answerResult[0].SubEventID) {
      // Split comma-separated SubEventIDs and remove duplicates
      subEventIds = [...new Set(
        answerResult[0].SubEventID.split(',')
          .map(id => id.trim())
          .filter(id => id !== '')
      )];
      
      // Step 4: Get EventNames for each SubEventID
      if (subEventIds.length > 0) {
        eventNames = await fetchEventNames(connection, subEventIds);
      }
    }

    // Create a composite key to store all answer-question-modal combinations
    const recordKey = `${questionName}_${answer.substring(0, 20).replace(/\s+/g, '_')}`;
    
    // Prepare the data to be written to the JSON file
    const newRecord = {
      [recordKey]: {
        answer,
        questionName,
        modalName,
        eventId,
        questionId,
        subEventIds,
        eventNames,
        timestamp: new Date().toISOString()
      }
    };

    // Write the new record to the JSON file (append or overwrite)
    await fs.writeFile(
      HOVERING_ITEMS_FILE,
      JSON.stringify(newRecord, null, 2),
      'utf-8'
    );

    // Return the response with all the data
    res.json({
      answer,
      questionName,
      modalName,
      eventId,
      questionId,
      subEventIds,
      eventNames,
      status: 'success'
    });

  } catch (error) {
    console.error('Error handling hovering data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Export the router
module.exports = router;