
//admin.routes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/AdminControllers/admin.controller');


router.post("/adminRegistration", AdminController.register);
router.post("/", AdminController.register);




module.exports = router;