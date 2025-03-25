const express = require('express');
const fs = require('fs'); // For file operations
const path = require('path'); // For handling file paths
const moment = require('moment-timezone'); // For working with timezones
const { connectToDatabase } = require('./connect2.js'); // Import the ODBC connection function
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

// Define the path to the JSON file
const dataFilePath = path.join(__dirname, 'data_retrieved_for_updation_question.json');

// Function to ensure the file exists
const ensureFileExists = (filePath, callback) => {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist, create it with an empty array
      fs.writeFile(filePath, JSON.stringify([]), 'utf8', (writeErr) => {
        if (writeErr) {
          return callback(writeErr);
        }
        callback(null); // File created successfully
      });
    } else {
      callback(null); // File already exists
    }
  });
};

// Route to handle the edit click
router.post('/', async (req, res) => {
  const { previousValue, newValue, field, modalName } = req.body;

  // Log the incoming request parameters
  console.log('\nReceived request with parameters:');
  console.log(`- modalName: ${modalName}`);
  console.log(`- field: ${field}`);
  console.log(`- previousValue: ${previousValue}`);
  console.log(`- newValue: ${newValue}`);

  try {
    // Step 1: Get EventID from Tbl_Events_Main based on modalName
    const eventQuery = `SELECT [EventID] FROM [Dezide_UAT].[dbo].[Tbl_Events_Main] WHERE EventName = '${modalName}'`;
    
    console.log('\nExecuting Event Query:');
    console.log(`Query: ${eventQuery}`);
    console.log(`Purpose: Find EventID for event named '${modalName}'`);

    const connection = await connectToDatabase(); // Establish ODBC connection
    const eventResult = await connection.query(eventQuery);

    if (eventResult.length === 0) {
      await connection.close(); // Close the connection
      console.log('\nEvent not found in database');
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventID = eventResult[0].EventID;
    console.log(`Found EventID: ${eventID}`);

    // Step 2: Query Tbl_Questions based on the field and previousValue
    let questionQuery;
    switch (field) {
      case 'name':
        questionQuery = `SELECT [QuestionID] FROM [Dezide_UAT].[dbo].[Tbl_Questions] WHERE EventID = '${eventID}' AND QuestionName = '${previousValue}'`;
        break;
      case 'time':
        questionQuery = `SELECT [QuestionID] FROM [Dezide_UAT].[dbo].[Tbl_Questions] WHERE EventID = '${eventID}' AND QuestionTime = '${previousValue}'`;
        break;
      case 'cost':
        questionQuery = `SELECT [QuestionID] FROM [Dezide_UAT].[dbo].[Tbl_Questions] WHERE EventID = '${eventID}' AND QuestionCost = '${previousValue}'`;
        break;
      default:
        await connection.close(); // Close the connection
        console.log('\nInvalid field specified');
        return res.status(400).json({ error: 'Invalid field specified' });
    }

    console.log('\nExecuting Question Query:');
    console.log(`Query: ${questionQuery}`);
    console.log(`Purpose: Find QuestionID for ${field} with value '${previousValue}' in event ${eventID}`);

    const questionResult = await connection.query(questionQuery);

    if (questionResult.length === 0) {
      await connection.close(); // Close the connection
      console.log('\nQuestion not found in database');
      return res.status(404).json({ error: 'Question not found' });
    }

    const questionID = questionResult[0].QuestionID;
    console.log(`Found QuestionID: ${questionID}`);

    // Step 3: Update the relevant field in Tbl_Questions
    let updateQuery;
    switch (field) {
      case 'name':
        updateQuery = `UPDATE [Dezide_UAT].[dbo].[Tbl_Questions] SET QuestionName = '${newValue}' WHERE QuestionID = '${questionID}'`;
        break;
      case 'time':
        updateQuery = `UPDATE [Dezide_UAT].[dbo].[Tbl_Questions] SET QuestionTime = '${newValue}' WHERE QuestionID = '${questionID}'`;
        break;
      case 'cost':
        updateQuery = `UPDATE [Dezide_UAT].[dbo].[Tbl_Questions] SET QuestionCost = '${newValue}' WHERE QuestionID = '${questionID}'`;
        break;
      default:
        await connection.close(); // Close the connection
        console.log('\nInvalid field specified');
        return res.status(400).json({ error: 'Invalid field specified' });
    }

    console.log('\nExecuting Update Query:');
    console.log(`Query: ${updateQuery}`);
    console.log(`Purpose: Update ${field} from '${previousValue}' to '${newValue}' for QuestionID ${questionID}`);

    await connection.query(updateQuery);
    console.log('Update successful');

    // Step 4: Save the data to the JSON file
    const dataToSave = {
      previousValue,
      newValue,
      field,
      modalName,
      timestamp: moment().tz('America/New_York').format(), // Add a timestamp
    };

    console.log('\nSaving to JSON file:');
    console.log('Data being saved:', JSON.stringify(dataToSave, null, 2));

    ensureFileExists(dataFilePath, (err) => {
      if (err) {
        console.error('Error ensuring file exists:', err);
        return res.status(500).json({ error: 'Failed to create data file' });
      }

      // Read the existing data from the JSON file
      fs.readFile(dataFilePath, 'utf8', (err, fileData) => {
        if (err) {
          console.error('Error reading file:', err);
          return res.status(500).json({ error: 'Failed to read data file' });
        }

        let jsonData = [];
        if (fileData) {
          try {
            jsonData = JSON.parse(fileData); // Parse existing data
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            return res.status(500).json({ error: 'Failed to parse existing data' });
          }
        }

        // Add the new data to the array
        jsonData.push(dataToSave);

        // Write the updated data back to the JSON file
        fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
            console.error('Error writing file:', writeErr);
            return res.status(500).json({ error: 'Failed to write data to file' });
          }

          console.log('Data successfully written to JSON file');
          // Send a success response
          res.json({ message: 'Data saved and updated successfully', data: dataToSave });
        });
      });
    });

    // Close the connection
    await connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('\nError processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;