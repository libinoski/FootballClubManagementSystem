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
//





module.exports = { Player,Club };
