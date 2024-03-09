// club.controller.js
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Club } = require("../../models/ClubModels/club.model");
const dataValidator = require("../../config/data.validate");
const fs = require("fs");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // Add this line
require("dotenv").config();
const nodemailer = require('nodemailer');
//
//
//
//
// NODEMAILER CONFIGURATION
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Correct SMTP server host for Gmail
    port: 587, // Common port for secure email submission
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
//
//
//
//
// BUCKET CONFIGURATION
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
//
//
//
//
// CLUB REGISTRATION
exports.registration = async (req, res) => {
    const uploadClubImage = multer({
        storage: multer.memoryStorage(),
    }).single("clubImage");

    uploadClubImage(req, res, async function (err) {
        if (err) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: { file: "File upload failed", details: err.message },
            });
        }

        const clubData = req.body;
        const clubImageFile = req.file;

        const validationResults = validateClubRegistration(clubData, clubImageFile);

        if (!validationResults.isValid) {
            // Delete uploaded image from local storage
            if (clubImageFile && clubImageFile.filename) {
                const imagePath = path.join("Files/ClubImages", clubImageFile.filename);
                fs.unlinkSync(imagePath);
            }
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: validationResults.errors,
            });
        }

        if (clubImageFile) {
            const fileName = `clubImage-${Date.now()}${path.extname(clubImageFile.originalname)}`;
            const mimeType = clubImageFile.mimetype;

            try {
                const fileLocation = await uploadFileToS3(clubImageFile, fileName, mimeType);
                clubData.clubImage = fileLocation;
            } catch (uploadError) {
                // Delete uploaded image from local storage
                if (clubImageFile && clubImageFile.filename) {
                    const imagePath = path.join("Files/ClubImages", clubImageFile.filename);
                    fs.unlinkSync(imagePath);
                }
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error",
                    error: uploadError.message,
                });
            }
        }

        try {
            const registrationResponse = await Club.registration(clubData);
            // Setup email content
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: registrationResponse.clubEmail, // Assuming email is part of the response
                subject: "Your Registration Details",
                text: `Dear ${registrationResponse.clubName},

Welcome to Our Football Club Management System!

Congratulations on successfully registering your club. With our system, you can efficiently manage all aspects of your football club's operations, from player registrations to match scheduling.

We're here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out to our team.

Thank you for choosing Our Football Club Management System. Let's work together to lead the team to success on and off the pitch!

Best regards,
[Your Name]
Admin 
Football club
`,
            };

            // Send email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending email: ", error);
                    // Optionally handle email sending error, e.g., log or notify admin
                } else {
                    console.log("Email sent: " + info.response);
                }
            });

            return res.status(200).json({
                status: "success",
                message: "Club registered successfully",
                data: registrationResponse,
            });
        } catch (error) {
            // Delete uploaded image from local storage
            if (clubImageFile && clubImageFile.filename) {
                const imagePath = path.join("Files/ClubImages", clubImageFile.filename);
                fs.unlinkSync(imagePath);
            }

            // Delete uploaded image from S3 if it exists
            if (clubData.clubImage) {
                const s3Key = clubData.clubImage.split('/').pop();
                const params = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: `clubImages/${s3Key}`
                };
                try {
                    await s3Client.send(new DeleteObjectCommand(params));
                } catch (s3Error) {
                    console.error("Error deleting image from S3:", s3Error);
                }
            }

            if (error.name === "ValidationError") {
                return res.status(422).json({
                    status: "failed",
                    message: "Validation error during registration",
                    error: error.errors,
                });
            } else {
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error during registration",
                    error: error.message,
                });
            }
        }
    });

    async function uploadFileToS3(fileBuffer, fileName, mimeType) {
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `clubImages/${fileName}`,
            Body: fileBuffer.buffer,
            ACL: "public-read",
            ContentType: mimeType,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    }

    function validateClubRegistration(clubData, clubImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };
        // Name validation
        const nameValidation = dataValidator.isValidName(clubData.clubName);
        if (!nameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubName"] = [nameValidation.message];
        }

        // Email validation
        const emailValidation = dataValidator.isValidEmail(clubData.clubEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubEmail"] = [emailValidation.message];
        }

        // Address validation
        const addressValidation = dataValidator.isValidAddress(clubData.clubAddress);
        if (!addressValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubAddress"] = [addressValidation.message];
        }

        // Manager name validation
        const managerNameValidation = dataValidator.isValidName(clubData.managerName);
        if (!managerNameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerName"] = [managerNameValidation.message];
        }

        // Manager email validation
        const managerEmailValidation = dataValidator.isValidEmail(clubData.managerEmail);
        if (!managerEmailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerEmail"] = [managerEmailValidation.message];
        }

        // Manager phone validation
        const managerMobileValidation = dataValidator.isValidMobileNumber(clubData.managerMobile);
        if (!managerMobileValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerMobile"] = [managerMobileValidation.message];
        }

        // Club password validation
        const passwordValidation = dataValidator.isValidPassword(clubData.clubPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubPassword"] = [passwordValidation.message];
        }

        // Image validation
        const imageValidation = dataValidator.isValidImageWith1MBConstraint(clubImageFile);
        if (!imageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubImage"] = [imageValidation.message];
        }



        return validationResults;
    }
};
//
//
//
//
// CLUB LOGIN
// CLUB LOGIN
exports.login = async (req, res) => {
    const { clubEmail, clubPassword } = req.body;

    function validateClubLogin() {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        // Validate email
        const emailValidation = dataValidator.isValidEmail(clubEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['clubEmail'] = [emailValidation.message];
        }

        // Validate password
        const passwordValidation = dataValidator.isValidPassword(clubPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['clubPassword'] = [passwordValidation.message];
        }

        return validationResults;
    }

    const validationResults = validateClubLogin();
    if (!validationResults.isValid) {
        return res.status(400).json({
            status: 'failed',
            message: 'Validation failed',
            results: validationResults.errors,
        });
    }

    try {
        const club = await Club.login(clubEmail, clubPassword);

        const token = jwt.sign(
            {
                clubId: club.clubId,
                clubEmail: club.clubEmail,
            },
            process.env.JWT_SECRET_KEY_CLUB,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: { token, club },
        });
    } catch (error) {
        console.error('Error during club login:', error);

        if (error.message === 'Club not found' || error.message === 'Wrong password') {
            return res.status(422).json({
                status: 'failed',
                message: 'Login failed',
                error: error.message,
            });
        }

        return res.status(500).json({
            status: 'failed',
            message: 'Internal server error',
            error: error.message,
        });
    }
};

