const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { connectToDatabase } = require('./connect2.js');

const router = express.Router();

// Set up CORS middleware (unchanged)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

router.use(express.json());

// Helper function to save detailed cause data (unchanged)
const saveCauseDetailData = (data) => {
  const filePath = path.join(__dirname, 'top_cause_detail_for_deletion.json');
  const timestamp = moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
  
  fs.writeFileSync(filePath, JSON.stringify({
    timestamp,
    ...data
  }, null, 2));
  
  console.log('✅ Detailed cause data saved to:', filePath);
};

// Improved getEventHierarchy with proper connection management
async function getEventHierarchy(name) {
  let connection;
  try {
    // Establish connection once at the start
    connection = await connectToDatabase();
    
    // Get the main event with parameterized query
    const mainEventQuery = `SELECT EventID FROM Tbl_Events_Main WHERE EventName = ?`;
    const mainEventResult = await connection.query(mainEventQuery, [name]);
    
    if (mainEventResult.length === 0) {
      throw new Error(`Event with name '${name}' not found`);
    }
    
    const eventId = mainEventResult[0].EventID;
    
    // Get causes (direct children)
    const causesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = ?`;
    const causes = await connection.query(causesQuery, [eventId]);
    
    // Process causes sequentially to avoid connection issues
    const causesWithSubcauses = [];
    for (const cause of causes) {
      // Get subcauses for this cause
      const subcausesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = ?`;
      const subcauses = await connection.query(subcausesQuery, [cause.EventID]);
      
      // Process subcauses sequentially
      const subcausesWithNested = [];
      for (const subcause of subcauses) {
        // Get nested subcauses
        const nestedSubcausesQuery = `SELECT * FROM Tbl_Events_Main WHERE ParentID = ?`;
        const nestedSubcauses = await connection.query(nestedSubcausesQuery, [subcause.EventID]);
        
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
      causes: causesWithSubcauses
    };
    
    saveCauseDetailData({
      level: 'full_hierarchy',
      data: fullHierarchy
    });
    
    return fullHierarchy;
  } finally {
    // Close connection only after all queries are done
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

// Get event hierarchy endpoint (unchanged)
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
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;