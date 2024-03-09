
//admin.routes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/AdminControllers/admin.controller');


router.post("/adminRegistration", AdminController.registration);
router.post("/adminLogin", AdminController.login);




module.exports = router;