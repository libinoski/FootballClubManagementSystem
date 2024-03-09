const bcrypt = require("bcrypt");
const db = require("../db");
const { promisify } = require("util");
const dbQuery = promisify(db.query.bind(db));

// ADMIN MODEL
const Admin = function (admin) {
  this.adminId = admin.adminId;
  this.adminName = admin.adminName;
  this.adminEmail = admin.adminEmail;
  this.adminImage = admin.adminImage;
  this.adminPassword = admin.adminPassword;
  this.registeredDate = admin.registeredDate;
  this.updatedDate = admin.updatedDate;
  this.isActive = admin.isActive;
  this.deleteStatus = admin.deleteStatus;
  this.updateStatus = admin.updateStatus;
  this.passwordUpdatedStatus = admin.passwordUpdatedStatus;
};

// ADMIN REGISTER
Admin.registration = async (newAdmin) => {
    try {
      const checkEmailQuery =
        "SELECT * FROM Admins WHERE adminEmail = ? AND deleteStatus=0 AND isActive=1";
  
      const errors = {};
  
      const emailRes = await dbQuery(checkEmailQuery, [
        newAdmin.adminEmail,
      ]);
      if (emailRes.length > 0) {
        errors["Email"] = ["Email already exists"];
      }
  
      if (Object.keys(errors).length > 0) {
        throw { name: "ValidationError", errors: errors };
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(newAdmin.adminPassword, 10);
      newAdmin.adminPassword = hashedPassword;
  
      const insertQuery = "INSERT INTO Admins SET ?";
      const insertRes = await dbQuery(insertQuery, newAdmin);
  
      return { adminId: insertRes.insertId, ...newAdmin };
    } catch (error) {
      console.error("Error during admin registration in model:", error);
      throw error;
    }
  };
  
  
// ADMIN LOGIN
Admin.login = async (email, password) => {
    const query =
      "SELECT * FROM Admins WHERE adminEmail = ? AND isActive = 1 AND deleteStatus = 0";
  
    try {
      const result = await dbQuery(query, [email]);
  
      if (result.length === 0) {
        throw new Error("Admin not found");
      }
  
      const admin = result[0];
  
      const isMatch = await promisify(bcrypt.compare)(
        password,
        admin.adminPassword
      );
  
      if (!isMatch) {
        throw new Error("Wrong password");
      }
  
      return admin;
    } catch (error) {
      console.error("Error during admin login:", error);
      throw error;
    }
  };
  




module.exports = {Admin};
