const express = require('express');
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

// Endpoint to handle the incoming request
router.post('/', async (req, res) => {
  console.log('\n=== NEW REQUEST RECEIVED ===');
  console.log('Timestamp:', moment().format('YYYY-MM-DD HH:mm:ss'));
  
  // Extract and log request data
  const requestData = req.body;
  console.log('\n=== REQUEST DATA ===');
  console.log(`Event Name: "${requestData.modalName}"`);
  console.log(`Number of Questions: ${requestData.questions.length}`);
  
  requestData.questions.forEach((q, i) => {
    console.log(`\nQuestion ${i + 1} Details:`);
    console.log(`- Name: "${q.questionName}"`);
    console.log(`- Time: ${q.questionTime}`);
    console.log(`- Cost: ${q.questionCost}`);
  });

  try {
    // DATABASE OPERATION 1: GET EVENT ID
    console.log('\n=== DATABASE CONNECTION ESTABLISHED ===');
    const connection = await connectToDatabase();
    
    console.log('\n=== EXECUTING EVENT QUERY ===');
    const eventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    console.log('Query:', eventQuery);
    console.log('Parameter:', `"${requestData.modalName}"`);
    
    const eventResult = await connection.query(eventQuery, [requestData.modalName]);
    console.log('Query executed at:', moment().format('HH:mm:ss.SSS'));
    
    if (eventResult.length === 0) {
      await connection.close();
      console.log('\n!!! QUERY RESULT: EVENT NOT FOUND !!!');
      return res.status(404).json({ error: `Event "${requestData.modalName}" not found` });
    }

    const eventID = eventResult[0].EventID;
    console.log('\n=== QUERY RESULTS ===');
    console.log(`Found EventID: ${eventID} for "${requestData.modalName}"`);

    // DATABASE OPERATION 1.5: CHECK FOR EXISTING QUESTIONS
    console.log('\n=== CHECKING FOR EXISTING QUESTIONS ===');
    const checkQuery = `SELECT QuestionName FROM Tbl_Questions WHERE EventID = ? AND QuestionName = ?`;
    let insertedCount = 0;
    let skippedCount = 0;

    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log('\nSystem Values:');
    console.log(`- CreatedOn/UpdatedOn: ${currentDateTime}`);
    console.log('- CreatedBy/UpdatedBy: 40139 (hardcoded)');
    console.log('- IsActive: 1 (hardcoded)');
    console.log('- SubEventID: Same as EventID');

    // DATABASE OPERATION 2: INSERT QUESTIONS
    console.log('\n=== PREPARING QUESTION INSERTS ===');
    const insertQuery = `
      INSERT INTO Tbl_Questions (
        EventID, SubEventID, QuestionName, QuestionTime, QuestionCost,
        CreatedOn, CreatedBy, UpdatedOn, UpdatedBy, IsActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    console.log('\nBase Insert Query Template:');
    console.log(insertQuery);

    // Process each question
    for (const [index, question] of requestData.questions.entries()) {
      console.log(`\n=== PROCESSING QUESTION ${index + 1} ===`);
      console.log(`Question Name: "${question.questionName}"`);
      
      // First check if question already exists for this event
      console.log('Checking for existing question with same name...');
      const checkResult = await connection.query(checkQuery, [eventID, question.questionName]);
      
      if (checkResult.length > 0) {
        console.log(`Question "${question.questionName}" already exists for EventID ${eventID}. Skipping insertion.`);
        skippedCount++;
        continue;
      }
      
      const insertParams = [
        eventID,
        eventID,
        question.questionName,
        question.questionTime,
        question.questionCost,
        currentDateTime,
        40139,
        currentDateTime,
        40139,
        1
      ];
      
      console.log('\nInsert Parameters:');
      console.log(insertParams);
      
      console.log('\nExecuting Insert...');
      const startTime = moment();
      await connection.query(insertQuery, insertParams);
      const duration = moment().diff(startTime, 'milliseconds');
      
      console.log(`Insert completed in ${duration}ms`);
      console.log(`Successfully added question "${question.questionName}"`);
      insertedCount++;
    }

    // Final cleanup
    await connection.close();
    console.log('\n=== DATABASE CONNECTION CLOSED ===');
    
    console.log('\n=== OPERATION SUMMARY ===');
    console.log(`Event: "${requestData.modalName}" (ID: ${eventID})`);
    console.log(`Questions Attempted: ${requestData.questions.length}`);
    console.log(`Questions Added: ${insertedCount}`);
    console.log(`Questions Skipped (duplicates): ${skippedCount}`);
    console.log('Total Time:', moment().format('HH:mm:ss.SSS'));
    
    res.status(200).json({
      message: `Processed ${requestData.questions.length} questions for event "${requestData.modalName}"`,
      details: {
        added: insertedCount,
        skipped: skippedCount,
        eventID: eventID
      }
    });

  } catch (error) {
    console.error('\n!!! ERROR OCCURRED !!!');
    console.error('Error Time:', moment().format('HH:mm:ss.SSS'));
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    
    res.status(500).json({
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;