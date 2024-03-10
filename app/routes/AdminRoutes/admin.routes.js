
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




module.exports = router;