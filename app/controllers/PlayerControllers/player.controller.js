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
        const playerImageFile = req.file ? req.file : null;
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
                const s3Key = playerData.playerImage ? playerData.playerImage.split('/').pop() : null;
                if (s3Key) {
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
            Key: `playerImages/${fileName}`,
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
// PLAYER CHANGE PASSWORD
exports.changePassword = async (req, res) => {
    const token = req.headers.token;
    const { playerId, oldPassword, newPassword } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
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
        process.env.JWT_SECRET_KEY_PLAYER,
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

            if (decoded.playerId != playerId) {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            try {
                function validatePlayerChangePassword() {
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

                const validationResults = validatePlayerChangePassword();
                if (!validationResults.isValid) {
                    return res.status(400).json({
                        status: "failed",
                        message: "Validation failed",
                        results: validationResults.errors
                    });
                }

                await Player.changePassword(playerId, oldPassword, newPassword);
                return res.status(200).json({
                    status: "success",
                    message: "Password changed successfully"
                });
            } catch (error) {
                if (
                    error.message === "Player not found" ||
                    error.message === "Incorrect old password"
                ) {
                    return res.status(422).json({
                        status: "failed",
                        message: "Password change failed",
                        error: error.message
                    });
                } else {
                    console.error("Error changing player password:", error);
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
// PLAYER VIEW PROFILE
exports.viewProfile = async (req, res) => {
    const token = req.headers.token;
    const { playerId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if playerId is missing
    if (!playerId) {
        return res.status(401).json({
            status: "failed",
            message: "Player ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_PLAYER,
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

                if (decoded.playerId != playerId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch player profile
                try {
                    const result = await Player.viewProfile(playerId);
                    return res.status(200).json({
                        status: "success",
                        data: result
                    });
                } catch (error) {
                    if (error.message === "Player not found") {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error fetching player profile:", error);
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
//
// PLAYER UPDATE PROFILE
exports.updateProfile = async (req, res) => {
    const token = req.headers.token;
    const {
        playerId,
        playerName,
        playerAge,
        playerMobile,
        playerCountry,
        playerPosition,
        playerAddress
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
            const updatedPlayer = {
                playerId,
                playerName,
                playerMobile: playerMobile.replace(/\s/g, ''),
                playerAddress,
                playerCountry,
                playerPosition
            };

            function validatePlayerUpdateProfile() {
                const validationResults = {
                    isValid: true,
                    errors: {},
                };

                const nameValidation = dataValidator.isValidName(playerName);
                if (!nameValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerName"] = [nameValidation.message];
                }

                const mobileValidation =
                    dataValidator.isValidMobileNumber(updatedPlayer.playerMobile);
                if (!mobileValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerMobile"] = [
                        mobileValidation.message,
                    ];
                }

                const addressValidation = dataValidator.isValidAddress(playerAddress);
                if (!addressValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerAddress"] = [
                        addressValidation.message,
                    ];
                }

                const ageValidation = dataValidator.isValidAge(playerAge);
                if (!ageValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerAge"] = [
                        ageValidation.message,
                    ];
                }

                const countryValidationValidation = dataValidator.isValidText(playerCountry);
                if (!countryValidationValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerCountry"] = [countryValidationValidation.message];
                }

                const posistionValidationValidation = dataValidator.isValidText(playerPosition);
                if (!posistionValidationValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["playerPosition"] = [posistionValidationValidation.message];
                }


                return validationResults;
            }

            const validationResults = validatePlayerUpdateProfile();

            if (!validationResults.isValid) {
                return res.status(400).json({
                    status: "failed",
                    message: "Validation failed",
                    results: validationResults.errors,
                });
            }

            try {
                const updatedData = await Player.updateProfile(updatedPlayer);
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
// PLAYER VIEW ALL NOTIFICATIONS FROM CLUB
exports.viewAllNotifications = async (req, res) => {
    try {
      const token = req.headers.token;
      const {playerId} = req.body;
  
      // Check if token is missing
      if (!token) {
        return res.status(403).json({
          status: "failed",
          message: "Token is missing"
        });
      }
  
      // Check if hospitalStaffId is missing
      if (!playerId) {
        return res.status(401).json({
          status: "failed",
          message: "Player ID is missing"
        });
      }
  
      // Verifying the token
      jwt.verify(token, process.env.JWT_SECRET_KEY_PLAYER, async (err, decoded) => {
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
          // Check if decoded token matches hospitalStaffId from request body
          if (decoded.playerId != playerId) {
            return res.status(403).json({
              status: "error",
              message: "Unauthorized access"
            });
          }
  
          const notifications = await Player.viewAllNotifications(playerId);
  
          return res.status(200).json({
            status: "success",
            message: "All notifications retrieved successfully",
            data: notifications
          });
        } catch (error) {
          // Handle specific errors returned by the model
          if (error.message === "Player not found") {
            return res.status(422).json({
              status: "error",
              message: "Player not found",
              error : error.message
            });
          } else if (error.message === "No successful notifications found for this player") {
            return res.status(422).json({
              status: "error",
              message: "No successful notifications found for this player",
              error : error.message
            });
          }
  
          console.error("Error viewing all notifications for player:", error);
          return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
          });
        }
      });
    } catch (error) {
      console.error("Error during viewAllNotifications:", error);
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
// PLAYER VIEW ONE NOTIFICATION FROM CLUB
exports.viewOneNotification = async (req, res) => {
    try {
        const token = req.headers.token;
        const { playerId, notificationId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if playerId is missing
        if (!playerId) {
            return res.status(401).json({
                status: "failed",
                message: "Player ID is missing"
            });
        }

        // Check if notificationId is missing
        if (!notificationId) {
            return res.status(401).json({
                status: "failed",
                message: "Notification ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(token, process.env.JWT_SECRET_KEY_PLAYER, async (err, decoded) => {
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
                // Check if decoded token matches playerId from request body
                if (decoded.playerId != playerId) {
                    return res.status(403).json({
                        status: "error",
                        message: "Unauthorized access"
                    });
                }

                const notification = await Player.viewOneNotification(playerId, notificationId);

                return res.status(200).json({
                    status: "success",
                    message: "Notification retrieved successfully",
                    data: notification
                });
            } catch (error) {
                // Handle specific errors returned by the model
                if (error.message === "Player not found") {
                    return res.status(422).json({
                        status: "error",
                        message: "Player not found",
                        error: error.message
                    });
                } else if (error.message === "Notification not found") {
                    return res.status(422).json({
                        status: "error",
                        message: "Notification not found",
                        error: error.message
                    });
                }

                console.error("Error viewing one notification for player:", error);
                return res.status(500).json({
                    status: "error",
                    message: "Internal server error",
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.error("Error during viewOneNotification:", error);
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
// PLAYER SEND LEAVE REQUEST TO CLUB
exports.sendLeaveRequestToClub = async (req, res) => {
    try {
        const token = req.headers.token;
        const { clubId, playerId, message } = req.body;

        // Check if token is provided
        if (!token) {
            return res.status(403).json({
                status: "error",
                message: "Token is missing"
            });
        }

        // Check if clubId, playerId, and message are provided
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
            if (decoded.playerId != playerId) {
                return res.status(403).json({
                    status: "error",
                    message: "Unauthorized access"
                });
            }

            // Function to validate leave message
            function validateLeaveData(message) {
                const validationResults = {
                    isValid: true,
                    errors: {},
                };

                // Your validation logic here
                const messageValidation = dataValidator.isValidMessage(message);
                if (!messageValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["message"] = [messageValidation.message];
                }

                return validationResults;
            }

            // Validate leave message
            const validationResults = validateLeaveData(message);

            // If validation fails, return error response
            if (!validationResults.isValid) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: validationResults.errors
                });
            }

            try {
                // Send leave request to club
                const leaveRequestDetails = await Player.sendLeaveRequestToClub(clubId, playerId, message);

                // Return success response
                return res.status(200).json({
                    status: "success",
                    message: "Leave request sent successfully",
                    data: leaveRequestDetails
                });
            } catch (error) {
                // Handle errors
                console.error("Error sending leave request to club:", error);

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
        console.error("Error in sendLeaveRequestToClub controller:", error);
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
// PLAYER VIEW ALL APPROVED LEAVE REQUESTS FROM CLUB
exports.viewAllApprovedLeaveRequests = async (req, res) => {
    try {
        const token = req.headers.token;
        const { playerId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Verify the token
        jwt.verify(token, process.env.JWT_SECRET_KEY_PLAYER, async (err, decoded) => {
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
                // Check if playerId is missing
                if (!playerId) {
                    return res.status(401).json({
                        status: "failed",
                        message: "Player ID is missing"
                    });
                }

                // Verify if decoded token matches playerId from request body
                if (decoded.playerId != playerId) {
                    return res.status(403).json({
                        status: "error",
                        message: "Unauthorized access"
                    });
                }

                // Call the model method to view all approved leave requests
                const leaveRequests = await Player.viewAllApprovedLeaveRequests(playerId);

                return res.status(200).json({
                    status: "success",
                    message: "All approved leave requests retrieved successfully",
                    data: leaveRequests
                });
            } catch (error) {
                // Handle specific errors returned by the model
                if (error.message === "Player not found or not active") {
                    return res.status(404).json({
                        status: "error",
                        message: "Player not found or not active",
                        error: error.message
                    });
                } else if (error.message === "No approved leave requests found for this player") {
                    return res.status(404).json({
                        status: "error",
                        message: "No approved leave requests found for this player",
                        error: error.message
                    });
                }

                console.error("Error viewing approved leave requests for player:", error);
                return res.status(500).json({
                    status: "error",
                    message: "Internal server error",
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.error("Error during viewApprovedLeaveRequests:", error);
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
// PLAYER VIEW ALL MATCH
exports.viewAllMatches = async (req, res) => {
    const token = req.headers.token;
    const { playerId } = req.body;
  
    // Check if token is missing
    if (!token) {
      return res.status(403).json({
        status: "failed",
        message: "Token is missing"
      });
    }
  
    // Check if playerId is missing
    if (!playerId) {
      return res.status(401).json({
        status: "failed",
        message: "playerId is missing"
      });
    }
  
    try {
      // Verifying the token
      jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_PLAYER,
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
  
          // Check if decoded token matches playerId from request body
          if (decoded.playerId != playerId) {
            return res.status(403).json({
              status: "failed",
              message: "Unauthorized access"
            });
          }
  
          // Token is valid, proceed to fetch all admin matches
          try {
            const allMatches = await Player.viewAllMatches(playerId);
            return res.status(200).json({
              status: "success",
              message: "All Admin Matches retrieved successfully",
              data: allMatches,
            });
          } catch (error) {
            console.error("Error viewing all matches:", error);
            if (error.message === "Player not found") {
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
// PLAYER VIEW ONE MATCH
exports.viewOneMatch = async (req, res) => {
    try {
        const token = req.headers.token;
        const { playerId, matchId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if playerId is missing
        if (!playerId) {
            return res.status(401).json({
                status: "failed",
                message: "Player ID is missing"
            });
        }

        // Check if matchId is missing
        if (!matchId) {
            return res.status(401).json({
                status: "failed",
                message: "Match ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_PLAYER,
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

                // Check if decoded token matches playerId from request body
                if (decoded.playerId != playerId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch details of one player match
                try {
                    const matchDetails = await Player.viewOneMatch(
                        matchId,
                        playerId
                    );
                    return res.status(200).json({
                        status: "success",
                        message: "Player Match details",
                        data: matchDetails,
                    });
                } catch (error) {
                    if (
                        error.message === "Match not found" ||
                        error.message === "Player not found"
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error viewing player match details:", error);
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
// PLAYER VIEW ALL MATCH POINTS
exports.viewAllMatchPoints = async (req, res) => {
    const token = req.headers.token;
    const { playerId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if playerId is missing
    if (!playerId) {
        return res.status(401).json({
            status: "failed",
            message: "Player ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_PLAYER,
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

                // Check if decoded token matches playerId from request body
                if (decoded.playerId != playerId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch all match points for the player
                try {
                    const allMatchPoints = await Player.viewAllMatchPoints(playerId);
                    return res.status(200).json({
                        status: "success",
                        message: "All Player Match Points retrieved successfully",
                        data: allMatchPoints,
                    });
                } catch (error) {
                    console.error("Error viewing all match points:", error);
                    if (error.message === "Player not found") {
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
