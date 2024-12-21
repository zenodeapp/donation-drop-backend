const express = require("express");
const { verifySignature, validateTimestamp } = require("../helpers");
const { donations, signatureValidityInMin } = require("../shared");

const router = express.Router();

router.post("/", (req, res, next) => {
  const { signature, message } = req.body;

  try {
    // Validate the timestamp
    validateTimestamp(message, signatureValidityInMin);

    // Verify the signature
    const recoveredAddress = verifySignature(message, signature);

    // TODO: query tnam in a database
    const donation = donations[recoveredAddress.toLowerCase()];

    res.status(200).json({
      success: !!donation,
      message: donation ? "Existing user found" : "No existing user found",
      data: donation ? donation.namAddress : undefined,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
