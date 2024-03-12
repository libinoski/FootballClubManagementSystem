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
//
//
//
//
// ADMIN REGISTER
Admin.registration = async (adminData) => {
  try {
    const checkEmailQuery =
      "SELECT * FROM Admins WHERE adminEmail = ? AND deleteStatus=0 AND isActive=1";

    const errors = {};

    // Check if email already exists
    const emailRes = await dbQuery(checkEmailQuery, [adminData.adminEmail]);
    if (emailRes.length > 0) {
      errors["Email"] = ["Email already exists"];
    }

    if (Object.keys(errors).length > 0) {
      throw { name: "ValidationError", errors: errors };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.adminPassword, 10);
    adminData.adminPassword = hashedPassword;

    const insertQuery = "INSERT INTO Admins SET ?";
    const insertRes = await dbQuery(insertQuery, adminData);

    return { adminId: insertRes.insertId, ...adminData };
  } catch (error) {
    console.error("Error during admin registration in model:", error);
    throw error;
  }
};
//
//
//
//
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
//
//
//
//
// ADMIN CHANGE PASSWORD
Admin.changePassword = async (adminId, oldPassword, newPassword) => {
  const checkAdminQuery =
    "SELECT * FROM Admins WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1";

  try {
    const selectRes = await dbQuery(checkAdminQuery, [adminId]);
    if (selectRes.length === 0) {
      throw new Error("Admin not found");
    }

    const admin = selectRes[0];
    const isMatch = await promisify(bcrypt.compare)(
      oldPassword,
      admin.adminPassword
    );

    if (!isMatch) {
      throw new Error("Incorrect old password");
    }

    const hashedNewPassword = await promisify(bcrypt.hash)(newPassword, 10);
    const updatePasswordQuery = `
            UPDATE Admins
            SET
                updateStatus = 1,
                updatedDate = CURRENT_DATE(),
                deleteStatus = 0,
                isActive = 1,
                adminPassword = ?,
                passwordUpdatedStatus = 1
            WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1
        `;

    const updatePasswordValues = [hashedNewPassword, adminId];

    await dbQuery(updatePasswordQuery, updatePasswordValues);

    console.log(
      "Admin password updated successfully for adminId:",
      adminId
    );
    return { message: "Password updated successfully" };
  } catch (error) {
    throw error;
  }
};
//
//
//
//
// ADMIN VIEW PROFILE
Admin.viewProfile = async (adminId) => {
  const query =
    "SELECT adminId, adminName, adminImage, adminEmail, adminMobile, adminAddress, registeredDate FROM Admins WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1";

  try {
    const result = await dbQuery(query, [adminId]);

    if (result.length === 0) {
      throw new Error("Admin not found");
    }

    return result[0];
  } catch (error) {
    throw error;
  }
};
//
//
//
//
//
// ADMIN UPDATE PROFILE
Admin.updateProfile = async (updatedAdmin) => {
  const checkAdminQuery =
    "SELECT * FROM Admins WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1";

  try {
    const selectRes = await dbQuery(checkAdminQuery, [
      updatedAdmin.adminId,
    ]);

    if (selectRes.length === 0) {
      throw new Error("Admin not found");
    }

    const updateQuery = `
            UPDATE Admins
            SET
                updateStatus = 1,
                deleteStatus = 0,
                isActive = 1,
                adminName = ?,
                adminMobile = ?,
                adminAddress = ?
            WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1
        `;

    await dbQuery(updateQuery, [
      updatedAdmin.adminName,
      updatedAdmin.adminMobile,
      updatedAdmin.adminAddress,
      updatedAdmin.adminId,
    ]);

    const updatedDetailsRes = await dbQuery(checkAdminQuery, [
      updatedAdmin.adminId,
    ]);

    if (updatedDetailsRes.length === 0) {
      throw new Error("Error fetching updated admin details.");
    }

    return updatedDetailsRes[0]; // Return updated admin details
  } catch (error) {
    console.error("Error updating admin profile:", error);
    throw error;
  }
};
//
//
//
//
// ADMIN ADD NEWS
Admin.addNews = async (adminId, newFootballNews) => {
  try {
    const checkAdminQuery =
      "SELECT * FROM Admins WHERE adminId = ? AND isActive = 1 AND deleteStatus = 0";
    const checkAdminRes = await dbQuery(checkAdminQuery, [adminId]);

    if (checkAdminRes.length === 0) {
      throw new Error("Admin not found");
    }

    newFootballNews.adminId = adminId;
    const insertQuery = "INSERT INTO FootballNews SET ?";
    const insertRes = await dbQuery(insertQuery, newFootballNews);

    return insertRes.insertId;
  } catch (error) {
    console.error("Error adding football news:", error);
    throw error;
  }
};
//
//
//
//
// ADMIN ADD MATCH
Admin.addMatch = async (adminId, matchData) => {
  try {
      // Check if the admin exists
      const checkAdminQuery = "SELECT * FROM Admins WHERE adminId = ? AND isActive = 1 AND deleteStatus = 0";
      const [adminReslut] = await db.query(checkAdminQuery, [adminId]);

      if (adminReslut.length === 0) {
          throw new Error("Admin not found");
      }

      // Insert match data into the database
      const insertQuery = `
          INSERT INTO Matches (adminId, matchName, homeTeamName, awayTeamName, homeTeamImage, awayTeamImage, matchLocation, matchPrize, matchDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
          adminId,
          matchData.matchName,
          matchData.homeTeamName,
          matchData.awayTeamName,
          matchData.homeTeamImage,
          matchData.awayTeamImage,
          matchData.matchLocation,
          matchData.matchPrize,
          matchData.matchDate
      ];
      const [insertMatchData] = await db.query(insertQuery, values);

      // Return the ID of the added match
      return insertMatchData.insertId;
  } catch (error) {
      console.error("Error adding match:", error);
      throw error;
  }
};
//
//
//
//
// ADMIN VIEW ALL MATCHES
Admin.viewAllMatches = async (adminId) => {
  try {
    // Check if adminId exists
    const adminExistsQuery = "SELECT * FROM Admins WHERE adminId = ? AND deleteStatus = 0";
    const adminExistsResult = await db.query(adminExistsQuery, [adminId]);

    if (adminExistsResult[0].count === 0) {
      throw new Error("Admin not found");
    }

    // Proceed to fetch matches
    const query = "SELECT * FROM Matches WHERE endStatus = 0 AND deleteStatus = 0";
    const matches = await db.query(query);
    return matches;
  } catch (error) {
    console.error("Error viewing all matches:", error);
    throw error;
  }
};
//
//
//
//
// ADMIN VIEW ONE MATCH
Admin.viewOneMatch = async (adminId, matchId) => {
  try {
    // Check if adminId exists
    const adminExistsQuery = "SELECT * FROM Admins WHERE adminId = ? AND deleteStatus = 0";
    const adminExistsResult = await db.query(adminExistsQuery, [adminId]);

    if (adminExistsResult[0].count === 0) {
      throw new Error("Admin not found");
    }

    // Query to fetch the match details based on matchId
    const query = "SELECT * FROM Matches WHERE matchId = ? AND deleteStatus = 0";
    
    // Execute the query
    const match = await db.query(query, [matchId]);

    // Check if match is found
    if (match.length === 0) {
      throw new Error("Match not found");
    }

    // Return the match details
    return match[0];
  } catch (error) {
    console.error("Error viewing one match:", error);
    throw error;
  }
};
//
//
//
//
// ADMIN END MATCH
Admin.endOneMatch = async (adminId, matchId) => {
  try {
    // Check if the admin exists
    const checkAdminQuery =
      "SELECT * FROM Admins WHERE adminId = ? AND isActive = 1 AND deleteStatus = 0";
    const [adminResult] = await db.query(checkAdminQuery, [adminId]);

    if (adminResult.length === 0) {
      throw new Error("Admin not found");
    }

    // Update endStatus field of the match
    const updateQuery = `
      UPDATE Matches
      SET endStatus = 1
      WHERE matchId = ? AND deleteStatus = 0
    `;
    await db.query(updateQuery, [matchId]);

    console.log("Match ended successfully for matchId:", matchId);
    return { message: "Match ended successfully" };
  } catch (error) {
    console.error("Error ending match:", error);
    throw error;
  }
};
//
//
//
//
// ADMIN ADD MATCH POINT
Admin.addMatchPoint = async (adminId, matchData) => {
  try {
      // Check if the admin exists
      const checkAdminQuery = "SELECT * FROM Admins WHERE adminId = ? AND isActive = 1 AND deleteStatus = 0";
      const [adminResult] = await db.query(checkAdminQuery, [adminId]);

      if (adminResult.length === 0) {
          throw new Error("Admin not found");
      }

      // Insert match data into the database
      const insertQuery = `
          INSERT INTO Points (adminId, teamOneName, teamTwoName, teamOneImage, teamTwoImage, teamOneTotalGoalsInTheMatch, teamTwoTotalGoalsInTheMatch)
          VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
          adminId,
          matchData.teamOneName,
          matchData.teamTwoName,
          matchData.teamOneImage,
          matchData.teamTwoImage,
          matchData.teamOneTotalGoalsInTheMatch,
          matchData.teamTwoTotalGoalsInTheMatch
      ];
      const [insertMatchData] = await db.query(insertQuery, values);

      // Return the ID of the added match
      return insertMatchData.insertId;
  } catch (error) {
      console.error("Error adding match:", error);
      throw error;
  }
};
//
//
//
//
// ADMIN VIEW ALL MATCH POINTS
Admin.viewAllMatchPoints = async (adminId) => {
  try {
    // Check if the admin exists
    const adminExistsQuery = "SELECT * FROM Admins WHERE adminId = ? AND deleteStatus = 0 AND isActive = 1";
    const adminExistsResult = await dbQuery(adminExistsQuery, [adminId]);

    if (adminExistsResult.length === 0) {
      throw new Error("Admin not found");
    }

    // Query to fetch all match points, ordered by addedDate
    const query = `
      SELECT pointId, teamOneName, teamTwoName, teamOneImage, teamTwoImage,
             teamOneTotalGoalsInTheMatch, teamTwoTotalGoalsInTheMatch, addedDate
      FROM Points
      ORDER BY addedDate DESC
    `;
    
    // Execute the query
    const matchPoints = await dbQuery(query);

    // Return the match points
    return matchPoints;
  } catch (error) {
    console.error("Error viewing all match points:", error);
    throw error;
  }
};












module.exports = { Admin };
