const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

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

router.use(express.json());

// Helper function to save detailed cause data
const saveCauseDetailData = (data) => {
  const filePath = path.join(__dirname, 'top_cause_detail_for_deletion.json');
  const timestamp = moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
  
  fs.writeFileSync(filePath, JSON.stringify({
    timestamp,
    ...data
  }, null, 2));
  
  console.log('✅ Detailed cause data saved to:', filePath);
};

// Helper function to log SQL queries with parameters
const logQuery = (query, params) => {
  const formattedQuery = query.replace(/\s+/g, ' ').trim();
  console.log('\n--- SQL QUERY ---');
  console.log('Full Query:', formattedQuery);
  console.log('Parameters:', params);
  console.log('--- END SQL QUERY ---\n');
  return formattedQuery;
};

// Helper function to execute query with error handling
async function executeQuery(connection, query, params) {
  try {
    console.log(`Executing query: ${query.substring(0, 100)}...`);
    const result = await connection.query(query, params);
    return result;
  } catch (error) {
    console.error('Query execution error:', error);
    error.query = query; // Attach the query to the error object
    error.params = params; // Attach the parameters to the error object
    throw error;
  }
}

// Improved getEventHierarchy with proper connection management and additional tables
async function getEventHierarchy(name) {
  let connection;
  try {
    // Establish connection once at the start
    connection = await connectToDatabase();
    console.log('Database connection established');
    
    // Get the main event with parameterized query
    const mainEventQuery = logQuery(
      `SELECT 
        EventID, 
        ModelID, 
        ParentID, 
        IsParent, 
        CreatedOn, 
        UpdatedOn, 
        IsActive,
        EventName,
        CreatedBy,
        UpdatedBy
      FROM Tbl_Events_Main 
      WHERE EventName = ?`,
      [name]
    );
    
    const mainEventResult = await executeQuery(connection, mainEventQuery, [name]);
    
    if (!mainEventResult || mainEventResult.length === 0) {
      throw new Error(`Event with name '${name}' not found`);
    }
    
    const eventId = mainEventResult[0].EventID;
    console.log(`Found event ID: ${eventId} for name: ${name}`);
    
    // Get Questions for this event
    const questionsQuery = logQuery(
      `SELECT 
        QuestionID,
        EventID,
        QuestionCost,
        CreatedOn,
        UpdatedOn,
        IsActive,
        QuestionName,
        QuestionTime,
        SubEventID,
        CreatedBy,
        UpdatedBy
      FROM Tbl_Questions 
      WHERE EventID = ?`,
      [eventId]
    );
    const questions = await executeQuery(connection, questionsQuery, [eventId]);
    console.log(`Found ${questions.length} questions for event ${eventId}`);
    
    // Get Question Answers for this event
    const questionAnswersQuery = logQuery(
      `SELECT 
        AnswerID,
        QuestionID,
        EventID,
        CreatedOn,
        UpdatedOn,
        IsActive,
        QuestionAnswer,
        SubEventID,
        CreatedBy,
        UpdatedBy
      FROM Tbl_Question_Answer 
      WHERE EventID = ?`,
      [eventId]
    );
    const questionAnswers = await executeQuery(connection, questionAnswersQuery, [eventId]);
    console.log(`Found ${questionAnswers.length} question answers for event ${eventId}`);
    
    // Get Actions for this event
    const actionsQuery = logQuery(
      `SELECT 
        ActionID,
        EventID,
        ActionCost,
        CreatedOn,
        UpdatedOn,
        IsActive,
        ActionName,
        ActionTime,
        CreatedBy,
        UpdatedBy
      FROM Tbl_Actions 
      WHERE EventID = ?`,
      [eventId]
    );
    const actions = await executeQuery(connection, actionsQuery, [eventId]);
    console.log(`Found ${actions.length} actions for event ${eventId}`);
    
    // Get causes (direct children)
    const causesQuery = logQuery(
      `SELECT 
        EventID,
        ModelID,
        ParentID,
        IsParent,
        CreatedOn,
        UpdatedOn,
        IsActive,
        ProbabilityPercentage,
        EventName,
        CreatedBy,
        UpdatedBy
      FROM Tbl_Events_Main 
      WHERE ParentID = ?`,
      [eventId]
    );
    const causes = await executeQuery(connection, causesQuery, [eventId]);
    console.log(`Found ${causes.length} causes for event ${eventId}`);
    
    // Process causes sequentially to avoid connection issues
    const causesWithSubcauses = [];
    for (const cause of causes) {
      // Get subcauses for this cause
      const subcausesQuery = logQuery(
        `SELECT 
          EventID,
          ModelID,
          ParentID,
          IsParent,
          CreatedOn,
          UpdatedOn,
          IsActive,
          ProbabilityPercentage,
          EventName,
          CreatedBy,
          UpdatedBy
        FROM Tbl_Events_Main 
        WHERE ParentID = ?`,
        [cause.EventID]
      );
      const subcauses = await executeQuery(connection, subcausesQuery, [cause.EventID]);
      
      // Process subcauses sequentially
      const subcausesWithNested = [];
      for (const subcause of subcauses) {
        // Get nested subcauses
        const nestedSubcausesQuery = logQuery(
          `SELECT 
            EventID,
            ModelID,
            ParentID,
            IsParent,
            CreatedOn,
            UpdatedOn,
            IsActive,
            ProbabilityPercentage,
            EventName,
            CreatedBy,
            UpdatedBy
          FROM Tbl_Events_Main 
          WHERE ParentID = ?`,
          [subcause.EventID]
        );
        const nestedSubcauses = await executeQuery(connection, nestedSubcausesQuery, [subcause.EventID]);
        
        saveCauseDetailData({
          level: 'nested_subcause',
          parent: subcause.EventName,
          data: nestedSubcauses
        });
        
        subcausesWithNested.push({
          ...subcause,
          nestedSubcauses
        });
      }
      
      saveCauseDetailData({
        level: 'subcause',
        parent: cause.EventName,
        data: subcausesWithNested
      });
      
      causesWithSubcauses.push({
        ...cause,
        subcauses: subcausesWithNested
      });
    }
    
    const fullHierarchy = {
      eventId,
      name,
      questions,
      questionAnswers,
      actions,
      causes: causesWithSubcauses
    };
    
    saveCauseDetailData({
      level: 'full_hierarchy',
      data: fullHierarchy
    });
    
    return fullHierarchy;
  } catch (error) {
    console.error('Error in getEventHierarchy:', error);
    throw error; // Re-throw to be handled by the route handler
  } finally {
    // Close connection only after all queries are done
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

// Get event hierarchy endpoint
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      const error = new Error('Name is required');
      console.error('\n=== VALIDATION ERROR ===');
      console.error('Error:', error.message);
      console.error('Request Body:', req.body);
      console.error('=== END ERROR LOG ===\n');
      return res.status(400).json({ error: error.message });
    }

    console.log('\n=== STARTING EVENT HIERARCHY QUERY ===');
    console.log('Event Name:', name);
    console.log('Request Time:', moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
    
    const hierarchy = await getEventHierarchy(name);
    
    console.log('=== COMPLETED EVENT HIERARCHY QUERY ===\n');
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error('\n=== ERROR IN EVENT HIERARCHY QUERY ===');
    console.error('Error Time:', moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    // More detailed error logging
    if (error.query) {
      console.error('Failed Query:', error.query.substring(0, 200) + (error.query.length > 200 ? '...' : ''));
      console.error('Query Parameters:', error.params);
    }
    
    if (error.stack) {
      console.error('Error Stack:', error.stack);
    }
    
    if (error.sql) {
      console.error('SQL Error Details:');
      console.error('SQL Message:', error.sqlMessage);
      console.error('Error Code:', error.code);
      console.error('SQL State:', error.sqlState);
    }
    
    console.error('Request Body:', req.body);
    console.error('=== END ERROR LOG ===\n');
    
    saveCauseDetailData({ 
      error: true,
      timestamp: moment().tz('America/New_York').format(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      query: error.query ? error.query.substring(0, 500) : null,
      queryParams: error.params,
      sqlError: error.sql ? {
        sqlMessage: error.sqlMessage,
        code: error.code,
        sqlState: error.sqlState
      } : null
    });
    
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        ...(error.query && { failedQuery: error.query.substring(0, 200) }),
        ...(error.stack && { stack: error.stack })
      } : undefined
    });
  }
});

module.exports = router;