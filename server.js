const express = require('express');
const morgan = require('morgan');  // Import morgan
const app = express();
const port = process.env.PORT || 3001;

// Middleware to log HTTP requests
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Middleware to parse JSON bodies
app.use(express.json());

// Define API routes dynamically
const routes = {
    login2: require('./apis/login2'),
    checkAdmin: require('./apis/checkAdmin'),
    fetch_event_causes_actions: require('./apis/fetch_event_causes_actions'),
    fetch_cause_from_top_cause: require('./apis/fetch_cause_from_top_cause'),
    fetch_sub_cause_based_on_cause: require('./apis/fetch_sub_cause_based_on_cause'),
    fetch_events_for_fm: require('./apis/fetch_events_for_fm'),
    fetch_question_data_based_on_event: require('./apis/fetch_question_data_based_on_event'),
    fetch_consecutive_question_for_event: require('./apis/fetch_consecutive_question_for_event'),
    fetch_turbine_data: require('./apis/fetch_turbine_data'),
    fetch_fm_data: require('./apis/fetch_fm_data'),
    fetch_image_and_explanation_for_action: require('./apis/fetch_image_and_explanation_for_action'),
    fetch_turbine_model_and_temperature_variant: require('./apis/fetch_turbine_model_and_temperature_variant'),
    dummy_fetch: require('./apis/dummy_fetch'),
    fetch_question_for_events: require('./apis/fetch_question_for_events'),
    fetch_subquestion_for_event: require('./apis/fetch_subquestion_for_event'),
    fetch_hovering_items_for_topcause: require('./apis/fetch_hovering_items_for_topcause'),
    fetch_action_explanation: require('./apis/fetch_action_explanation'),
    fetch_main_table_data: require('./apis/fetch_main_table_data'),
    performed_steps_question_fetch: require('./apis/performed_steps_question_fetch'),
    pause_session: require('./apis/pause_session'),
    fetch_resume_data: require('./apis/fetch_resume_data'),
    fetch_internal_turbine_model_and_temperature_variant: require('./apis/fetch_internal_turbine_model_and_temperature_variant'),
    create_dynamic_guide: require('./apis/create_dynamic_guide'),
    'submit-causes': require('./apis/submit-causes'),
    edited_top_cause_data: require('./apis/edited_top_cause_data'),
    sub_cause_edited_data: require('./apis/sub_cause_edited_data'),
    sub_cause_creation_data: require('./apis/sub_cause_creation_data'),
    nested_sub_cause_creation_data: require('./apis/nested_sub_cause_creation_data'),
    topcause_data_change: require('./apis/topcause_data_change'),
    cause_data_change: require('./apis/cause_data_change'),
    nested_subcause_data_change: require('./apis/nested_subcause_data_change'),
    nested_subcause_edited_data: require('./apis/nested_subcause_edited_data'),
    deleted_top_cause: require('./apis/deleted_top_cause'),
    deleted_cause: require('./apis/deleted_cause'),
    deleted_subcause: require('./apis/deleted_subcause'),
    match_actions_causes: require('./apis/match_actions_causes'),
    add_new_action: require('./apis/add_new_action'),
    edit_action_data: require('./apis/edit_action_data'),
    fetch_hovering_data_for_action: require('./apis/fetch_hovering_data_for_action'),
    fetch_preview_data: require('./apis/fetch_preview_data'),
    add_new_question: require('./apis/add_new_question'),
    add_answer: require('./apis/add_answer'),
    handle_edit_click: require('./apis/handle_edit_click'),
    handle_edit_answer_click: require('./apis/handle_edit_answer_click'),
    delete_question_for_model: require('./apis/delete_question_for_model'),
    delete_answer_for_question: require('./apis/delete_answer_for_question'),
    delete_action_for_model: require('./apis/delete_action_for_model'),
    'update-modal-name': require('./apis/update-modal-name'),  // Properly formatted route key
    link_question_with_cause: require('./apis/link_question_with_cause'),
};

// Dynamically register routes
Object.entries(routes).forEach(([route, handler]) => {
    app.use(`/api/${route}`, handler);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});