const express = require("express");
const { verifySignature, validateTimestamp } = require("../helpers");
const { donations, signatureValidityInMin } = require("../shared");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { ethAddress, namAddress, message, signature } = req.body;

  try {
    // Validate the timestamp
    const { messageTime, currentTime } = validateTimestamp(
      message,
      signatureValidityInMin
    );

    // Verify the signature
    verifySignature(message, signature, ethAddress);

    // TODO: Update the donations database
    donations[ethAddress.toLowerCase()] = {
      namAddress,
      messageTime,
      verifiedTime: currentTime,
    };

    console.log(
      `Added: ${ethAddress} ${namAddress} ${messageTime} ${currentTime}.`
    );

    res
      .status(200)
      .json({ success: true, message: "Address verified", data: namAddress });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
