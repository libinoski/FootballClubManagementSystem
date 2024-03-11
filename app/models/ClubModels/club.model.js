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
Club.sendNotificationToPlayer = async (clubId, playerId, message) => {
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
      const result = await dbQuery(insertNotificationQuery, [clubId, playerId, message]);
  
      // Retrieve the inserted notification ID
      const notificationId = result.insertId;
  
      // Construct the notification details object
      const notificationDetails = {
        notificationId: notificationId,
        clubId: clubId,
        playerId: playerId,
        message: message,
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
// CLUB ADD ONE INJURY UPDATE
Club.addOneInjuryUpdate = async (playerId, clubId, injuryData) => {
    try {
        // Check if the club exists and is active
        const clubQuery = "SELECT * FROM Clubs WHERE clubId = ? AND isActive = 1";
        const [clubResult] = await db.query(clubQuery, [clubId]);
        
        if (clubResult.length === 0) {
            throw new Error('Club not found');
        }

        // Check if the player exists and is associated with the specified club
        const playerQuery = "SELECT * FROM Players WHERE playerId = ? AND clubId = ?";
        const [playerResult] = await db.query(playerQuery, [playerId, clubId]);
        
        if (playerResult.length === 0) {
            throw new Error('Player not found or not associated with the specified club');
        }

        // Insert injury data into the database
        const insertInjuryQuery = `
            INSERT INTO Injuries
            (playerId, clubId, playerName, playerImage, clubName, injuryType, averageRecoveryTime)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const insertInjuryValues = [
            playerId,
            clubId,
            playerResult[0].playerName,
            playerResult[0].playerImage,
            clubResult[0].clubName,
            injuryData.injuryType,
            injuryData.averageRecoveryTime
        ];

        await db.query(insertInjuryQuery, insertInjuryValues);

        // Return the inserted injury data along with playerId and clubId
        return {
            playerId,
            clubId,
            ...injuryData
        };
    } catch (error) {
        console.error('Error in addOneInjuryUpdate:', error);
        throw error;
    }
};
//
//
//
//
// CLUB VIEW ALL LEAVE REQUESTS
Club.viewAllLeaveRequests = async (clubId) => {
    try {
        // Fetch club details
        const clubQuery = `
            SELECT *
            FROM Players
            WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0 AND isSuspended = 0
        `;
        const clubQueryResult = await dbQuery(clubQuery, [clubId]);

        if (clubQueryResult.length === 0) {
            throw new Error("club not found");
        }

        // Fetch all notifications for the patient
        const viewAllleaveRequestsQuery = `
            SELECT *
            FROM Leave_Request_To_Club
            WHERE clubId = ? AND isSuccess = 1 AND isApproved = 0
        `;
        const allLeaveRequests = await dbQuery(viewAllleaveRequestsQuery, [clubId]);

        // Check if there are no leave requests found
        if (allLeaveRequests.length === 0) {
            throw new Error("No successful leave requests found for this player");
        }

        return allLeaveRequests; // Return leave requests
    } catch (error) {
        console.error("Error viewing all leave requests for player:", error);
        throw error;
    }
};
//
//
//
//
//
// CLUB VIEW ONE LEAVE REQUEST
Club.viewOneLeaveRequest = async (leaveRequestId, clubId) => {
    try {
        // Fetch club details to ensure the club exists and is active
        const clubQuery = `
            SELECT *
            FROM Clubs
            WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0
        `;
        const clubQueryResult = await dbQuery(clubQuery, [clubId]);

        if (clubQueryResult.length === 0) {
            throw new Error("Club not found or inactive");
        }

        // Fetch the leave request using leaveRequestId and clubId
        const viewOneLeaveRequestQuery = `
            SELECT *
            FROM Leave_Request_To_Club
            WHERE leaveRequestId = ? AND clubId = ? AND isSuccess = 1 AND isApproved = 0
        `;
        const leaveRequest = await dbQuery(viewOneLeaveRequestQuery, [leaveRequestId, clubId]);

        // Check if the leave request exists
        if (leaveRequest.length === 0) {
            throw new Error("Leave request not found or not eligible for viewing");
        }

        return leaveRequest[0]; // Return the leave request
    } catch (error) {
        console.error("Error viewing leave request:", error);
        throw error;
    }
};
//
//
//
//
// CLUB APPROVE ONE LEAVE REQUEST
Club.approveOneLeaveRequest = async (leaveRequestId, clubId) => {
    try {
        // Fetch club details to ensure the club exists and is active
        const clubQuery = `
            SELECT *
            FROM Clubs
            WHERE clubId = ? AND isActive = 1 AND deleteStatus = 0
        `;
        const clubQueryResult = await dbQuery(clubQuery, [clubId]);

        if (clubQueryResult.length === 0) {
            throw new Error("Club not found or inactive");
        }

        // Fetch the leave request using leaveRequestId and clubId
        const viewOneLeaveRequestQuery = `
            SELECT *
            FROM Leave_Request_To_Club
            WHERE leaveRequestId = ? AND clubId = ? AND isSuccess = 1 AND isApproved = 0
        `;
        const leaveRequest = await dbQuery(viewOneLeaveRequestQuery, [leaveRequestId, clubId]);

        // Check if the leave request exists
        if (leaveRequest.length === 0) {
            throw new Error("Leave request not found or not eligible for approval");
        }

        // Update the leave request to mark it as approved
        const approveLeaveRequestQuery = `
            UPDATE Leave_Request_To_Club
            SET isApproved = 1
            WHERE leaveRequestId = ? AND clubId = ?
        `;
        await dbQuery(approveLeaveRequestQuery, [leaveRequestId, clubId]);

        return leaveRequestId; // Return the approved leave request ID
    } catch (error) {
        console.error("Error approving leave request:", error);
        throw error;
    }
};
//
//
//
//
//
// CLUB VIEW ALL MATCHES
Club.viewAllMatches = async (clubId) => {
    try {
    // Check if clubId exists
    const clubExistsQuery = "SELECT * FROM Clubs WHERE clubId = ? AND deleteStatus = 0 AND isSuspended = 0";
    const clubExistsResult = await db.query(clubExistsQuery, [clubId]);

    if (clubExistsResult[0].count === 0) {
      throw new Error("Club not found");
    }
        const query = "SELECT * FROM Matches WHRE endStatus = 0 AND deleteStatus = 0";
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
//
// CLUB VIEW ONE MATCH
Club.viewOneMatch = async (clubId,matchId) => {
    try {

    // Check if clubId exists
    const clubExistsQuery = "SELECT * FROM Clubs WHERE clubId = ? AND deleteStatus = 0 AND isSuspended = 0";
    const clubExistsResult = await db.query(clubExistsQuery, [clubId]);

    if (clubExistsResult[0].count === 0) {
      throw new Error("Club not found");
    }

        // Query to fetch the match details based on matchId
        const query = "SELECT * FROM Matches WHERE matchId = ? AND deleteStatus = 0";
        
        // Execute the query
        const match = await dbQuery(query, [matchId]);

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
// CLUB VIEW ALL MATCH POINTS
Club.viewAllMatchPoints = async (clubId) => {
    try {
      // Check if the club exists
      const clubExistsQuery = "SELECT * FROM Clubs WHERE clubId = ? AND deleteStatus = 0 AND isActive = 1";
      const clubExistsResult = await dbQuery(clubExistsQuery, [clubId]);
  
      if (clubExistsResult.length === 0) {
        throw new Error("Club not found");
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
  



module.exports = { Club };