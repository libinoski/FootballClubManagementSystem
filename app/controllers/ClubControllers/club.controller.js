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
    }).fields([{ name: 'clubImage' }, { name: 'managerImage' }]);

    uploadClubImage(req, res, async function (err) {
        if (err) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: { file: "File upload failed", details: err.message },
            });
        }

        const clubData = req.body;
        const clubImageFile = req.files['clubImage'] ? req.files['clubImage'][0] : null;
        const managerImageFile = req.files['managerImage'] ? req.files['managerImage'][0] : null;

        const validationResults = validateClubRegistration(clubData, clubImageFile, managerImageFile);

        if (!validationResults.isValid) {
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
                const fileLocation = await uploadFileToS3(clubImageFile.buffer, fileName, mimeType);
                clubData.clubImage = fileLocation;
            } catch (uploadError) {
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error",
                    error: uploadError.message,
                });
            }
        }

        if (managerImageFile) {
            const fileName = `managerImage-${Date.now()}${path.extname(managerImageFile.originalname)}`;
            const mimeType = managerImageFile.mimetype;

            try {
                const fileLocation = await uploadFileToS3(managerImageFile.buffer, fileName, mimeType);
                clubData.managerImage = fileLocation;
            } catch (uploadError) {
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error",
                    error: uploadError.message,
                });
            }
        }

        try {
            const registrationResponse = await Club.registration(clubData);
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: registrationResponse.clubEmail,
                subject: "Your Registration Details",
                text: `Dear ${registrationResponse.clubName},

Welcome to Our Football Club Management System!

Congratulations on successfully registering your club. With our system, you can efficiently manage all aspects of your football club's operations, from player registrations to match scheduling.

We're here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out to our team.

Thank you for choosing Our Football Club Management System. Let's work together to lead the team to success on and off the pitch!

Best regards,
Ajay Kumar MA
Admin 
Football club
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
                message: "Club registered successfully",
                data: registrationResponse,
            });
        } catch (error) {
            if (error.name === "ValidationError") {
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

                if (clubData.managerImage) {
                    const s3Key = clubData.managerImage.split('/').pop();
                    const params = {
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: `managerImages/${s3Key}`
                    };
                    try {
                        await s3Client.send(new DeleteObjectCommand(params));
                    } catch (s3Error) {
                        console.error("Error deleting image from S3:", s3Error);
                    }
                }
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
            Body: fileBuffer,
            ACL: "public-read",
            ContentType: mimeType,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    }

    function validateClubRegistration(clubData, clubImageFile, managerImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        const nameValidation = dataValidator.isValidName(clubData.clubName);
        if (!nameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubName"] = [nameValidation.message];
        }

        const emailValidation = dataValidator.isValidEmail(clubData.clubEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubEmail"] = [emailValidation.message];
        }

        const addressValidation = dataValidator.isValidAddress(clubData.clubAddress);
        if (!addressValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubAddress"] = [addressValidation.message];
        }

        const managerNameValidation = dataValidator.isValidName(clubData.managerName);
        if (!managerNameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerName"] = [managerNameValidation.message];
        }

        const managerEmailValidation = dataValidator.isValidEmail(clubData.managerEmail);
        if (!managerEmailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerEmail"] = [managerEmailValidation.message];
        }

        const managerMobileValidation = dataValidator.isValidMobileNumber(clubData.managerMobile);
        if (!managerMobileValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerMobile"] = [managerMobileValidation.message];
        }

        const passwordValidation = dataValidator.isValidPassword(clubData.clubPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubPassword"] = [passwordValidation.message];
        }

        const clubImageValidation = dataValidator.isValidImageWith1MBConstraint(clubImageFile);
        if (!clubImageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["clubImage"] = [clubImageValidation.message];
        }
        const managerImageValidation = dataValidator.isValidImageWith1MBConstraint(managerImageFile);
        if (!managerImageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["managerImage"] = [managerImageValidation.message];
        }

        return validationResults;
    }
};
//
//
//
//
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
//
//
//
//
// CLUB CHANGE PASSWORD
exports.changePassword = async (req, res) => {
    const token = req.headers.token;
    const { clubId, oldPassword, newPassword } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "Club ID is missing"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_CLUB,
        async (err, decoded) => {
            if (err) {
                if (err.name === "JsonWebTokenError") {
                    return res.status(403).json({
                        status: "failed",
                        message: "Invalid token"
                    });
                } else if (err.name === "TokenExpiredError") {
                    return res.status(403).json({
                        status: "failed",
                        message: "Token has expired"
                    });
                }
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            try {
                function validateClubChangePassword() {
                    const validationResults = {
                        isValid: true,
                        errors: {},
                    };

                    // Validate old password
                    const passwordValidation = dataValidator.isValidPassword(oldPassword);
                    if (!passwordValidation.isValid) {
                        validationResults.isValid = false;
                        validationResults.errors["oldPassword"] = [passwordValidation.message];
                    }

                    // Validate new password
                    const newPasswordValidation = dataValidator.isValidPassword(newPassword);
                    if (!newPasswordValidation.isValid) {
                        validationResults.isValid = false;
                        validationResults.errors["newPassword"] = [newPasswordValidation.message];
                    }

                    return validationResults;
                }

                const validationResults = validateClubChangePassword();
                if (!validationResults.isValid) {
                    return res.status(400).json({
                        status: "failed",
                        message: "Validation failed",
                        results: validationResults.errors
                    });
                }

                await Club.changePassword(clubId, oldPassword, newPassword);
                return res.status(200).json({
                    status: "success",
                    message: "Password changed successfully"
                });
            } catch (error) {
                if (
                    error.message === "Club not found" ||
                    error.message === "Incorrect old password"
                ) {
                    return res.status(422).json({
                        status: "failed",
                        message: "Password change failed",
                        error: error.message
                    });
                } else {
                    console.error("Error changing club password:", error);
                    return res.status(500).json({
                        status: "failed",
                        message: "Internal server error",
                        error: error.message
                    });
                }
            }
        }
    );
};
//
//
//
//
// CLUB VIEW PROFILE
exports.viewProfile = async (req, res) => {
    const token = req.headers.token;
    const { clubId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "Club ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Invalid token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Token has expired"
                        });
                    }
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                if (decoded.clubId != clubId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch club profile
                try {
                    const result = await Club.viewProfile(clubId);
                    return res.status(200).json({
                        status: "success",
                        data: result
                    });
                } catch (error) {
                    if (error.message === "Club not found") {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error fetching club profile:", error);
                        return res.status(500).json({
                            status: "error",
                            message: "Internal server error",
                            error: error.message,
                        });
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// CLUB UPDATE PROFILE
exports.updateProfile = async (req, res) => {
    const token = req.headers.token;
    const {
        clubId,
        clubName,
        clubMobile,
        clubAddress,
        managerName,
    } = req.body;

    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "Club ID is missing"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_CLUB,
        async (err, decoded) => {
            if (err) {
                if (err.name === "JsonWebTokenError") {
                    return res.status(403).json({
                        status: "failed",
                        message: "Invalid token"
                    });
                } else if (err.name === "TokenExpiredError") {
                    return res.status(403).json({
                        status: "failed",
                        message: "Token has expired"
                    });
                }
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            // Remove spaces from Aadhar number and mobile number
            const updatedClub = {
                clubId,
                clubName,
                clubMobile: clubMobile.replace(/\s/g, ''),
                clubAddress,
                managerName,
            };

            function validateClubUpdateProfile() {
                const validationResults = {
                    isValid: true,
                    errors: {},
                };

                const nameValidation = dataValidator.isValidName(clubName);
                if (!nameValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["clubName"] = [nameValidation.message];
                }


                const mobileValidation =
                    dataValidator.isValidMobileNumber(updatedClub.clubMobile);
                if (!mobileValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["clubMobile"] = [
                        mobileValidation.message,
                    ];
                }

                const addressValidation = dataValidator.isValidAddress(clubAddress);
                if (!addressValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["clubAddress"] = [
                        addressValidation.message,
                    ];
                }

                const managerNameValidation = dataValidator.isValidName(managerName);
                if (!managerNameValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["managerName"] = [managerNameValidation.message];
                }



                return validationResults;
            }

            const validationResults = validateClubUpdateProfile();

            if (!validationResults.isValid) {
                return res.status(400).json({
                    status: "failed",
                    message: "Validation failed",
                    results: validationResults.errors,
                });
            }

            try {
                const updatedData = await Club.updateProfile(updatedClub);
                return res.status(200).json({
                    status: "success",
                    message: "Club updated successfully",
                    data: updatedData,
                });
            } catch (error) {
                console.error("Error updating club profile:", error);
                if (
                    error.message === "Club not found" ||
                    error.message === "Aadhar Number Already Exists."
                ) {
                    return res.status(422).json({
                        status: "error",
                        error: error.message
                    });
                } else if (
                    error.message === "Error fetching updated club details."
                ) {
                    return res.status(500).json({
                        status: "failed",
                        message: error.message
                    });
                } else {
                    return res.status(500).json({
                        status: "failed",
                        message: "Internal server error",
                        error: error.message,
                    });
                }
            }
        }
    );
};
//
//
//
//
// CLUB VIEW ALL UNAPPROVED PLAYERS
exports.viewAllUnapprovedPlayers = async (req, res) => {
    const token = req.headers.token;
    const { clubId } = req.body;

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "club ID is missing"
        });
    }

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Verifying the token
    jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
        if (err) {
            if (err.name === "JsonWebTokenError") {
                return res.status(403).json({
                    status: "error",
                    message: "Invalid token"
                });
            } else if (err.name === "TokenExpiredError") {
                return res.status(403).json({
                    status: "error",
                    message: "Token has expired"
                });
            } else {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }
        }

        try {
            // Check if decoded token matches clubId from request body
            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Retrieve all unapproved players for the club
            const unapprovedPlayers = await Club.viewAllUnapprovedPlayers(clubId);
            return res.status(200).json({
                status: "success",
                message: "All unapproved players retrieved successfully",
                data: unapprovedPlayers
            });
        } catch (error) {
            console.error("Error viewing all unapproved players:", error);

            if (error.message === "Club not found") {
                return res.status(422).json({
                    status: "error",
                    error: error.message
                });
            }

            return res.status(500).json({
                status: "error",
                message: "Internal server error",
                error: error.message,
            });
        }
    });
};
//
//
//
//
// CLUB VIEW ONE UNAPPROVED PLAYER
exports.viewOneUnapprovedPlayer = async (req, res) => {
    const token = req.headers.token;
    const { clubId, playerId } = req.body;

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "clubId is missing"
        });
    }

    // Check if player is missing
    if (!playerId) {
        return res.status(401).json({
            status: "failed",
            message: "playerId is missing"
        });
    }

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Verifying the token
    jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
        if (err) {
            if (err.name === "JsonWebTokenError") {
                return res.status(403).json({
                    status: "error",
                    message: "Invalid token"
                });
            } else if (err.name === "TokenExpiredError") {
                return res.status(403).json({
                    status: "error",
                    message: "Token has expired"
                });
            } else {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }
        }

        try {
            // Check if decoded token matches clubId from request body
            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Retrieve details of one unapproved player
            const unapprovedPlayer = await Club.viewOneUnapprovedPlayer(clubId, playerId);
            return res.status(200).json({
                status: "success",
                message: "Unapproved player details retrieved successfully",
                data: unapprovedPlayer
            });
        } catch (error) {
            console.error("Error viewing one unapproved player:", error);

            if (error.message === "Unapproved player not found or already approved" || error.message === "Club not found") {
                return res.status(422).json({
                    status: "error",
                    error: error.message
                });
            }

            return res.status(500).json({
                status: "error",
                message: "Internal server error",
                error: error.message,
            });
        }
    });
};
//
//
//
//
// CLUB APPROVE ONE PLAYER
exports.approveOnePlayer = async (req, res) => {
    const token = req.headers.token;
    const { clubId, playerId } = req.body;

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "clubId is missing"
        });
    }

    // Check if playerId is missing
    if (!playerId) {
        return res.status(401).json({
            status: "failed",
            message: "player ID is missing"
        });
    }

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Verifying the token
    jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
        if (err) {
            if (err.name === "JsonWebTokenError") {
                return res.status(403).json({
                    status: "error",
                    message: "Invalid token"
                });
            } else if (err.name === "TokenExpiredError") {
                return res.status(403).json({
                    status: "error",
                    message: "Token has expired"
                });
            } else {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }
        }

        try {
            // Check if decoded token matches clubId from request body
            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Call the model function to approve the player
            const approvedPlayerId = await Club.approveOnePlayer(clubId, playerId);

            return res.status(200).json({
                status: "success",
                message: "player approved successfully",
                data: { playerId: approvedPlayerId }
            });
        } catch (error) {
            console.error("Error approving player:", error);

            if (error.message === "player not found or already approved" || error.message === "club not found") {
                return res.status(422).json({
                    status: "error",
                    error: error.message
                });
            }

            return res.status(500).json({
                status: "error",
                message: "Internal server error",
                error: error.message,
            });
        }
    });
};
//
//
//
//
// CLUB VIEW ALL PLAYERS
exports.viewAllPlayers = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if clubId is missing
        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Club ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Invalid token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Token has expired"
                        });
                    } else {
                        return res.status(403).json({
                            status: "failed",
                            message: "Unauthorized access"
                        });
                    }
                }

                try {
                    // Check if decoded token matches clubId from request body
                    if (decoded.clubId != clubId) {
                        return res.status(403).json({
                            status: "error",
                            message: "Unauthorized access"
                        });
                    }

                    const allPlayers = await Club.viewAllPlayers(clubId);
                    return res.status(200).json({
                        status: "success",
                        message: "All players retrieved successfully",
                        data: allPlayers,
                    });
                } catch (error) {
                    console.error("Error viewing all players:", error);

                    if (error.message === "Club not found") {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    }

                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error",
                        error: error.message,
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error during viewAllPlayers:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// CLUB VIEW ONE PLAYER
exports.viewOnePlayer = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId, playerId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if clubId is missing
        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Club ID is missing"
            });
        }

        // Check if playerId is missing
        if (!playerId) {
            return res.status(401).json({
                status: "failed",
                message: "Player ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Invalid token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Token has expired"
                        });
                    } else {
                        return res.status(403).json({
                            status: "failed",
                            message: "Unauthorized access"
                        });
                    }
                }

                try {
                    // Check if decoded token matches clubId from request body
                    if (decoded.clubId != clubId) {
                        return res.status(403).json({
                            status: "error",
                            message: "Unauthorized access"
                        });
                    }

                    const playerData = await Club.viewOnePlayer(
                        clubId,
                        playerId
                    );
                    return res.status(200).json({
                        status: "success",
                        message: "Player retrieved successfully",
                        data: playerData,
                    });
                } catch (error) {
                    console.error("Error viewing one player:", error);
                    if (
                        error.message === "Player not found for this club" ||
                        error.message === "Club not found"
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        return res.status(500).json({
                            status: "error",
                            message: "Internal server error",
                            error: error.message,
                        });
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error during viewOnePlayer:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// DELETE ONE PLAYER
exports.deleteOnePlayer = async (req, res) => {
    const token = req.headers.token;
    const { clubId, playerId } = req.body;

    // Check if clubId is missing
    if (!clubId) {
        return res.status(401).json({
            status: "failed",
            message: "club ID is missing"
        });
    }

    // Check if playerId is missing
    if (!playerId) {
        return res.status(401).json({
            status: "failed",
            message: "player ID is missing"
        });
    }

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Verifying the token
    jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
        if (err) {
            if (err.name === "JsonWebTokenError") {
                return res.status(403).json({
                    status: "error",
                    message: "Invalid token"
                });
            } else if (err.name === "TokenExpiredError") {
                return res.status(403).json({
                    status: "error",
                    message: "Token has expired"
                });
            } else {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }
        }

        try {
            // Check if decoded token matches clubId from request body
            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Call the model function to delete the player
            await Club.deleteOnePlayer(clubId, playerId);

            return res.status(200).json({
                status: "success",
                message: "Player deleted successfully",
                data: { playerId: playerId }
            });
        } catch (error) {
            console.error("Error deleting player:", error);

            if (error.message === "Player not found or already deleted" || error.message === "club not found") {
                return res.status(422).json({
                    status: "error",
                    error: error.message
                });
            }

            return res.status(500).json({
                status: "error",
                message: "Internal server error",
                error: error.message,
            });
        }
    });
};
//
//
//
//
// CLUB SEARCH PLAYERS
exports.searchPlayers = async (req, res) => {
    const token = req.headers.token;
    const { clubId, searchQuery } = req.body;

    try {
        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if clubId is missing
        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Club ID is missing"
            });
        }

        // Check if searchQuery is missing or empty
        if (!searchQuery || searchQuery.trim() === "") {
            return res.status(400).json({
                status: "error",
                results: "Search query cannot be empty"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Invalid or missing token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "error",
                            message: "Token has expired"
                        });
                    } else {
                        return res.status(403).json({
                            status: "failed",
                            message: "Unauthorized access"
                        });
                    }
                }

                if (decoded.clubId != clubId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to search players
                try {
                    const searchResult = await Club.searchPlayers(
                        clubId,
                        searchQuery
                    );

                    return res.status(200).json({
                        status: "success",
                        message: "Players found successfully",
                        data: searchResult,
                    });
                } catch (error) {
                    console.error("Error searching players:", error);

                    if (error.message === "Club not found") {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else if (error.message === "No players found matching the criteria") {
                        return res.status(422).json({
                            status: "failed",
                            error: error.message
                        });
                    }

                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error",
                        error: error.message,
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error searching players:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// CLUB SUSPEND PLAYER
exports.suspendOnePlayer = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId, playerId } = req.body;

        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Club ID is missing"
            });
        }

        if (!playerId) {
            return res.status(401).json({
                status: "failed",
                message: "Player ID is missing"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Invalid token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Token has expired"
                        });
                    }
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                if (decoded.clubId != clubId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                try {
                    const suspensionStatus = await Club.suspendOnePlayer(
                        playerId,
                        clubId
                    );

                    if (suspensionStatus) {
                        return res.status(200).json({
                            status: "success",
                            message: "Player suspended successfully",
                            data: { playerId },
                        });
                    } else {
                        throw new Error("Error suspending player");
                    }
                } catch (error) {
                    console.error("Error suspending player:", error);

                    if (
                        error.message === "Player not found or already suspended" ||
                        error.message === "Club not found"
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    }

                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error",
                        error: error.message,
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error suspending player:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// CLUB UNSUSPEND PLAYER
exports.unSuspendOnePlayer = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId, playerId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if clubId is missing
        if (!clubId) {
            return res.status(401).json({
                status: "failed",
                message: "Club ID is missing"
            });
        }

        // Check if playerId is missing
        if (!playerId) {
            return res.status(401).json({
                status: "failed",
                message: "Player ID is missing"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_CLUB,
            async (err, decoded) => {
                if (err) {
                    if (err.name === "JsonWebTokenError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Invalid token"
                        });
                    } else if (err.name === "TokenExpiredError") {
                        return res.status(403).json({
                            status: "failed",
                            message: "Token has expired"
                        });
                    }
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                if (decoded.clubId != clubId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                try {
                    const unsuspensionStatus = await Club.unsuspendOnePlayer(
                        playerId,
                        clubId
                    );

                    if (unsuspensionStatus) {
                        return res.status(200).json({
                            status: "success",
                            message: "Player unsuspended successfully",
                            data: { playerId },
                        });
                    } else {
                        throw new Error("Error unsuspending player");
                    }
                } catch (error) {
                    console.error("Error unsuspending player:", error);

                    if (
                        error.message === "Player not found or not suspended" ||
                        error.message === "Club not found"
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    }

                    return res.status(500).json({
                        status: "error",
                        message: "Internal server error",
                        error: error.message,
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error unsuspending player:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};
//
//
//
//
// CLUB VIEW ALL SUSPENDED PLAYERS
exports.viewAllSuspendedPlayers = async (req, res) => {
    const token = req.headers.token;
    const { clubId } = req.body;
  
    // Check if token is missing
    if (!token) {
      return res.status(403).json({
        status: "failed",
        message: "Token is missing"
      });
    }
  
    // Check if clubId is missing
    if (!clubId) {
      return res.status(401).json({
        status: "failed",
        message: "Club ID is missing"
      });
    }
  
    try {
      // Verifying the token
      jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_CLUB,
        async (err, decoded) => {
          if (err) {
            if (err.name === "JsonWebTokenError") {
              return res.status(403).json({
                status: "failed",
                message: "Invalid token"
              });
            } else if (err.name === "TokenExpiredError") {
              return res.status(403).json({
                status: "failed",
                message: "Token has expired"
              });
            } else {
              return res.status(403).json({
                status: "failed",
                message: "Unauthorized access"
              });
            }
          }
  
          // Check if decoded token matches clubId from request body
          if (decoded.clubId != clubId) {
            return res.status(403).json({
              status: "failed",
              message: "Unauthorized access"
            });
          }
  
          // Token is valid, proceed to fetch all suspended players
          try {
            const suspendedPlayers = await Club.viewAllSuspendedPlayers(clubId);
            return res.status(200).json({
              status: "success",
              message: "All Suspended Players retrieved successfully",
              data: suspendedPlayers,
            });
          } catch (error) {
            console.error("Error viewing all suspended players:", error);
            if (error.message === "Club not found") {
              return res.status(422).json({
                status: "error",
                error: error.message
              });
            }
            return res.status(500).json({
              status: "error",
              message: "Internal server error",
              error: error.message,
            });
          }
        }
      );
    } catch (error) {
      console.error("Error verifying token:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  };
//
//
//
//
// CLUB VIEW ONE SUSPENDED PLAYER
exports.viewOneSuspendedPlayer = async (req, res) => {
    try {
      const token = req.headers.token;
      const { clubId, playerId } = req.body;
  
      // Check if token is missing
      if (!token) {
        return res.status(403).json({
          status: "failed",
          message: "Token is missing"
        });
      }
  
      // Check if clubId is missing
      if (!clubId) {
        return res.status(401).json({
          status: "failed",
          message: "Club ID is missing"
        });
      }
  
      // Check if playerId is missing
      if (!playerId) {
        return res.status(401).json({
          status: "failed",
          message: "Player ID is missing"
        });
      }
  
      // Verifying the token
      jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_CLUB,
        async (err, decoded) => {
          if (err) {
            if (err.name === "JsonWebTokenError") {
              return res.status(403).json({
                status: "failed",
                message: "Invalid token"
              });
            } else if (err.name === "TokenExpiredError") {
              return res.status(403).json({
                status: "failed",
                message: "Token has expired"
              });
            } else {
              return res.status(403).json({
                status: "failed",
                message: "Unauthorized access"
              });
            }
          }
  
          // Check if decoded token matches clubId from request body
          if (decoded.clubId != clubId) {
            return res.status(403).json({
              status: "failed",
              message: "Unauthorized access"
            });
          }
  
          // Token is valid, proceed to fetch details of one suspended player
          try {
            const suspendedPlayerDetails = await Club.viewOneSuspendedPlayer(
              playerId,
              clubId
            );
            return res.status(200).json({
              status: "success",
              message: "Suspended Player details",
              data: suspendedPlayerDetails,
            });
          } catch (error) {
            if (
              error.message === "Suspended player not found" ||
              error.message === "Club not found"
            ) {
              return res.status(422).json({
                status: "error",
                error: error.message
              });
            } else {
              console.error("Error viewing suspended player details:", error);
              return res.status(500).json({
                status: "error",
                message: "Internal server error",
                error: error.message,
              });
            }
          }
        }
      );
    } catch (error) {
      console.error("Error verifying token:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      });
    }
  };
//
//
//
//
// CLUB SEND NOTIFICATION TO PLAYER
exports.sendNotificationToPlayer = async (req, res) => {
    try {
      const token = req.headers.token;
      const { clubId, playerId, notificationMessage } = req.body;
  
      // Check if token is provided
      if (!token) {
        return res.status(403).json({
          status: "error",
          message: "Token is missing"
        });
      }
  
      // Check if clubId, playerId, and notificationMessage are provided
      if (!clubId) {
        return res.status(401).json({
          status: "error",
          message: "Club ID is missing"
        });
      }
      if (!playerId) {
        return res.status(401).json({
          status: "error",
          message: "Player ID is missing"
        });
      }
  
      // Token verification
      jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
        if (err) {
          if (err.name === "JsonWebTokenError") {
            return res.status(403).json({
              status: "error",
              message: "Invalid or missing token"
            });
          } else if (err.name === "TokenExpiredError") {
            return res.status(403).json({
              status: "error",
              message: "Token has expired"
            });
          } else {
            return res.status(403).json({
              status: "error",
              message: "Unauthorized access"
            });
          }
        }
  
        // Check if the decoded clubId matches the provided clubId
        if (decoded.clubId != clubId) {
          return res.status(403).json({
            status: "error",
            message: "Unauthorized access"
          });
        }
  
        // Function to validate notification message
        function validateNotificationData(notificationMessage) {
          const validationResults = {
            isValid: true,
            errors: {},
          };
  
          // Your validation logic here
          const messageValidation = dataValidator.isValidMessage(notificationMessage);
          if (!messageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["notificationMessage"] = [messageValidation.message];
          }
  
          return validationResults;
        }
  
        // Validate notification message
        const validationResults = validateNotificationData(notificationMessage);
  
        // If validation fails, return error response
        if (!validationResults.isValid) {
          return res.status(400).json({
            status: "error",
            message: "Validation failed",
            errors: validationResults.errors
          });
        }
  
        try {
          // Send notification to player
          const notificationDetails = await Club.sendNotificationToPlayer(clubId, playerId, notificationMessage);
  
          // Return success response
          return res.status(200).json({
            status: "success",
            message: "Notification sent successfully",
            data: notificationDetails
          });
        } catch (error) {
          // Handle errors
          console.error("Error sending notification to player:", error);
  
          // Return appropriate error response
          if (error.message === "Club not found" || error.message === "Player not found or not active") {
            return res.status(422).json({
              status: "error",
              error: error.message
            });
          }
  
          return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
          });
        }
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Error in sendNotificationToPlayer controller:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message
      });
    }
  };
//
//
//
//
//
// CLUB ADD ONE INJURIY UPDATE
exports.addOneInjuryUpdate = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId, playerId } = req.body;

        // Check if token is provided
        if (!token) {
            return res.status(403).json({
                status: "error",
                message: "Token is missing"
            });
        }

        // Check if clubId is provided
        if (!clubId) {
            return res.status(400).json({
                status: "error",
                message: "clubId is missing"
            });
        }

        // Check if playerId is provided
        if (!playerId) {
            return res.status(400).json({
                status: "error",
                message: "playerId is missing"
            });
        }

        // Token verification
        jwt.verify(token, process.env.JWT_SECRET_KEY_CLUB, async (err, decoded) => {
            if (err) {
                if (err.name === "JsonWebTokenError") {
                    return res.status(403).json({
                        status: "error",
                        message: "Invalid or missing token"
                    });
                } else if (err.name === "TokenExpiredError") {
                    return res.status(403).json({
                        status: "error",
                        message: "Token has expired"
                    });
                } else {
                    return res.status(403).json({
                        status: "error",
                        message: "Unauthorized access"
                    });
                }
            }

            // Check if the decoded clubId matches the provided clubId
            if (decoded.clubId != clubId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Create injuryData after all ID verifications
            const injuryData = {
                injuryType: req.body.injuryType,
                averageRecoveryTime: req.body.averageRecoveryTime
            };

            // Function to validate review content
            function validateReviewContent(injuryData) {
                const validationResults = {
                    isValid: true,
                    errors: {},
                };

                // Your validation logic here
                const injuryTypeValidation = dataValidator.isValidText(injuryData.injuryType);
                if (!injuryTypeValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["injuryType"] = [injuryTypeValidation.message];
                }

                const averageRecoveryTimeValidation = dataValidator.isValidText(injuryData.averageRecoveryTime);
                if (!averageRecoveryTimeValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["averageRecoveryTime"] = [averageRecoveryTimeValidation.message];
                }

                return validationResults;
            }

            // Validate review content
            const validationResults = validateReviewContent(injuryData);

            // If validation fails, return error response
            if (!validationResults.isValid) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: validationResults.errors
                });
            }

            try {
                // Call the addInjuryUpdate method from the Club model
                const injuryDetails = await Club.addInjuryUpdate(playerId, clubId, injuryData); // Pass injuryData to the Club model method

                // Return success response
                return res.status(200).json({
                    status: "success",
                    message: "Injury details submitted successfully",
                    data: injuryDetails
                });
            } catch (error) {
                // Handle errors
                console.error("Error submitting injury details by club:", error);

                // Return appropriate error response
                if (error.message === "Club not found" || error.message === "Player not found or not active in this club") {
                    return res.status(422).json({
                        status: "error",
                        error: error.message
                    });
                }

                return res.status(500).json({
                    status: "error",
                    message: "Internal server error",
                    error: error.message
                });
            }
        });
    } catch (error) {
        // Handle unexpected errors
        console.error("Error in controller:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
};






