
//admin.routes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/AdminControllers/admin.controller');


router.post("/adminRegistration", AdminController.registration);
router.post("/adminLogin", AdminController.login);
router.post("/adminChangePassword", AdminController.changePassword);
router.post("/adminViewProfile", AdminController.viewProfile);
router.post("/adminUpdateProfile", AdminController.updateProfile);
router.post("/adminAddNews", AdminController.addNews);
router.post("/adminViewAllNews", AdminController.viewAllNews);
router.post("/adminViewOneNews", AdminController.viewOneNews);
router.post("/adminAddMatch", AdminController.addMatch);
router.post("/adminViewAllMatches", AdminController.viewAllMatches);
router.post("/adminViewOneMatch", AdminController.viewOneMatch);
router.post("/adminEndOneMatch", AdminController.endOneMatch);
router.post("/adminAllEndedMatches", AdminController.viewAllEndedMatches);
router.post("/adminViewOneEndedMatch", AdminController.viewOneEndedMatch);
router.post("/adminAddMatchPoint", AdminController.addMatchPoint);
router.post("/adminViewAllMatchPoints", AdminController.viewAllMatchPoints);




module.exports = router;