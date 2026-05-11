const cors = require('cors');
const express = require('express');

const { expressCorsOptions } = require('./config/cors');

const app = express();

app.use(cors(expressCorsOptions));
app.use(express.json());

module.exports = app;
