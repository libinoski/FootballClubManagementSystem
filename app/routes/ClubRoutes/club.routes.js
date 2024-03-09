
//admin.routes.js
const express = require('express');
const router = express.Router();
const ClubController = require('../../controllers/ClubControllers/club.controller');


router.post("/clubRegistration", ClubController.registration);
router.post("/clubLogin", ClubController.login);




module.exports = router;