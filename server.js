//server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const AdminRoutes = require('./app/routes/AdminRoutes/admin.routes');

const corsOptions = {
  origin: '*', 
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/admin', AdminRoutes);


app.listen(4040, '0.0.0.0', () => {
  console.log("\x1b[31mOk\x1b[0m \x1b[32mlet's\x1b[0m \x1b[33mgo\x1b[0m \x1b[34mto\x1b[0m \x1b[35mPostman\x1b[0m \x1b[36m(1313)\x1b[0m");   
});
