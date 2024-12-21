const { WhitelistedError } = require("../errors");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Check if the error is a WhitelistedError
  if (err instanceof WhitelistedError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // For unexpected errors, send a generic message
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again later.",
  });
};

module.exports = errorHandler;
