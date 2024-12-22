import {
  JsonRpcProvider,
  keccak256,
  toUtf8Bytes,
  Interface
} from "ethers";

const INFURA_API_KEY = process.env.INFURA
const provider = new JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`);
const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const eventSignature = "Transfer(address,address,uint256)";
const transferTopic = keccak256(toUtf8Bytes(eventSignature));
const iface = new Interface([`event Transfer(address indexed from, address indexed to, uint256 value)`]);

const filter = {
  address: usdtAddress,
  fromBlock: 21454332,
  toBlock: "latest",
  topics: [transferTopic],
};

async function main() {

  const logs = await provider.getLogs(filter);
  
  const toDecode = logs.slice(0, 5);
  for (let i = 0; i < toDecode.length; i++) {
    const parsed = iface.parseLog(toDecode[i]);
    console.log(`Log #${i + 1}`);
    console.log("  TxHash:", toDecode[i].transactionHash);
    console.log("  From:  ", parsed.args[0]);
    console.log("  To:    ", parsed.args[1]);
    console.log("  Value: ", parsed.args[2].toString()); // Tether uses 6 decimals, so keep that in mind
    console.log("  Block: ", toDecode[i].blockNumber);
  }
}

main().catch(console.error);

