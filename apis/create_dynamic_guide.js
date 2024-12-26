const express = require('express');
const { connectToDatabase } = require('./connect2'); // Import the connection function (if needed)
const router = express.Router();
const moment = require('moment-timezone'); // For timezone handling (Asia/Kolkata)

// Set up CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  next();
});

// Handle GET request to create dynamic guide
router.get('/', async (req, res) => {
  // Extract the data from the query string (GET parameters)
  const { guideName, selectedParentModel, selectedParentVariant } = req.query;

  // Check if all necessary data is provided
  if (!guideName || !selectedParentModel || !selectedParentVariant) {
    return res.status(400).json({ message: 'Missing required query parameters' });
  }

  try {
    // Establish the database connection
    const dbConnection = await connectToDatabase();

    // Fetch ModelID from Tbl_TurbineModels based on selectedParentModel
    const modelQuery = 'SELECT ModelID FROM Tbl_TurbineModels WHERE ModelName = ?';
    const modelResult = await dbConnection.query(modelQuery, [selectedParentModel]);

    if (modelResult.length === 0) {
      return res.status(404).json({ message: 'Model not found for the provided selectedParentModel' });
    }
    const modelID = modelResult[0].ModelID;

    // Fetch TempID from tbl_Temperature_Variant based on selectedParentVariant
    const variantQuery = 'SELECT TempID FROM tbl_Temperature_Variant WHERE TempVariant = ?';
    const variantResult = await dbConnection.query(variantQuery, [selectedParentVariant]);

    if (variantResult.length === 0) {
      return res.status(404).json({ message: 'Temperature variant not found for the provided selectedParentVariant' });
    }
    const tempID = variantResult[0].TempID;

    // Current datetime in Asia/Kolkata timezone
    const createdOn = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updatedOn = createdOn; // Since updatedOn is the same as createdOn

    // Insert a new record into the relevant table
    const insertQuery = `
      INSERT INTO Tbl_Events_Main (ModelID, EventName, ParentID, IsParent, CreatedOn, CreatedBy, UpdatedOn, UpdatedBy, IsActive, ProbabilityPercentage)
      VALUES (?, ?, 0, 1, ?, '40139', ?, '40139', 1, NULL)
    `;

    // Pass the parameters as an array to the query method
    await dbConnection.query(insertQuery, [modelID, guideName, createdOn, updatedOn]);

    console.log('Data successfully inserted into the EventTable.');

    // Respond with success
    res.status(200).json({
      message: 'Guide created successfully and data inserted into the EventTable.',
      guideName,
      modelID,
      tempID,
    });

  } catch (error) {
    console.error('Error while processing the request:', error);
    res.status(500).json({ message: 'Error creating guide', error: error.message });
  }
});

module.exports = router;
