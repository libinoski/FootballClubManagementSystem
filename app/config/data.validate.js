// data.validate.js
const path = require('path');





// Determine if a value is vacant or devoid.
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
const ID_REGEX = /^[0-9]+$/;
const INVALID_ID_MESSAGE = `Must be a valid numeric ID.`;


// Verify if a value is empty.
function isEmpty(value, fieldName) {
    if (isNullOrUndefined(value) || value.trim() === "") {
        return {
            isValid: false,
            message: `Field cannot be empty. Warning: This field is required.`
        };
    }
    return {
        isValid: true,
    };
}


//Validate password
function isValidPassword(password) {
    if (isNullOrUndefined(password) || password.trim() === "") {
        return {
            isValid: false,
            message: "Password can't be empty."
        };
    }
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);
    const isLengthValid = /^[a-zA-Z\d\W_]{8,12}$/.test(password);
    const messages = [];

    if (!hasLowerCase) {
        messages.push("Include at least one lowercase letter.");
    }

    if (!hasUpperCase) {
        messages.push("Include at least one uppercase letter.");
    }

    if (!hasDigit) {
        messages.push("Include at least one digit.");
    }

    if (!hasSpecialChar) {
        messages.push("Include at least one special character.");
    }

    if (!isLengthValid) {
        messages.push("Should be 8 to 12 characters long.");
    }

    return {
        isValid: messages.length === 0,
        message: messages.join(' ')
    };
}











// Verify the validity of an ID.
function isValidId(id, idName) {
    if (isNullOrUndefined(id) || id.trim() === "") {
        return {
            isValid: false,
            message: `ID can't be empty.`
        };
    }

    if (!ID_REGEX.test(id)) {
        return {
            isValid: false,
            message: INVALID_ID_MESSAGE
        };
    }

    return {
        isValid: true,
        fieldName: idName,
        message: `ID is valid.`
    };
}

// Validate content
function isValidContent(content) {
    if (isNullOrUndefined(content) || content.trim() === "") {
        return {
            isValid: false,
            message: `Content cannot be empty.`
        };
    }
    if (content.length > 2000) {
        return {
            isValid: false,
            message: `Content exceeds the maximum length of 2000 characters.`
        };
    }
    // Allow characters from different languages, punctuation, and whitespace
    const regex = /^[\p{L}\p{M}\p{N}\p{P}\p{Z}]+$/u;

    return {
        isValid: regex.test(content),
        message: "Content contains invalid characters."
    };
}





// Validate the title's correctness.
function isValidTitle(title) {
    if (isNullOrUndefined(title) || title.trim() === "") {
        return {
            isValid: false,
            message: "Title cannot be empty."
        };
    }

    // Modify this regex pattern based on your specific criteria for valid titles
    const regex = /^[\w\s!@#$%^&*()-_=+[\]{}|;:'",.<>/?]*$/;

    return {
        isValid: regex.test(title),
        message: "Title contains invalid characters."
    };
}




// Validate an image within a 1 MB size limit.
// Validate an image within a 1 MB size limit.
function isValidImageWith1MBConstraint(file) {
    console.log("Hospital image file:", file);

    if (isNullOrUndefined(file)) {
        return {
            isValid: false,
            message: 'Please upload a file.'
        };
    }

    // Use originalname if filename is not available
    const filename = file.filename || file.originalname;
    const allowedExtensions = /\.(jpg|jpeg|png|webp|heif)$/;
    const extensionIsValid = allowedExtensions.test(path.extname(filename.replace(/[^\w\-.]/g, '')).toLowerCase());
    const maxFileSize = 1 * 1024 * 1024; 
    const sizeIsValid = file.size <= maxFileSize;

    if (!extensionIsValid && !sizeIsValid) {
        return {
            isValid: false,
            message: 'Invalid file format and size exceeds the limit of 1 MB. Warning: Please upload a valid file within 1 MB size limit.'
        };
    } else if (!extensionIsValid) {
        return {
            isValid: false,
            message: 'Invalid file format. Only JPG, JPEG, PNG, WEBP, and HEIF files are allowed. Warning: Please upload a valid file.'
        };
    } else if (!sizeIsValid) {
        return {
            isValid: false,
            message: 'File size exceeds the limit of 1 MB. Warning: Please upload a file within 1 MB size limit.'
        };
    }

    return {
        isValid: true,
        message: 'File is valid'
    };
}




// Verify the validity of a mobile number.
function isValidMobileNumber(mobileNumber) {
    // Ensure mobileNumber is not null or undefined
    if (isNullOrUndefined(mobileNumber) || mobileNumber.trim() === "") {
        return {
            isValid: false,
            message: "Mobile number cannot be empty."
        };
    }

    // Remove spaces from the mobile number
    const sanitizedMobileNumber = mobileNumber.replace(/\s/g, '');

    return {
        isValid: /^\+91[6-9]\d{9}$|^[6-9]\d{9}$/.test(sanitizedMobileNumber),
        message: "Invalid Mobile Number"
    };
}






// Verify the correctness of an address.
function isValidAddress(address) {
    if (isNullOrUndefined(address) || address.trim() === "") {
        return {
            isValid: false,
            message: "Address cannot be empty."
        };
    }
    return {
        isValid: address.trim().length <= 100,
        message: "Address should not exceed 100 characters"
    };
}


// Verify the legitimacy of a website.
function isValidWebsite(website) {
    if (isNullOrUndefined(website) || website.trim() === "") {
        return {
            isValid: false,
            message: "Website is empty or null."
        };
    }
    
    // Remove spaces before the first letter or symbol
    website = website.replace(/^\s+/g, '');

    const regex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.([a-zA-Z]{2,})$/;
    return {
        isValid: regex.test(website),
        message: "Website must be in a valid format (e.g., http://www.example.com)"
    };
}



// Confirm the validity of an email address.
function isValidEmail(email) {
    if (isNullOrUndefined(email) || email.trim() === "") {
        return {
            isValid: false,
            message: "Email cannot be empty."
        };
    }
    return {
        isValid: /^[a-z0-9._!#$%&'*+/=?^_`{|}~-]+@[a-z]+(\.[a-z]+)+$/.test(email),
        message: "Invalid Email! "
    };
}





// Validate age (restrict to numbers with a maximum of 3 digits).
function isValidAge(age) {
    if (isNullOrUndefined(age) || age.trim() === "") {
        return {
            isValid: false,
            message: "Age cannot be empty."
        };
    }

    return {
        isValid: /^\d{1,3}$/.test(age),
        message: "Invalid Age. It must be a number up to 3 digits."
    };
}


// Confirm the validity of a name.
function isValidName(name) {
    if (isNullOrUndefined(name) || name.trim() === "") {
        return {
            isValid: false,
            message: "Name cannot be empty."
        };
    }

    return {
        isValid: /^[a-zA-Z\s]*$/.test(name),
        message: "Name must contain only alphabets"
    };
}


// Verify the legitimacy of an Aadhar number.
function isValidAadharNumber(aadharNumber) {
    // Ensure aadharNumber is not null or undefined
    if (isNullOrUndefined(aadharNumber) || aadharNumber.trim() === "") {
        return {
            isValid: false,
            message: "Aadhar number cannot be empty."
        };
    }

    // Remove spaces from the Aadhar number
    const sanitizedAadharNumber = aadharNumber.replace(/\s/g, '');

    return {
        isValid: /^\d{12}$/.test(sanitizedAadharNumber),
        message: "Aadhar Number must be of 12 digits"
    };
}




// Validate gender (permit only alphabetical characters and allow null values).
function isValidGender(gender) {
    if (isNullOrUndefined(gender)) {
        return {
            isValid: true,
            message: "Gender is not provided."
        };
    }

    return {
        isValid: /^[a-zA-Z]*$/.test(gender),
        message: "Invalid Gender. It must contain only characters."
    };
}


// Validate text with a maximum length of 2000 characters.
function isValidText(text) {
    if (isNullOrUndefined(text)) {
        return {
            isValid: false,
            message: "Text cannot be null."
        };
    }

    if (text.length > 2000) {
        return {
            isValid: false,
            message: "Text exceeds the maximum length of 2000 characters."
        };
    }

    return {
        isValid: true,
        message: "Text is valid."
    };
}


// Verify the validity of a date in formats: dd/mm/yyyy, yyyy/mm/dd, dd-mm-yyyy, yyyy-mm-dd
function isValidDate(dateString) {
    if (isNullOrUndefined(dateString) || dateString.trim() === "") {
        return {
            isValid: false,
            message: "Date cannot be empty."
        };
    }

    const dateFormats = [
        /^\d{2}\/\d{2}\/\d{4}$/,   // dd/mm/yyyy
        /^\d{4}\/\d{2}\/\d{2}$/,   // yyyy/mm/dd
        /^\d{2}-\d{2}-\d{4}$/,     // dd-mm-yyyy
        /^\d{4}-\d{2}-\d{2}$/      // yyyy-mm-dd
    ];

    for (const format of dateFormats) {
        if (format.test(dateString)) {
            return {
                isValid: true,
                message: "Date is valid."
            };
        }
    }

    return {
        isValid: false,
        message: "Invalid date format. Supported formats: dd/mm/yyyy, yyyy/mm/dd, dd-mm-yyyy, yyyy-mm-dd"
    };
}


// Validate a message with a maximum length of 500 characters.
function isValidMessage(message) {
    if (isNullOrUndefined(message) || message.trim() === "") {
        return {
            isValid: false,
            message: "Message cannot be null, undefined, or empty."
        };
    }

    if (message.length > 500) {
        return {
            isValid: false,
            message: "Message exceeds the maximum length of 500 characters."
        };
    }

    return {
        isValid: true,
        message: "Message is valid."
    };
}





// Validate cost as an integer or decimal number (cannot be null)
function isValidCost(cost) {
    if (isNullOrUndefined(cost)) {
        return {
            isValid: false,
            message: "Cost cannot be null."
        };
    }

    const sanitizedCost = cost.replace(/\s/g, "");

    if (isNullOrUndefined(sanitizedCost) || sanitizedCost === "") {
        return {
            isValid: false,
            message: "Cost cannot be null or empty after sanitization."
        };
    }

    const regex = /^\d+(\.\d+)?$/;

    return {
        isValid: regex.test(sanitizedCost),
        message: "Invalid Cost. It must be an integer or decimal number."
    };
}



// Export all validation functions
module.exports = {
    isEmpty,
    isValidId,
    isValidMobileNumber,
    isValidAddress,
    isValidWebsite,
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidImageWith1MBConstraint,
    isValidAadharNumber,
    isValidContent,
    isValidTitle,
    isValidAge,
    isValidGender,
    isValidText,
    isValidDate,
    isValidMessage,
    isValidCost
};
