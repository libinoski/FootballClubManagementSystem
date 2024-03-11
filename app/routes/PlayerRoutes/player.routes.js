//player.routes.js
const express = require('express');
const router = express.Router();
const PlayerController = require('../../controllers/PlayerControllers/player.controller');


router.post("/playerRegistration", PlayerController.registration);
router.post("/playerLogin", PlayerController.login);
router.post("/playerViewAllClubs", PlayerController.viewAllClubs);
router.post("/playerChangePassword", PlayerController.changePassword);
router.post("/playerViewProfile", PlayerController.viewProfile);
router.post("/playerUpdateProfile", PlayerController.updateProfile);
router.post("/playerViewAllNotifications", PlayerController.viewAllNotifications);
router.post("/playerViewOneNotification", PlayerController.viewOneNotification);
router.post("/playerSendLeaveRequestToClub", PlayerController.sendLeaveRequestToClub);
router.post("/playerViewAllApprovedLeaveRequests", PlayerController.viewAllApprovedLeaveRequests);



module.exports = router;