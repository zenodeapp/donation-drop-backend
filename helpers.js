const { ethers } = require("ethers");
const { WhitelistedError } = require("./errors");

const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA}`);

async function fixupENS(addr) {
  if (ethers.isAddress(addr)) return addr
  addr = await provider.resolveName(addr)
  if(!addr) throw new Error('Cannot resolve ethereum address')
  return addr
}

const validateTimestamp = (message, validityInMinutes) => {
  const timestamp = message.split(":")[1]?.trim();
  const currentTime = new Date().getTime();
  const messageTime = parseInt(timestamp, 10);

  if (isNaN(messageTime)) {
    throw new WhitelistedError("INVALID_TIMESTAMP");
  }

  if (Math.abs(currentTime - messageTime) > validityInMinutes * 60 * 1000) {
    throw new WhitelistedError("SIGNATURE_EXPIRED");
  }

  return { messageTime, currentTime };
};

const verifySignature = (message, signature, expectedAddress) => {
  const recoveredAddress = ethers.verifyMessage(message, signature);
  const address = recoveredAddress.toLowerCase();

  // simply return the recovered address if no expected address is given
  if (!expectedAddress) return address;

  if (address !== expectedAddress.toLowerCase()) {
    throw new WhitelistedError("VERIFICATION_FAILED");
  }

  return address;
};

module.exports = {
  fixupENS,
  validateTimestamp,
  verifySignature,
};
