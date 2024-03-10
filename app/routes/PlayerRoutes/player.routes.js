//player.routes.js
const express = require('express');
const router = express.Router();
const PlayerController = require('../../controllers/PlayerControllers/player.controller');


router.post("/playerRegistration", PlayerController.registration);
router.post("/playerLogin", PlayerController.login);
router.post("/playerViewAllClubs", PlayerController.viewAllClubs);




module.exports = router;