// admin.controller.js
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Admin } = require("../../models/AdminModels/admin.model");
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
// ADMIN REGISTER
exports.registration = async (req, res) => {
    const uploadAdminImage = multer({
        storage: multer.memoryStorage(),
    }).single("adminImage");

    uploadAdminImage(req, res, async function (err) {
        if (err) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: { file: "File upload failed", details: err.message },
            });
        }

        const adminData = req.body;
        const adminImageFile = req.file ? req.file : null;


        const validationResults = validateAdminRegistration(adminData, adminImageFile);

        if (!validationResults.isValid) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                results: validationResults.errors,
            });
        }

        if (adminImageFile) {
            const fileName = `adminImage-${Date.now()}${path.extname(adminImageFile.originalname)}`;
            const mimeType = adminImageFile.mimetype;

            try {
                const fileLocation = await uploadFileToS3(adminImageFile.buffer, fileName, mimeType);
                adminData.adminImage = fileLocation;
            } catch (uploadError) {
                return res.status(500).json({
                    status: "failed",
                    message: "Internal server error",
                    error: uploadError.message,
                });
            }
        }

        try {
            const registrationResponse = await Admin.registration(adminData);
            // Setup email content
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: registrationResponse.adminEmail, // Assuming email is part of the response
                subject: "Your Registration Details",
                text: `Dear ${registrationResponse.adminName},

Welcome to Ajay's Football Club Management System!

Congratulations on successfully registering as an admin. With our system, you can efficiently manage all aspects of the football club's operations, from player registrations to match scheduling.

We're here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out to our team.

Thank you for choosing Ajay's Football Club Management System. Let's work together to lead the team to success on and off the pitch!

Best regards,
Ajay Kumar MA
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
                message: "Admin registered successfully",
                data: registrationResponse,
            });
        } catch (error) {

            // Delete uploaded image from S3 if it exists
            if (adminData.adminImage) {
                const s3Key = adminData.adminImage.split('/').pop();
                const params = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: `adminImages/${s3Key}`
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
            Key: `adminImages/${fileName}`,
            Body: fileBuffer.buffer,
            ACL: "public-read",
            ContentType: mimeType,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    }

    function validateAdminRegistration(adminData, adminImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        // Name validation
        const nameValidation = dataValidator.isValidName(adminData.adminName);
        if (!nameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["adminName"] = [nameValidation.message];
        }

        // Email validation
        const emailValidation = dataValidator.isValidEmail(adminData.adminEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["adminEmail"] = [emailValidation.message];
        }


        // Address validation
        const addressValidation = dataValidator.isValidAddress(adminData.adminAddress);
        if (!addressValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["adminAddress"] = [addressValidation.message];
        }

        const imageValidation = dataValidator.isValidImageWith1MBConstraint(adminImageFile);
        if (!imageValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["adminImage"] = [imageValidation.message];
        }

        // Password validation
        const mobileValidation = dataValidator.isValidMobileNumber(adminData.adminMobile);
        if (!mobileValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["adminPassword"] = [mobileValidation.message];
        }

        return validationResults;
    }
};
//
//
//
//
// ADMIN LOGIN
exports.login = async (req, res) => {
    const { adminEmail, adminPassword } = req.body;

    function validateAdminLogin() {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        // Validate email
        const emailValidation = dataValidator.isValidEmail(adminEmail);
        if (!emailValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['adminEmail'] = [emailValidation.message];
        }

        // Validate password
        const passwordValidation = dataValidator.isValidPassword(adminPassword);
        if (!passwordValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors['adminPassword'] = [passwordValidation.message];
        }

        return validationResults;
    }

    const validationResults = validateAdminLogin();
    if (!validationResults.isValid) {
        return res.status(400).json({
            status: 'failed',
            message: 'Validation failed',
            results: validationResults.errors,
        });
    }

    try {
        const admin = await Admin.login(adminEmail, adminPassword);

        const token = jwt.sign(
            {
                adminId: admin.adminId,
                adminEmail: admin.adminEmail,
            },
            process.env.JWT_SECRET_KEY_ADMIN,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: { token, admin },
        });
    } catch (error) {
        console.error('Error during admin login:', error);

        if (error.message === 'Admin not found' || error.message === 'Wrong password') {
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
// ADMIN CHANGE PASSWORD
exports.changePassword = async (req, res) => {
    const token = req.headers.token;
    const { adminId, oldPassword, newPassword } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if adminId is missing
    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_ADMIN,
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

            if (decoded.adminId != adminId) {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            try {
                function validateAdminChangePassword() {
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

                const validationResults = validateAdminChangePassword();
                if (!validationResults.isValid) {
                    return res.status(400).json({
                        status: "failed",
                        message: "Validation failed",
                        results: validationResults.errors
                    });
                }

                await Admin.changePassword(adminId, oldPassword, newPassword);
                return res.status(200).json({
                    status: "success",
                    message: "Password changed successfully"
                });
            } catch (error) {
                if (
                    error.message === "Admin not found" ||
                    error.message === "Incorrect old password"
                ) {
                    return res.status(422).json({
                        status: "failed",
                        message: "Password change failed",
                        error: error.message
                    });
                } else {
                    console.error("Error changing admin password:", error);
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
//
// ADMIN VIEW PROFILE
exports.viewProfile = async (req, res) => {
    const token = req.headers.token;
    const { adminId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if adminId is missing
    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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

                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch admin profile
                try {
                    const result = await Admin.viewProfile(adminId);
                    return res.status(200).json({
                        status: "success",
                        data: result
                    });
                } catch (error) {
                    if (error.message === "Admin not found") {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error fetching admin profile:", error);
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
// ADMIN UPDATE PROFILE
exports.updateProfile = async (req, res) => {
    const token = req.headers.token;
    const {
        adminId,
        adminName,
        adminMobile,
        adminAddress,
    } = req.body;

    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET_KEY_ADMIN,
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

            if (decoded.adminId != adminId) {
                return res.status(403).json({
                    status: "failed",
                    message: "Unauthorized access"
                });
            }

            // Remove spaces from Aadhar number and mobile number
            const updatedAdmin = {
                adminId,
                adminName,
                adminMobile: adminMobile.replace(/\s/g, ''),
                adminAddress,
            };

            function validateAdminUpdateProfile() {
                const validationResults = {
                    isValid: true,
                    errors: {},
                };

                const nameValidation = dataValidator.isValidName(adminName);
                if (!nameValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["adminName"] = [nameValidation.message];
                }


                const mobileValidation =
                    dataValidator.isValidMobileNumber(updatedAdmin.adminMobile);
                if (!mobileValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["adminMobile"] = [
                        mobileValidation.message,
                    ];
                }

                const addressValidation = dataValidator.isValidAddress(adminAddress);
                if (!addressValidation.isValid) {
                    validationResults.isValid = false;
                    validationResults.errors["adminAddress"] = [
                        addressValidation.message,
                    ];
                }

                return validationResults;
            }

            const validationResults = validateAdminUpdateProfile();

            if (!validationResults.isValid) {
                return res.status(400).json({
                    status: "failed",
                    message: "Validation failed",
                    results: validationResults.errors,
                });
            }

            try {
                const updatedData = await Admin.updateProfile(updatedAdmin);
                return res.status(200).json({
                    status: "success",
                    message: "Admin updated successfully",
                    data: updatedData,
                });
            } catch (error) {
                console.error("Error updating admin profile:", error);
                if (
                    error.message === "Admin not found" ||
                    error.message === "Aadhar Number Already Exists."
                ) {
                    return res.status(422).json({
                        status: "error",
                        error: error.message
                    });
                } else if (
                    error.message === "Error fetching updated admin details."
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
// ADMIN ADD NEWS
exports.addNews = async (req, res) => {
    const token = req.headers.token;

    try {
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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

                const uploadNewsImage = multer({
                    storage: multer.memoryStorage(),
                }).single("footballNewsImage");

                uploadNewsImage(req, res, async function (err) {
                    if (err) {
                        console.error("File upload failed:", err);
                        return res.status(400).json({
                            status: "error",
                            message: "File upload failed",
                            results: err.message,
                        });
                    }

                    const { adminId } = req.body;

                    if (!adminId) {
                        console.error("Admin ID is missing");
                        return res.status(401).json({
                            status: "failed",
                            message: "Admin ID is missing"
                        });
                    }

                    if (decoded.adminId != adminId) {
                        console.error("Unauthorized access");
                        return res.status(403).json({
                            status: "error",
                            message: "Unauthorized access"
                        });
                    }

                    const newsData = req.body;
                    const newsImageFile = req.file;

                    const validationResults = validateFootballNewsData(newsData, newsImageFile);

                    if (!validationResults.isValid) {
                        console.error("Validation failed:", validationResults.errors);
                        return res.status(400).json({
                            status: "error",
                            message: "Validation failed",
                            results: validationResults.errors,
                        });
                    }

                    try {
                        const imageUrl = await uploadFileToS3(
                            newsImageFile.buffer,
                            newsImageFile.originalname,
                            newsImageFile.mimetype
                        );

                        const newFootballNews = {
                            footballNewsTitle: newsData.footballNewsTitle,
                            footballNewsContent: newsData.footballNewsContent,
                            footballNewsImage: imageUrl,
                        };

                        const addedNewsId = await Admin.addNews(
                            newsData.adminId,
                            newFootballNews
                        );
                        return res.status(200).json({
                            status: "success",
                            message: "Football news added successfully",
                            data: { footballNewsId: addedNewsId, ...newFootballNews },
                        });
                    } catch (error) {
                        console.error("Error during adding football news:", error);
                        if (error.message === "Admin not found" && newsImageFile) {
                            const s3Key = req.file.key.split('/').pop();
                            const params = {
                                Bucket: process.env.S3_BUCKET_NAME,
                                Key: `Files/footballNewsImages/${s3Key}`
                            };
                            try {
                                await s3Client.send(new DeleteObjectCommand(params));
                            } catch (s3Error) {
                                console.error("Error deleting news image from S3:", s3Error);
                            }
                        }
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    }
                });
            }
        );
    } catch (error) {
        console.error("Error during adding football news:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }

    // Function to validate football news data
    function validateFootballNewsData(newsData, newsImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        const titleValidation = dataValidator.isValidTitle(
            newsData.footballNewsTitle
        );
        if (!titleValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["NewsTitle"] =
                titleValidation.message;
        }

        const contentValidation = dataValidator.isValidText(
            newsData.footballNewsContent
        );
        if (!contentValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["NewsContent"] =
                contentValidation.message;
        }

        if (!newsImageFile) {
            validationResults.isValid = false;
            validationResults.errors["footballNewsImage"] =
                "Football news image is required";
        } else {
            const imageValidation =
                dataValidator.isValidImageWith1MBConstraint(newsImageFile);
            if (!imageValidation.isValid) {
                validationResults.isValid = false;
                validationResults.errors["footballNewsImage"] =
                    imageValidation.message;
            }
        }

        return validationResults;
    }

    // Function to upload file to S3
    async function uploadFileToS3(fileBuffer, fileName, mimeType) {
        try {
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `footballNewsImages/${fileName}`,
                Body: fileBuffer,
                ACL: "public-read",
                ContentType: mimeType,
            };
            const command = new PutObjectCommand(uploadParams);
            await s3Client.send(command);
            return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
        } catch (error) {
            throw error;
        }
    }
};
//
//
//
//
// ADMIN VIEW ALL NEWS
exports.viewAllNews = async (req, res) => {
    try {
        const token = req.headers.token;
        const { adminId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if adminId is missing
        if (!adminId) {
            return res.status(401).json({
                status: "failed",
                message: "Admin ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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
                    // Check if decoded token matches adminId from request body
                    if (decoded.adminId != adminId) {
                        return res.status(403).json({
                            status: "error",
                            message: "Unauthorized access"
                        });
                    }

                    const allNewsData = await Admin.viewAllNews(adminId);
                    return res.status(200).json({
                        status: "success",
                        message: "All admin news retrieved successfully",
                        data: allNewsData,
                    });
                } catch (error) {
                    console.error("Error viewing all admin news:", error);

                    if (error.message === "Admin not found or inactive") {
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
        console.error("Error during viewAllAdminNews:", error);
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
// ADMIN VIEW ONE NEWS
exports.viewOneNews = async (req, res) => {
    try {
        const token = req.headers.token;
        const { adminId, footballNewsId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if adminId is missing
        if (!adminId) {
            return res.status(401).json({
                status: "failed",
                message: "Admin ID is missing"
            });
        }

        // Check if footballNewsId is missing
        if (!footballNewsId) {
            return res.status(401).json({
                status: "failed",
                message: "Football News ID is missing"
            });
        }

        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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
                    // Check if decoded token matches adminId from request body
                    if (decoded.adminId != adminId) {
                        return res.status(403).json({
                            status: "error",
                            message: "Unauthorized access"
                        });
                    }

                    const newsItemData = await Admin.viewOneNews(
                        footballNewsId,
                        adminId
                    );
                    return res.status(200).json({
                        status: "success",
                        message: "Football news retrieved successfully",
                        data: newsItemData,
                    });
                } catch (error) {
                    console.error("Error viewing one football news:", error);
                    if (
                        error.message === "Football news not found" ||
                        error.message === "Admin not found"
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
        console.error("Error during viewOneFootballNews:", error);
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
// ADMIN ADD MATCH
exports.addMatch = async (req, res) => {
    const token = req.headers.token;

    try {
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        jwt.verify(token, process.env.JWT_SECRET_KEY_ADMIN, async (err, decoded) => {
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

            const uploadMatchImages = multer({
                storage: multer.memoryStorage(),
            }).fields([
                { name: 'homeTeamImage', maxCount: 1 },
                { name: 'awayTeamImage', maxCount: 1 }
            ]);

            uploadMatchImages(req, res, async function (err) {
                if (err) {
                    console.error("File upload failed:", err);
                    return res.status(400).json({
                        status: "error",
                        message: "File upload failed",
                        results: err.message,
                    });
                }

                const { adminId, matchName, homeTeamName, awayTeamName, matchLocation, matchPrize, matchDate } = req.body;

                if (!adminId) {
                    return res.status(401).json({
                        status: "failed",
                        message: "adminId is missing"
                    });
                }

                if (decoded.adminId != adminId) {
                    console.error("Unauthorized access");
                    return res.status(403).json({
                        status: "error",
                        message: "Unauthorized access"
                    });
                }

                const homeTeamImageFile = req.files['homeTeamImage'] ? req.files['homeTeamImage'][0] : null;
                const awayTeamImageFile = req.files['awayTeamImage'] ? req.files['awayTeamImage'][0] : null;

                const validationResults = validateMatchData(req.body, homeTeamImageFile, awayTeamImageFile);

                if (!validationResults.isValid) {
                    console.error("Validation failed:", validationResults.errors);
                    return res.status(400).json({
                        status: "error",
                        message: "Validation failed",
                        results: validationResults.errors,
                    });
                }

                try {
                    const homeTeamImageUrl = await uploadFileToS3(
                        homeTeamImageFile.buffer,
                        homeTeamImageFile.originalname,
                        homeTeamImageFile.mimetype
                    );

                    const awayTeamImageUrl = await uploadFileToS3(
                        awayTeamImageFile.buffer,
                        awayTeamImageFile.originalname,
                        awayTeamImageFile.mimetype
                    );

                    const matchData = {
                        matchName,
                        homeTeamName,
                        awayTeamName,
                        homeTeamImage: homeTeamImageUrl,
                        awayTeamImage: awayTeamImageUrl,
                        matchLocation,
                        matchPrize,
                        matchDate
                    };

                    const addedMatchId = await Admin.addMatch(adminId, matchData);

                    return res.status(200).json({
                        status: "success",
                        message: "Match added successfully",
                        data: {
                            matchId: addedMatchId,
                            ...matchData
                        }
                    });
                } catch (error) {
                    console.error("Error during adding match:", error);
                    return res.status(422).json({
                        status: "error",
                        error: error.message
                    });
                }
            });
        });
    } catch (error) {
        console.error("Error during adding match:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }

    async function uploadFileToS3(fileBuffer, fileName, mimeType, deleteOnError = false) {
        try {
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `matchImages/${fileName}`,
                Body: fileBuffer,
                ACL: "public-read",
                ContentType: mimeType,
            };
            const command = new PutObjectCommand(uploadParams);
            await s3Client.send(command);
            return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
        } catch (error) {
            console.error("Error uploading file to S3:", error);
            if (deleteOnError) {
                const s3Key = fileName.split('/').pop();
                const params = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: `matchImages/${s3Key}`
                };
                try {
                    await s3Client.send(new DeleteObjectCommand(params));
                } catch (s3Error) {
                    console.error("Error deleting file from S3:", s3Error);
                }
            }
            throw error;
        }
    }

    function validateMatchData(matchData, homeTeamImageFile, awayTeamImageFile) {
        const validationResults = {
            isValid: true,
            errors: {},
        };

        const matchNameValidation = dataValidator.isValidText(
            matchData.matchName
        );
        if (!matchNameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["matchName"] =
                matchNameValidation.message;
        }

        const homeTeamNameValidation = dataValidator.isValidText(
            matchData.homeTeamName
        );
        if (!homeTeamNameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["homeTeamName"] =
                homeTeamNameValidation.message;
        }

        const awayTeamNameValidation = dataValidator.isValidText(
            matchData.awayTeamName
        );
        if (!awayTeamNameValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["awayTeamName"] =
                awayTeamNameValidation.message;
        }

        if (!homeTeamImageFile) {
            validationResults.isValid = false;
            validationResults.errors["homeTeamImage"] =
                "home team image is required";
        } else {
            const imageValidation =
                dataValidator.isValidImageWith1MBConstraint(homeTeamImageFile);
            if (!imageValidation.isValid) {
                validationResults.isValid = false;
                validationResults.errors["homeTeamImage"] =
                    imageValidation.message;
            }
        }

        if (!awayTeamImageFile) {
            validationResults.isValid = false;
            validationResults.errors["awayTeamImage"] =
                "away team image is required";
        } else {
            const imageValidation =
                dataValidator.isValidImageWith1MBConstraint(awayTeamImageFile);
            if (!imageValidation.isValid) {
                validationResults.isValid = false;
                validationResults.errors["awayTeamImage"] =
                    imageValidation.message;
            }
        }

        const matchLocationValidation = dataValidator.isValidText(
            matchData.matchLocation
        );
        if (!matchLocationValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["matchLocation"] =
                matchLocationValidation.message;
        }

        const matchPrizeValidation = dataValidator.isValidText(
            matchData.matchPrize
        );
        if (!matchPrizeValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["matchPrize"] =
                matchPrizeValidation.message;
        }

        const matchDateValidation = dataValidator.isValidText(
            matchData.matchDate
        );
        if (!matchDateValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors["matchDate"] =
                matchDateValidation.message;
        }

        return validationResults;
    }
};
//
//
//
//
// ADMIN VIEW ALL MATCH
exports.viewAllMatches = async (req, res) => {
    const token = req.headers.token;
    const { adminId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if adminId is missing
    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch all admin matches
                try {
                    const allMatches = await Admin.viewAllMatches(adminId);
                    return res.status(200).json({
                        status: "success",
                        message: "All Admin Matches retrieved successfully",
                        data: allMatches,
                    });
                } catch (error) {
                    console.error("Error viewing all matches:", error);
                    if (error.message === "Admin not found") {
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
// ADMIN VIEW ONE MATCH
exports.viewOneMatch = async (req, res) => {
    try {
        const token = req.headers.token;
        const { adminId, matchId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if adminId is missing
        if (!adminId) {
            return res.status(401).json({
                status: "failed",
                message: "Admin ID is missing"
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
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch details of one admin match
                try {
                    const matchDetails = await Admin.viewOneMatch(
                        matchId,
                        adminId
                    );
                    return res.status(200).json({
                        status: "success",
                        message: "Admin Match details",
                        data: matchDetails,
                    });
                } catch (error) {
                    if (
                        error.message === "Match not found" ||
                        error.message === "Admin not found "
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error viewing admin match details:", error);
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
// ADMIN END ONE MATCH
exports.endOneMatch = async (req, res) => {
    try {
        const token = req.headers.token;
        const { adminId, matchId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if adminId is missing
        if (!adminId) {
            return res.status(401).json({
                status: "failed",
                message: "Admin ID is missing"
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
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to end the match
                try {
                    await Admin.endOneMatch(adminId, matchId);
                    return res.status(200).json({
                        status: "success",
                        message: "Match ended successfully"
                    });
                } catch (error) {
                    console.error("Error ending match:", error);
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
// ADMIN VIEW ALL ENDED MATCHES
exports.viewAllEndedMatches = async (req, res) => {
    const token = req.headers.token;
    const { adminId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if adminId is missing
    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch all admin matches
                try {
                    const allMatches = await Admin.viewAllEndedMatches(adminId);
                    return res.status(200).json({
                        status: "success",
                        message: "All Ended Matches retrieved successfully",
                        data: allMatches,
                    });
                } catch (error) {
                    console.error("Error viewing all matches:", error);
                    if (error.message === "Admin not found") {
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
// ADMIN VIEW ONE ENDED MATCH
exports.viewOneEndedMatch = async (req, res) => {
    try {
        const token = req.headers.token;
        const { adminId, matchId } = req.body;

        // Check if token is missing
        if (!token) {
            return res.status(403).json({
                status: "failed",
                message: "Token is missing"
            });
        }

        // Check if adminId is missing
        if (!adminId) {
            return res.status(401).json({
                status: "failed",
                message: "Admin ID is missing"
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
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch details of one admin match
                try {
                    const matchDetails = await Admin.viewOneEndedMatch(
                        matchId,
                        adminId
                    );
                    return res.status(200).json({
                        status: "success",
                        message: "Admin Match details",
                        data: matchDetails,
                    });
                } catch (error) {
                    if (
                        error.message === "Match not found" ||
                        error.message === "Admin not found "
                    ) {
                        return res.status(422).json({
                            status: "error",
                            error: error.message
                        });
                    } else {
                        console.error("Error viewing admin match details:", error);
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
// ADMIN ADD MATCH
exports.addMatchPoint = async (req, res) => {
    const token = req.headers.token;
    const { adminId, matchId, teamOneTotalGoalsInMatch, teamTwoTotalGoalsInMatch } = req.body;
  
    if (!token) {
      return res.status(403).json({
        status: "failed",
        message: "Token is missing"
      });
    }
  
    if (!adminId) {
      return res.status(401).json({
        status: "failed",
        message: "Admin ID is missing"
      });
    }
  
    if (!matchId) {
      return res.status(401).json({
        status: "failed",
        message: "Match ID is missing"
      });
    }
  
    jwt.verify(token, process.env.JWT_SECRET_KEY_ADMIN, async (err, decoded) => {
      if (err) {
        console.error("JWT Verification Error:", err);
        return res.status(403).json({
          status: "error",
          message: "Invalid or expired token"
        });
      }
  
      if (decoded.adminId != adminId) {
        console.error("Unauthorized access");
        return res.status(403).json({
          status: "error",
          message: "Unauthorized access"
        });
      }
  
      const pointData = {
        teamOneTotalGoalsInMatch,
        teamTwoTotalGoalsInMatch,
      };
  
      try {
        const addedMatchId = await Admin.addMatchPoint(adminId, matchId, pointData);
  
        return res.status(200).json({
          status: "success",
          message: "Match point added successfully",
          data: {
            matchId: addedMatchId,
            ...pointData
          }
        });
      } catch (error) {
        console.error("Error during adding match point:", error);
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
// ADMIN VIEW ALL MATCH POINTS
exports.viewAllMatchPoints = async (req, res) => {
    const token = req.headers.token;
    const { adminId } = req.body;

    // Check if token is missing
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "Token is missing"
        });
    }

    // Check if adminId is missing
    if (!adminId) {
        return res.status(401).json({
            status: "failed",
            message: "Admin ID is missing"
        });
    }

    try {
        // Verifying the token
        jwt.verify(
            token,
            process.env.JWT_SECRET_KEY_ADMIN,
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

                // Check if decoded token matches adminId from request body
                if (decoded.adminId != adminId) {
                    return res.status(403).json({
                        status: "failed",
                        message: "Unauthorized access"
                    });
                }

                // Token is valid, proceed to fetch all match points for the admin
                try {
                    const allMatchPoints = await Admin.viewAllMatchPoints(adminId);
                    return res.status(200).json({
                        status: "success",
                        message: "All Admin Match Points retrieved successfully",
                        data: allMatchPoints,
                    });
                } catch (error) {
                    console.error("Error viewing all match points:", error);
                    if (error.message === "Admin not found") {
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
//
//


