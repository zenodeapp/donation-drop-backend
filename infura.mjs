
import {
  JsonRpcProvider,
  parseEther,
  formatEther,
  Interface,
  keccak256
} from "ethers";

const fromBlock = 21454322

const MIN_TOTAL_WEI = parseEther("0.03"); // ~0.03 ETH
const MAX_TOTAL_WEI = parseEther("0.3");  // ~0.3 ETH

const INFURA_PROJECT_ID = process.env.INFURA;
const provider = new JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`);

const contractAddress = "0x15322B546e31F5Bfe144C4ae133A9Db6F0059fe3";
const eventSignature = "Transfer(address,address,uint256)";

const eventTopic = keccak256(new TextEncoder().encode(eventSignature));
const iface = new Interface([`event ${eventSignature}`]);

const filter = {
  address: contractAddress,
  fromBlock,
  toBlock: "latest",
  topics: [eventTopic]
};

// TODO improve
const claims = [
  { address: "0x1111...1111" },
  { address: "0x2222...2222" },
  { address: "0x3333...3333" }
];

//
// get all recent transfers on https://etherscan.io/address/0x15322B546e31F5Bfe144C4ae133A9Db6F0059fe3
//
// filter the transactions by the claims
//

async function validateDonations() {

  //
  // fetch transfers on the address
  //

  let logs
  try {
    logs = await provider.getLogs(filter);
  } catch(err) {
    console.error("Error getting logs from infura",err)
    return
  }

  //
  // throwaway unclaimed
  //

console.log(logs)

  const validated = [];
  for (let log of logs) {
    const parsedLog = iface.parseLog(log);
    const from = parsedLog.args[0];
    const to = parsedLog.args[1];
    const value = parsedLog.args[2];
    const claimed = claims.find((c) => c.address.toLowerCase() === from.toLowerCase());
    if (claimed) {
      validated.push({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        from,
        to,
        value
      });
    }
  }

console.log(validated)

  //
  // total up each claim address donations per address
  //

  const totalsMap = {};
  for (let entry of validated) {
    const fromAddress = entry.from.toLowerCase();
    const donationValue = entry.value; // BigNumber from ethers
    if (!totalsMap[fromAddress]) {
      totalsMap[fromAddress] = 0n;
    }
    totalsMap[fromAddress] += entry.value;
  }

console.log(totalsMap)

  //
  // Build an array of totals per address with min/max boundaries
  //

  const totalsPerAddress = [];  
  for (const [address, total] of Object.entries(totalsMap)) {
    if (total.lt(MIN_TOTAL_WEI)) continue
    let adjusted = total.gt(MAX_TOTAL_WEI) ? MAX_TOTAL_WEI : total
    totalsPerAddress.push({
      address,
      total: formatEther(adjusted),
      original: formatEther(total),
    });
  }

console.log(totalsPerAddress)

  return totalsPerAddress;
}

validateDonations()


