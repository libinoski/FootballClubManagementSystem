// hospital.controller.js
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Admin } = require("../../models/AdminModels/admin.model");
const dataValidator = require("../../config/data.validate");
const fs = require("fs");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // Add this line
require("dotenv").config();
const nodemailer = require('nodemailer');
// Email transporter configuration
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
exports.register = async (req, res) => {
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
      const adminImageFile = req.file;
  
      const validationResults = validateAdminRegistration(adminData, adminImageFile);
  
      if (!validationResults.isValid) {
        // Delete uploaded image from local storage
        if (adminImageFile && adminImageFile.filename) {
          const imagePath = path.join("Files/AdminImages", adminImageFile.filename);
          fs.unlinkSync(imagePath);
        }
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
          const fileLocation = await uploadFileToS3(adminImageFile, fileName, mimeType);
          adminData.adminImage = fileLocation;
        } catch (uploadError) {
          // Delete uploaded image from local storage
          if (adminImageFile && adminImageFile.filename) {
            const imagePath = path.join("Files/AdminImages", adminImageFile.filename);
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
        const registrationResponse = await Admin.register(adminData);
        // Setup email content
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: registrationResponse.adminEmail, // Assuming email is part of the response
          subject: "Your Registration Details",
          text: `Dear ${registrationResponse.adminName},
        
        Welcome to MedInsCare!
        
        Congratulations on successfully registering as an admin. With MedInsCare, you can efficiently manage the hospital's operations and resources.
        
        We're here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out to our team.
        
        Thank you for choosing MedInsCare. Let's work together to provide exceptional healthcare services.
        
        Best regards,
        Libin Jacob
        Admin 
        MedInsCare
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
        // Delete uploaded image from local storage
        if (adminImageFile && adminImageFile.filename) {
          const imagePath = path.join("Files/AdminImages", adminImageFile.filename);
          fs.unlinkSync(imagePath);
        }
  
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
          
            // Image validation
            const imageValidation = dataValidator.isValidImageWith1MBConstraint(adminImageFile);
            if (!imageValidation.isValid) {
              validationResults.isValid = false;
              validationResults.errors["adminImage"] = [imageValidation.message];
            }
          
            // Password validation
            const passwordValidation = dataValidator.isValidPassword(adminData.adminPassword);
            if (!passwordValidation.isValid) {
              validationResults.isValid = false;
              validationResults.errors["adminPassword"] = [passwordValidation.message];
            }
          
            return validationResults;
          }
          
    }
  };
  







  