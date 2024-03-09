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
//


module.exports = { Club };