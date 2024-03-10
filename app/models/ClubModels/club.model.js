const bcrypt = require("bcrypt");
const db = require("../db");
const { promisify } = require("util");
const dbQuery = promisify(db.query.bind(db));

// CLUB MODEL
const Club = function (club) {
    this.clubId = club.clubId;
    this.clubName = club.clubName;
    this.clubEmail = club.clubEmail;
    this.clubImage = club.clubImage;
    this.clubAddress = club.clubAddress;
    this.managerName = club.managerName;
    this.managerImage = club.managerImage;
    this.managerEmail = club.managerEmail;
    this.managerPhone = club.managerPhone;
    this.managerAddress = club.managerAddress;
    this.clubPassword = club.clubPassword;
    this.isActive = club.isActive;
    this.isSuspended = club.isSuspended;
    this.registeredDate = club.registeredDate;
};
//
//
//
// CLUB REGISTRATION
Club.registration = async (newClub) => {
    try {
        const checkEmailQuery =
            "SELECT * FROM Clubs WHERE clubEmail = ? AND isActive=1";

        const errors = {};

        const emailRes = await dbQuery(checkEmailQuery, [
            newClub.clubEmail,
        ]);
        if (emailRes.length > 0) {
            errors["Email"] = ["Email already exists"];
        }

        if (Object.keys(errors).length > 0) {
            throw { name: "ValidationError", errors: errors };
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(newClub.clubPassword, 10);
        newClub.clubPassword = hashedPassword;

        const insertQuery = "INSERT INTO Clubs SET ?";
        const insertRes = await dbQuery(insertQuery, newClub);

        return { clubId: insertRes.insertId, ...newClub };
    } catch (error) {
        console.error("Error during club registration in model:", error);
        throw error;
    }
};
//
//
//
//
// CLUB LOGIN
Club.login = async (email, password) => {
    const query =
        "SELECT * FROM Clubs WHERE clubEmail = ? AND isActive = 1";

    try {
        const result = await dbQuery(query, [email]);

        if (result.length === 0) {
            throw new Error("Club not found");
        }

        const club = result[0];

        const isMatch = await promisify(bcrypt.compare)(
            password,
            club.clubPassword
        );

        if (!isMatch) {
            throw new Error("Wrong password");
        }

        return club;
    } catch (error) {
        console.error("Error during club login:", error);
        throw error;
    }
};
//
//
//
//
// CLUB CHANGE PASSWORD
Club.changePassword = async (clubId, oldPassword, newPassword) => {
    const checkClubQuery =
        "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1";

    try {
        const selectRes = await dbQuery(checkClubQuery, [clubId]);
        if (selectRes.length === 0) {
            throw new Error("Club not found");
        }

        const club = selectRes[0];
        const isMatch = await promisify(bcrypt.compare)(
            oldPassword,
            club.clubPassword
        );

        if (!isMatch) {
            throw new Error("Incorrect old password");
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
            UPDATE Clubs
            SET
                updatedDate = CURRENT_DATE(),
                clubPassword = ?,
                passwordUpdateStatus = 1
            WHERE clubId = ? AND isActive = 1
        `;

        const updatePasswordValues = [hashedNewPassword, clubId];

        await dbQuery(updatePasswordQuery, updatePasswordValues);

        console.log(
            "Club password updated successfully for clubId:",
            clubId
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
// CLUB VIEW PROFILE
Club.viewProfile = async (clubId) => {
    const query =
        "SELECT clubId, clubName, clubImage, clubEmail, clubAddress, managerName, managerImage, managerEmail, managerMobile, registeredDate FROM Clubs WHERE clubId = ? AND isActive = 1";

    try {
        const result = await dbQuery(query, [clubId]);

        if (result.length === 0) {
            throw new Error("Club not found");
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
// CLUB UPDATE PROFILE
Club.updateProfile = async (updatedClub) => {
    const checkClubQuery =
        "SELECT * FROM Clubs WHERE clubId = ? AND isSuspended = 0 AND isActive = 1";

    try {
        const selectRes = await dbQuery(checkClubQuery, [
            updatedClub.clubId,
        ]);

        if (selectRes.length === 0) {
            throw new Error("Club not found");
        }

        const checkMobileQuery =
            "SELECT * FROM Clubs WHERE clubMobile = ? AND clubId != ? AND isSuspended = 0 AND isActive = 1";
        const mobileRes = await dbQuery(checkMobileQuery, [
            updatedClub.clubMobile,
            updatedClub.clubId,
        ]);

        if (mobileRes.length > 0) {
            throw new Error("Mobile Number Already Exists.");
        }

        const updateQuery = `
              UPDATE Clubs
              SET
                  updateStatus = 1,
                  isSuspended = 0,
                  isActive = 1,
                  clubName = ?,
                  clubMobile = ?,
                  clubAddress = ?,
                  managerName = ?
              WHERE clubId = ? AND isSuspended = 0 AND isActive = 1
          `;

        await dbQuery(updateQuery, [
            updatedClub.clubName,
            updatedClub.clubMobile,
            updatedClub.clubAddress,
            updatedClub.managerName,
            updatedClub.clubId,
        ]);

        const updatedDetailsRes = await dbQuery(checkClubQuery, [
            updatedClub.clubId,
        ]);

        if (updatedDetailsRes.length === 0) {
            throw new Error("Error fetching updated club details.");
        }

        return updatedDetailsRes[0]; // Return updated club details
    } catch (error) {
        console.error("Error updating club profile:", error);
        throw error;
    }
};
//
//
//
//
// CLUB VIEW ALL UNAPPROVED PLAYERS
Club.viewAllUnapprovedPlayers = async (clubId) => {
    try {
        const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended =0";
        const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);

        if (clubCheckResult.length === 0) {
            throw new Error("Club not found");
        }

        const viewUnapprovedPlayersQuery = `
        SELECT * FROM Players
        WHERE clubId = ? AND isApproved = 0 AND deleteStatus = 0 AND isSuspended = 0
      `;
        const unapprovedPlayers = await dbQuery(viewUnapprovedPlayersQuery, [clubId]);

        return unapprovedPlayers;
    } catch (error) {
        console.error("Error viewing unapproved players:", error);
        throw error;
    }
};
//
//
//
//
// CLUB VIEW ONE UNAPPROVED PLAYER
Club.viewOneUnapprovedPlayer = async (clubId, playerId) => {
    try {
        const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended =0";
        const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);

        if (clubCheckResult.length === 0) {
            throw new Error("Club not found");
        }

        const viewUnapprovedPlayerQuery = `
        SELECT * FROM Players
        WHERE clubId = ? AND playerId = ? AND isApproved = 0 AND deleteStatus = 0
      `;
        const unapprovedPlayerResult = await dbQuery(viewUnapprovedPlayerQuery, [clubId, playerId]);

        if (unapprovedPlayerResult.length === 0) {
            throw new Error("Unapproved player not found or already approved");
        }

        return unapprovedPlayerResult[0];
    } catch (error) {
        console.error("Error viewing unapproved player:", error);
        throw error;
    }
};
//
//
//
//
// CLUB APPROVE ONE PLAYER
Club.approveOneplayer = async (clubId, playerId) => {
    try {
        // Validate existence of the club
        const clubCheckQuery = "SELECT * FROM clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
        const clubCheckRes = await dbQuery(clubCheckQuery, [clubId]);
        if (clubCheckRes.length === 0) {
            throw new Error("club not found");
        }

        // Validate existence and status of the Player
        const playerCheckQuery = "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND isApproved = 0 AND deleteStatus = 0";
        const playerCheckRes = await dbQuery(playerCheckQuery, [playerId, clubId]);
        if (playerCheckRes.length === 0) {
            throw new Error("Player not found or already approved");
        }

        // Approve the Player
        const approveQuery = "UPDATE Players SET isApproved = 1 WHERE playerId = ? AND clubId = ?";
        await dbQuery(approveQuery, [playerId, clubId]);

        return playerId; // Return the approved playerId
    } catch (error) {
        console.error("Error in approveplayer model:", error);
        throw error;
    }
};
//
//
//
//
// CLUB VIEW ALL PLAYERS
Club.viewAllPlayers = async (clubId) => {
    try {
        // Check if the club exists and is active
        const checkclubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
        const clubCheckResult = await dbQuery(checkclubQuery, [clubId]);

        if (clubCheckResult.length === 0) {
            throw new Error("club not found");
        }

        // Fetch all players associated with the club
        const viewAllPlayersQuery =
            "SELECT * FROM Players WHERE clubId = ? AND isActive = 1 AND isSuspended = 0 AND isApproved = 1 AND deleteStatus = 0 ";
        const allPlayers = await dbQuery(viewAllPlayersQuery, [clubId]);

        return allPlayers;
    } catch (error) {
        console.error("Error viewing all players:", error);
        throw error;
    }
};
//
//
//
//
// CLUB VIEW ONE PLAYER
Club.viewOnePlayer = async (clubId, playerId) => {
    try {
      const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
  
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      const viewPlayerQuery =
        "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND isActive = 1 AND isSuspended = 0 AND isApproved = 1";
      const player = await dbQuery(viewPlayerQuery, [playerId, clubId]);
  
      if (player.length === 0) {
        throw new Error("Player not found for this club");
      }
  
      return player[0];
    } catch (error) {
      console.error("Error viewing player:", error);
      throw error;
    }
};
//
//
//
//
//
// CLUB DELETE ONE PLAYER
Club.deleteOnePlayer = async (clubId, playerId) => {
    try {
        // Validate existence of the club
        const clubCheckQuery = "SELECT * FROM clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
        const clubCheckRes = await dbQuery(clubCheckQuery, [clubId]);
        if (clubCheckRes.length === 0) {
            throw new Error("club not found");
        }

        // Validate existence and status of the Player
        const playerCheckQuery = "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND deleteStatus = 0";
        const playerCheckRes = await dbQuery(playerCheckQuery, [playerId, clubId]);
        if (playerCheckRes.length === 0) {
            throw new Error("Player not found or already deleted");
        }

        // Mark the Player as deleted
        const deleteQuery = "UPDATE Players SET deleteStatus = 1 WHERE playerId = ? AND clubId = ?";
        await dbQuery(deleteQuery, [playerId, clubId]);

        return playerId; // Return the deleted playerId
    } catch (error) {
        console.error("Error deleting Player:", error);
        throw error;
    }
};
//
//
//
//
// CLUB SEARCH PLAYERS
Club.searchPlayers = async (clubId, searchQuery) => {
    try {
      // First, check if the club is active and not deleted
      const checkClubQuery = `
        SELECT * FROM Clubs 
        WHERE clubId = ? 
          AND isActive = 1 
          AND deleteStatus = 0
      `;
  
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
  
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found or not active");
      }
  
      const query = `
        SELECT 
          playerId, 
          clubId,
          playerName, 
          playerEmail, 
          playerMobile, 
          playerImage, 
          playerAge, 
          playerCountry, 
          playerPosition, 
          playerAddress
        FROM Players 
        WHERE clubId = ? 
          AND (
            playerId LIKE ? OR
            playerName LIKE ? OR
            playerEmail LIKE ? OR
            playerMobile LIKE ? OR
            playerAddress LIKE ?
          )
      `;
  
      const searchParams = [
        clubId,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        `%${searchQuery}%`
      ];
  
      const result = await dbQuery(query, searchParams);
  
      if (result.length === 0) {
        throw new Error("No players found matching the criteria");
      }
  
      return result;
    } catch (error) {
      console.error("Error searching players:", error);
      throw error;
    }
};
//
//
//
//
//
// CLUB SUSPEND PLAYER
Club.suspendOnePlayer = async (playerId, clubId) => {
    try {
      // Validate existence of the club
      const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      // Validate existence and active status of the player
      const checkPlayerQuery = "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended = 0";
      const playerCheckResult = await dbQuery(checkPlayerQuery, [playerId, clubId]);
      if (playerCheckResult.length === 0) {
        throw new Error("Player not found or already suspended");
      }
  
      // Suspend the player
      const suspendQuery = "UPDATE Players SET isSuspended = 1, isActive = 0 WHERE playerId = ? AND clubId = ?";
      await dbQuery(suspendQuery, [playerId, clubId]);
  
      return true; // Indicates successful suspension
    } catch (error) {
      console.error("Error suspending player:", error);
      throw error;
    }
};
//
//
//
//
//
//
// CLUB UNSUSPEND PLAYER
Club.unsuspendOnePlayer = async (playerId, clubId) => {
    try {
      // Validate existence of the club
      const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      // Validate existence and suspended status of the player
      const checkPlayerQuery = "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended = 1";
      const playerCheckResult = await dbQuery(checkPlayerQuery, [playerId, clubId]);
      if (playerCheckResult.length === 0) {
        throw new Error("Player not found or not suspended");
      }
  
      // Unsuspend the player
      const unsuspendQuery = "UPDATE Players SET isSuspended = 0, isActive = 1 WHERE playerId = ? AND clubId = ?";
      await dbQuery(unsuspendQuery, [playerId, clubId]);
  
      return true; // Indicates successful unsuspension
    } catch (error) {
      console.error("Error unsuspending player:", error);
      throw error;
    }
};
//
//
//
//
//
// CLUB VIEW ALL SUSPENDED PLAYERS
Club.viewAllSuspendedPlayers = async (clubId) => {
    try {
      const checkClubQuery =
        "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
  
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      const viewSuspendedPlayersQuery =
        "SELECT * FROM Players WHERE clubId = ? AND isSuspended = 1 AND isActive = 0 AND deleteStatus = 0";
      const suspendedPlayers = await dbQuery(viewSuspendedPlayersQuery, [clubId]);
  
      return suspendedPlayers;
    } catch (error) {
      console.error("Error viewing all suspended players:", error);
      throw error;
    }
};
//
//
//
//
//
// CLUB VIEW ONE SUSPENED PLAYER
Club.viewOneSuspendedPlayer = async (playerId, clubId) => {
    try {
      const checkClubQuery =
        "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
  
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      const viewOneSuspendedPlayerQuery =
        "SELECT * FROM Players WHERE playerId = ? AND clubId = ? AND isSuspended = 1 AND isActive = 0 AND deleteStatus = 0";
      const suspendedPlayerDetails = await dbQuery(viewOneSuspendedPlayerQuery, [
        playerId,
        clubId,
      ]);
  
      if (suspendedPlayerDetails.length === 0) {
        throw new Error("Suspended player not found");
      }
  
      return suspendedPlayerDetails[0]; // Returning the suspended player details directly
    } catch (error) {
      console.error("Error viewing suspended player:", error);
      throw error;
    }
};
//
//
//
//
//
// CLUB SEND NOTIFICATION TO PLAYER
Club.sendNotificationToPlayer = async (clubId, playerId, notificationMessage) => {
    try {
      // Check if the club exists and is active
      const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
      const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
      if (clubCheckResult.length === 0) {
        throw new Error("Club not found");
      }
  
      // Check if the player exists and is active
      const checkPlayerQuery = "SELECT * FROM Players WHERE playerId = ? AND isActive = 1 AND deleteStatus = 0";
      const playerCheckResult = await dbQuery(checkPlayerQuery, [playerId]);
      if (playerCheckResult.length === 0) {
        throw new Error("Player not found or not active");
      }
  
      // Insert the notification into the database
      const insertNotificationQuery = "INSERT INTO Notification_To_Players (clubId, playerId, message) VALUES (?, ?, ?)";
      const result = await dbQuery(insertNotificationQuery, [clubId, playerId, notificationMessage]);
  
      // Retrieve the inserted notification ID
      const notificationId = result.insertId;
  
      // Construct the notification details object
      const notificationDetails = {
        notificationId: notificationId,
        clubId: clubId,
        playerId: playerId,
        message: notificationMessage,
      };
  
      return notificationDetails;
    } catch (error) {
      console.error("Error sending notification to player:", error);
      throw error;
    }
};
//
//
//
//
//
  
  


module.exports = { Club };