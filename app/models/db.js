//db.js

const mysql = require('mysql');
const dbConfig = require('../config/db.config');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'MedInsCareDB',
});

module.exports = connection;