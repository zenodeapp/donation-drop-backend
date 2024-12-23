const express = require("express");
const { fixupENS, verifySignature, validateTimestamp } = require("../helpers");
const { donationSave, signatureValidityInMin } = require("../db");

const router = express.Router();

router.post("/", async (req, res, next) => {
  let { ethAddress, namAddress, message, signature } = req.body;

  try {

    // ens to addr or throw error
    ethAddress = fixupENS(ethAddress)

    // Validate the timestamp
    const { messageTime, currentTime } = validateTimestamp(
      message,
      signatureValidityInMin
    );

    // Verify the signatures - will throw an error on failure
    verifySignature(message, signature, ethAddress);

    // Save donation - will throw an error on failure
    donationSave({
      ethAddress,
      namAddress,
      message,
      messageTime,
      verifiedTime: currentTime,
    })

    res
      .status(200)
      .json({ success: true, message: "Address verified", data: namAddress });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
