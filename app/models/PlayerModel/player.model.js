const bcrypt = require("bcrypt");
const db = require("../db");
const { promisify } = require("util");
const dbQuery = promisify(db.query.bind(db));
//
//
//
//
// Player MODEL
const Player = function (player) {
    this.playerId = player.playerId;
    this.clubId = player.clubId;
    this.clubName = player.clubName;
    this.playerName = player.playerName;
    this.playerImage = player.playerImage;
    this.playerAge = player.playerAge;
    this.playerEmail = player.playerEmail;
    this.playerPosition = player.playerPosition;
    this.playerAddress = player.playerAddress;
    this.managerName = player.managerName;
    this.isActive = player.isActive;
    this.isInjured = player.isInjured;
    this.updateStatus = player.updateStatus;
    this.isSuspended = player.isSuspended;
    this.registeredDate = player.registeredDate;
};
//
//
//
//
//
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
//
//
//
// VIEW ALL CLUBS
Player.viewAllClubs = async () => {
    try {
        const viewAllClubsQuery = `
        SELECT *
        FROM Clubs
        WHERE isActive = 1 AND isSuspended = 0
      `;
        const allClubs = await dbQuery(viewAllClubsQuery);

        if (allClubs.length === 0) {
            throw new Error("No clubs found");
        }

        return allClubs;
    } catch (error) {
        throw error;
    }
};
//
//
//
//
//
// PLAYER REGISTER
Player.registration = async (newPlayer, clubId) => {
    try {
        // Fetch clubName and managerName based on clubId
        const clubQuery = "SELECT clubId, clubName, managerName FROM Clubs WHERE clubId = ?";
        const clubResult = await dbQuery(clubQuery, [clubId]);

        if (clubResult.length === 0) {
            throw { message: "Club not found" };
        }

        const { clubName, managerName } = clubResult[0];

        // Check if email already exists
        const checkEmailQuery = "SELECT * FROM Players WHERE playerEmail = ? AND isActive = 1";
        const emailRes = await dbQuery(checkEmailQuery, [newPlayer.playerEmail]);

        if (emailRes.length > 0) {
            throw { name: "ValidationError", errors: { Email: ["Email already exists"] } };
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(newPlayer.playerPassword, 10);
        newPlayer.playerPassword = hashedPassword;

        // Add clubName, clubId, and managerName to the newPlayer object
        newPlayer.clubId = clubId;
        newPlayer.clubName = clubName;
        newPlayer.managerName = managerName;

        // Insert the new player into the Players table
        const insertQuery = "INSERT INTO Players SET ?";
        const insertRes = await dbQuery(insertQuery, [newPlayer]);

        return { playerId: insertRes.insertId, ...newPlayer };
    } catch (error) {
        console.error("Error during player registration in model:", error);
        throw error;
    }
};
//
//
//
//
//
// PLAYER LOGIN
Player.login = async (email, password) => {
    const query =
        "SELECT * FROM Players WHERE playerEmail = ? AND isActive = 1 AND deleteStatus = 0";

    try {
        const result = await dbQuery(query, [email]);

        if (result.length === 0) {
            throw new Error("player not found");
        }

        const player = result[0];

        const isMatch = await promisify(bcrypt.compare)(
            password,
            player.playerPassword
        );

        if (!isMatch) {
            throw new Error("Wrong password");
        }

        return player;
    } catch (error) {
        console.error("Error during player login:", error);
        throw error;
    }
};
//
//
//
//
// PLAYER CHANGE PASSWORD
Player.changePassword = async (playerId, oldPassword, newPassword) => {
    const checkPlayerQuery =
        "SELECT * FROM Players WHERE playerId = ? AND isActive = 1";

    try {
        const selectRes = await dbQuery(checkPlayerQuery, [playerId]);
        if (selectRes.length === 0) {
            throw new Error("Player not found");
        }

        const player = selectRes[0];
        const isMatch = await promisify(bcrypt.compare)(
            oldPassword,
            player.playerPassword
        );

        if (!isMatch) {
            throw new Error("Incorrect old password");
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
            UPDATE Players
            SET
                updatedDate = CURRENT_DATE(),
                playerPassword = ?,
                passwordUpdateStatus = 1
            WHERE playerId = ? AND isActive = 1
        `;

        const updatePasswordValues = [hashedNewPassword, playerId];

        await dbQuery(updatePasswordQuery, updatePasswordValues);

        console.log(
            "Player password updated successfully for playerId:",
            playerId
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
// PLAYER VIEW PROFILE
Player.viewProfile = async (playerId) => {
  const query =
  "SELECT playerId, clubId, clubName, playerName, playerImage, playerAge, playerEmail, playerMobile, playerCountry, playerPosition, playerAddress, managerName, registeredDate FROM Players WHERE playerId = ? AND isActive = 1";

try {
  const result = await dbQuery(query, [playerId]);

  if (result.length === 0) {
    throw new Error("Player not found");
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
// PLAYER UPDATE PROFILE
Player.updateProfile = async (updatedPlayer) => {
    const checkPlayerQuery =
        "SELECT * FROM Players WHERE playerId = ? AND deleteStatus = 0 AND isSuspended = 0 AND isActive = 1";

    try {
        const selectRes = await dbQuery(checkPlayerQuery, [
            updatedPlayer.playerId,
        ]);

        if (selectRes.length === 0) {
            throw new Error("Player not found");
        }

        const checkMobileQuery =
            "SELECT * FROM Players WHERE playerMobile = ? AND playerId != ? AND deleteStatus = 0 AND isSuspended = 0 AND isActive = 1";
        const mobileRes = await dbQuery(checkMobileQuery, [
            updatedPlayer.playerMobile,
            updatedPlayer.playerId,
        ]);

        if (mobileRes.length > 0) {
            throw new Error("Mobile Number Already Exists.");
        }

        const updateQuery = `
              UPDATE Players
              SET
                  updateStatus = 1,
                  isSuspended = 0,
                  isActive = 1,
                  playerName = ?,
                  playerAge = ?,
                  playerMobile = ?,
                  playerCountry = ?,
                  playerPosition = ?,
                  playerAddress = ?
              WHERE playerId = ? AND deleteStatus = 0 AND isSuspended = 0 AND isActive = 1
          `;

        await dbQuery(updateQuery, [
            updatedPlayer.playerName,
            updatedPlayer.playerAge,
            updatedPlayer.playerMobile,
            updatedPlayer.playerCountry,
            updatedPlayer.playerPosition,
            updatedPlayer.playerAddress,
            updatedPlayer.playerId,
        ]);

        const updatedDetailsRes = await dbQuery(checkPlayerQuery, [
            updatedPlayer.playerId,
        ]);

        if (updatedDetailsRes.length === 0) {
            throw new Error("Error fetching updated player details.");
        }

        return updatedDetailsRes[0]; // Return updated player details
    } catch (error) {
        console.error("Error updating player profile:", error);
        throw error;
    }
};
//
//
//
//
// PLAYER VIEW ALL NOTIFICATIONS FROM CLUB
Player.viewAllNotifications = async (playerId) => {
    try {
        // Fetch patient details
        const playerQuery = `
            SELECT *
            FROM Players
            WHERE playerId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended = 0
        `;
        const playerQueryResult = await dbQuery(playerQuery, [playerId]);

        if (playerQueryResult.length === 0) {
            throw new Error("player not found");
        }

        // Fetch all notifications for the patient
        const viewAllNotificationsQuery = `
            SELECT *
            FROM Notification_To_Players
            WHERE playerId = ? AND isSuccess = 1
        `;
        const allNotifications = await dbQuery(viewAllNotificationsQuery, [playerId]);

        // Check if there are no notifications found
        if (allNotifications.length === 0) {
            throw new Error("No successful notifications found for this player");
        }

        return allNotifications; // Return notifications
    } catch (error) {
        console.error("Error viewing all notifications for player:", error);
        throw error;
    }
};
//
//
//
//
// PLAYER SEND LEAVE REQUEST TO CLUB
Player.sendLeaveRequestToClub = async (clubId, playerId, message) => {
    try {
        // Check if the club exists and is active
        const checkClubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0";
        const clubCheckResult = await dbQuery(checkClubQuery, [clubId]);
        if (clubCheckResult.length === 0) {
            throw new Error("Club not found");
        }

        // Fetch player name from the Players table
        const fetchPlayerNameQuery = "SELECT playerName FROM Players WHERE playerId = ? AND isActive = 1 AND deleteStatus = 0";
        const playerNameResult = await dbQuery(fetchPlayerNameQuery, [playerId]);
        if (playerNameResult.length === 0) {
            throw new Error("Player not found or not active");
        }
        const playerName = playerNameResult[0].playerName;

        // Insert the leave request into the database
        const insertLeaveRequestQuery = "INSERT INTO Leave_Request_To_Club (clubId, playerId, playerName, message) VALUES (?, ?, ?, ?)";
        const result = await dbQuery(insertLeaveRequestQuery, [clubId, playerId, playerName, message]);

        // Retrieve the inserted leave request ID
        const leaveRequestId = result.insertId;

        // Construct the leave request details object
        const leaveRequestDetails = {
            leaveRequestId: leaveRequestId,
            clubId: clubId,
            playerId: playerId,
            playerName: playerName,
            message: message,
        };

        return leaveRequestDetails;
    } catch (error) {
        console.error("Error sending leave request to club:", error);
        throw error;
    }
};






module.exports = { Player,Club };
