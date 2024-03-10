// player.controller.js
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Player } = require("../../models/PlayerModel/player.model");
const dataValidator = require("../../config/data.validate");
const fs = require("fs");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // Add this line
require("dotenv").config();
const nodemailer = require('nodemailer');
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
// PLAYER VIEW ALL CLUBS
exports.viewAllClubs = async (req, res) => {
    try {
        const allClubData = await Player.viewAllClubs();

        return res.status(200).json({
            status: "success",
            message: "All clubs are retrieved successfully",
            data: allClubData,
        });
    } catch (error) {
        console.error("Error viewing all clubs:", error);
        if (error.message === "No clubs found") {
            return res.status(422).json({
                status: "failed",
                message: "No clubs found"
            });
        } else {
            return res.status(500).json({
                status: "error",
                message: "Internal server error"
            });
        }
    }
};
//
//
//
//
// PLAYER REGISTRATION
exports.registration = async (req, res) => {
    const uploadPlayerImage = multer({
        storage: multer.memoryStorage(),
    }).single("playerImage");

    uploadPlayerImage(req, res, async function (err) {
        if (err) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: { file: "File upload failed", details: err.message },
            });
        }

        const playerData = req.body;
        const playerImageFile = req.files['playerImage'] ? req.files['playerImage'][0] : null;
        const clubId = req.body.clubId;

        // Check if clubId is missing
        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Select a club to continue"
            });
        }

        // Validating player registration data
        const validationResults = validatePlayerRegistration(playerData, playerImageFile);

        if (!validationResults.isValid) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: validationResults.errors,
            });
        }

        if (playerImageFile) {
            // Uploading player image to S3
            try {
                const fileLocation = await uploadFileToS3(playerImageFile.buffer, playerData.playerName);
                playerData.playerImage = fileLocation;
            } catch (uploadError) {
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error",
                    error: uploadError.message,
                });
            }
        }

        try {
            const registrationResponse = await Player.registration(playerData, clubId);

            // Sending registration confirmation email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: registrationResponse.playerEmail,
                subject: "Your Registration Details",
                text: `Dear ${registrationResponse.playerName},

Welcome to our Sports Club!

Congratulations on successfully registering. We're thrilled to have you on board and look forward to your participation in upcoming events.

Best regards,
Your Sports Club Team
`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending email: ", error);
                } else {
                    console.log("Email sent: " + info.response);
                }
            });

            return res.status(200).json({
                status: "success",
                message: "Player registered successfully",
                data: registrationResponse,
            });
        } catch (error) {
            // Handling errors
            if (playerData.playerImage) {
                // Deleting uploaded image from S3 in case of error
                const s3Key = playerData.playerImage.split('/').pop();
                const params = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: `playerImages/${s3Key}`
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
    
    async function uploadFileToS3(fileBuffer, fileName) {
        const mimeType = fileBuffer.mimetype;
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `playerImages/${fileName}-${Date.now()}.${mimeType.split('/')[1]}`,
            Body: fileBuffer,
            ACL: "public-read",
            ContentType: mimeType,
        };
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    }

    function validatePlayerRegistration(playerData, playerImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        // Name validation
        const nameValidation = dataValidator.isValidName(playerData.playerName);
        if (!nameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerName"] = [nameValidation.message];
        }

        // Email validation
        const emailValidation = dataValidator.isValidEmail(playerData.playerEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerEmail"] = [emailValidation.message];
        }

        // Mobile validation
        const mobileValidation = dataValidator.isValidMobileNumber(playerData.playerMobile);
        if (!mobileValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerMobile"] = [mobileValidation.message];
        }

        // Image validation
        const imageValidation = dataValidator.isValidImageWith1MBConstraint(playerImageFile);
        if (!imageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerImage"] = [imageValidation.message];
        }

        // Address validation
        const addressValidation = dataValidator.isValidAddress(playerData.playerAddress);
        if (!addressValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerAddress"] = [addressValidation.message];
        }

        // Age validation
        const ageValidation = dataValidator.isValidAge(playerData.playerAge);
        if (!ageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerAge"] = [ageValidation.message];
        }

        // Position validation
        const positionValidation = dataValidator.isValidText(playerData.playerPosition);
        if (!positionValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerPosition"] = [positionValidation.message];
        }

        // Country validation
        const countryValidation = dataValidator.isValidText(playerData.playerCountry);
        if (!countryValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerCountry"] = [countryValidation.message];
        }

        // Password validation
        const passwordValidation = dataValidator.isValidPassword(playerData.playerPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["playerPassword"] = [passwordValidation.message];
        }

        return validationResults;
    }
};
//
//
//
//
// PLAYER LOGIN
exports.login = async (req, res) => {
    const { playerEmail, playerPassword } = req.body;

    function validatePlayerLogin() {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        // Validate email
        const emailValidation = dataValidator.isValidEmail(playerEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['playerEmail'] = [emailValidation.message];
        }

        // Validate password
        const passwordValidation = dataValidator.isValidPassword(playerPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['playerPassword'] = [passwordValidation.message];
        }

        return validationResults;
    }

    const validationResults = validatePlayerLogin();
    if (!validationResults.isValid) {
        return res.status(400).json({
            status: 'failed',
            message: 'Validation failed',
            results: validationResults.errors,
        });
    }

    try {
        const player = await Player.login(playerEmail, playerPassword);

        const token = jwt.sign(
            {
                playerId: player.playerId,
                playerEmail: player.playerEmail,
            },
            process.env.JWT_SECRET_KEY_PLAYER,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: { token, player },
        });
    } catch (error) {
        console.error('Error during player login:', error);

        if (error.message === 'player not found' || error.message === 'Wrong password') {
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
//
//
//
//
//