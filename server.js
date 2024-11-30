// server.js
const express = require('express');
const morgan = require('morgan');  // Import morgan
const app = express();
const port = process.env.PORT || 3001;

// Middleware to log HTTP requests
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Import routes
const api1 = require('./apis/login2');
const api2 = require('./apis/checkAdmin');
const api3 = require('./apis/fetch_event_causes_actions');
const api4 = require('./apis/fetch_cause_from_top_cause');
const api5 = require('./apis/fetch_sub_cause_based_on_cause');

/* user side scripts */

const api6 = require('./apis/fetch_events_for_fm');




// Use routes with a dynamic router prefix
app.use('/api/login2', api1);
app.use('/api/checkAdmin', api2);
app.use('/api/fetch_event_causes_actions', api3);
app.use('/api/fetch_cause_from_top_cause', api4);
app.use('/api/fetch_sub_cause_based_on_cause', api5);

/* user side scripts */

app.use('/api/fetch_events_for_fm', api6);



app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
  