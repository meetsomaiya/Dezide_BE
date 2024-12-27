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
const api7 = require('./apis/fetch_question_data_based_on_event');
const api8 = require('./apis/fetch_consecutive_question_for_event');

/* user side scripts pt 2 */

const api9 = require('./apis/fetch_turbine_data');

const api10 = require('./apis/fetch_fm_data');

const api11 = require('./apis/fetch_image_and_explanation_for_action');

const api12 = require('./apis/fetch_turbine_model_and_temperature_variant');

const api13 = require('./apis/dummy_fetch');

const api14 = require('./apis/fetch_question_for_events');

const api15 = require('./apis/fetch_subquestion_for_event');

const api16 = require('./apis/fetch_hovering_items_for_topcause');

const api17 = require('./apis/fetch_action_explanation');


/* admin side scripts pt 2 */

const api18 = require('./apis/fetch_main_table_data');

/* user side scripts pt 3 */

const api19 = require('./apis/performed_steps_question_fetch');

const api20 = require('./apis/pause_session');

const api21 = require('./apis/fetch_resume_data');

/* admin side scripts pt 4 */

const api22 = require('./apis/fetch_internal_turbine_model_and_temperature_variant');

const api23 = require('./apis/create_dynamic_guide');

const api24 = require('./apis/submit-causes');

const api25 = require('./apis/edited_top_cause_data');

const api26 = require('./apis/sub_cause_edited_data');

const api27 = require('./apis/sub_cause_creation_data');

const api28 = require('./apis/nested_sub_cause_creation_data');

const api29 = require('./apis/topcause_data_change');

const api30 = require('./apis/cause_data_change');

const api31 = require('./apis/nested_subcause_data_change');








// Use routes with a dynamic router prefix
app.use('/api/login2', api1);
app.use('/api/checkAdmin', api2);
app.use('/api/fetch_event_causes_actions', api3);
app.use('/api/fetch_cause_from_top_cause', api4);
app.use('/api/fetch_sub_cause_based_on_cause', api5);

/* user side scripts */

app.use('/api/fetch_events_for_fm', api6);
app.use('/api/fetch_question_data_based_on_event', api7);
app.use('/api/fetch_consecutive_question_for_event', api8);

/* user side scripts pt 2 */

app.use('/api/fetch_turbine_data', api9);
app.use('/api/fetch_fm_data', api10);

app.use('/api/fetch_image_and_explanation_for_action', api11);

app.use('/api/fetch_turbine_model_and_temperature_variant', api12);

app.use('/api/dummy_fetch', api13);

app.use('/api/fetch_question_for_events', api14);

app.use('/api/fetch_subquestion_for_event', api15);

app.use('/api/fetch_hovering_items_for_topcause', api16);

app.use('/api/fetch_action_explanation', api17);


/* admin side scripts pt 2 */

app.use('/api/fetch_main_table_data', api18);

/* user side scripts pt 3 */

app.use('/api/performed_steps_question_fetch', api19);

app.use('/api/pause_session', api20);

app.use('/api/fetch_resume_data', api21);

app.use('/api/fetch_internal_turbine_model_and_temperature_variant', api22);

app.use('/api/create_dynamic_guide', api23);

app.use('/api/submit-causes', api24);

app.use('/api/edited_top_cause_data', api25);

app.use('/api/sub_cause_edited_data', api26);

app.use('/api/sub_cause_creation_data', api27);

app.use('/api/nested_sub_cause_creation_data', api28);


app.use('/api/topcause_data_change', api29);

app.use('/api/cause_data_change', api30);

app.use('/api/nested_subcause_data_change', api31);




app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
  