const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToMSSQL, sql, testDatabaseConnection } = require('./connect5.js');

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

// NEW: Database connection test endpoint
router.get('/', async (req, res) => {
  try {
    const testResult = await testDatabaseConnection();
    if (testResult.success) {
      res.status(200).json({
        status: 'success',
        message: testResult.message,
        server: testResult.server,
        database: testResult.database
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: testResult.message,
        error: testResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message
    });
  }
});

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

// Improved getEventHierarchy with MSSQL connection
async function getEventHierarchy(name) {
  let pool;
  try {
    // Get connection pool
    pool = await connectToMSSQL();
    
    // Verify connection is alive
    await pool.request().query('SELECT 1');
    
    // Get the main event with parameterized query
    const mainEventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = @name`;
    const mainEventResult = await pool.request()
      .input('name', sql.NVarChar(255), name)
      .query(mainEventQuery);
    
    if (mainEventResult.recordset.length === 0) {
      throw new Error(`Event with name '${name}' not found`);
    }
    
    const eventId = mainEventResult.recordset[0].EventID;
    
    // Get Questions for this event
    const questionsQuery = `SELECT * FROM Tbl_Questions WHERE EventID = @eventId`;
    const questions = await pool.request()
      .input('eventId', sql.Int, eventId)
      .query(questionsQuery);
    
    // Get Question Answers for this event
    const questionAnswersQuery = `SELECT * FROM Tbl_Question_Answer WHERE EventID = @eventId`;
    const questionAnswers = await pool.request()
      .input('eventId', sql.Int, eventId)
      .query(questionAnswersQuery);
    
    // Get Actions for this event
    const actionsQuery = `SELECT * FROM Tbl_Actions WHERE EventID = @eventId`;
    const actions = await pool.request()
      .input('eventId', sql.Int, eventId)
      .query(actionsQuery);
    
    // Get causes (direct children)
    const causesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = @eventId`;
    const causes = await pool.request()
      .input('eventId', sql.Int, eventId)
      .query(causesQuery);
    
    // Process causes sequentially
    const causesWithSubcauses = [];
    for (const cause of causes.recordset) {
      // Get subcauses for this cause
      const subcausesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = @causeId`;
      const subcauses = await pool.request()
        .input('causeId', sql.Int, cause.EventID)
        .query(subcausesQuery);
      
      // Process subcauses sequentially
      const subcausesWithNested = [];
      for (const subcause of subcauses.recordset) {
        // Get nested subcauses
        const nestedSubcausesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = @subcauseId`;
        const nestedSubcauses = await pool.request()
          .input('subcauseId', sql.Int, subcause.EventID)
          .query(nestedSubcausesQuery);
        
        saveCauseDetailData({
          level: 'nested_subcause',
          parent: subcause.EventName,
          data: nestedSubcauses.recordset
        });
        
        subcausesWithNested.push({
          ...subcause,
          nestedSubcauses: nestedSubcauses.recordset
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
      questions: questions.recordset,
      questionAnswers: questionAnswers.recordset,
      actions: actions.recordset,
      causes: causesWithSubcauses
    };
    
    saveCauseDetailData({
      level: 'full_hierarchy',
      data: fullHierarchy
    });
    
    return fullHierarchy;
  } catch (error) {
    console.error('Error in getEventHierarchy:', error);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
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
      return res.status(400).json({ error: 'Name is required' });
    }

    const hierarchy = await getEventHierarchy(name);
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error('Error retrieving event hierarchy:', error);
    saveCauseDetailData({ 
      error: true,
      message: error.message,
      stack: error.stack,
      timestamp: moment().tz('America/New_York').format()
    });
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;