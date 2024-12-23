
import { ethers } from 'ethers';
import { setTimeout } from 'node:timers/promises';

const STARTBLOCK = 21454915;
const TARGET_ADDRESS = '0x15322b546e31F5bfe144C4ae133a9db6f0059fe3';
const INFURA_API_KEY = process.env.INFURA;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN;
const MIN_TOTAL_WEI = etherToWei(0.03)
const MAX_TOTAL_WEI = etherToWei(0.3)

//
// Helpers
//

function etherToWei(eth) {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
}

function weiToEther(wei) {
  const weiStr = wei.toString().padStart(19, '0');
  const integerPart = weiStr.slice(0, -18) || '0';
  const fractionalPart = weiStr.slice(-18).replace(/0+$/, '') || '0';
  return `${integerPart}.${fractionalPart}`;
}

//////////////////////////////////////////////////////////////////////////////////
//
// claims
// resolve ens
// @todo do these when storing
//
////////////////////////////////////////////////////////////////////////////////////

// @todo use real data
const CLAIMS = [
  '0xbdbae12f604e50f96afec86c5e56394d29999134',
  '0x2938218E96ff60445c9156E8Df0f04f723a08307'.toLowerCase(),
  '0xd9390b46a1749DEe5325A490490491db9a826D1F'
]

const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`);

async function resolveENS(claims) {
  const resolvedClaims = new Set();
  for(let i = 0; i < CLAIMS.length; i++) {
    const claim = CLAIMS[i]
    if (ethers.isAddress(claim)) continue
    const addr = await provider.resolveName(claim)
    if(!addr) {
      console.error('Entry appears to be invalid???',claim)
      array.splice(index, 1)
    } else {
      CLAIMS[i] = addr
      console.log("Fixed up ens name to address",claim,addr)
    }
  }
}

await resolveENS()

//////////////////////////////////////////////////////////////////////////////////
//
// get transactions
//
// uses some mildly aggressive caching in ram
//
// https://docs.etherscan.io/api-endpoints/logs
//
////////////////////////////////////////////////////////////////////////////////////

const transactionCache = new Map();
const CACHE_DURATION_NS = 60_000_000_000n;
const PAGE_SIZE = 1000;

async function getTransactions(address) {
  let page = 1;
  let allTxs = [];
  let hasMore = true;

  while (hasMore) {

    // Check if the page is already cached
    if (transactionCache.has(page)) {
      const cachedPage = transactionCache.get(page);
      console.log(`Using cached data for page ${page}.`);
      allTxs = allTxs.concat(cachedPage.transactions);
      page++;
      continue;
    }

    // Construct the Etherscan API URL
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${STARTBLOCK}&endblock=99999999&page=${page}&offset=${PAGE_SIZE}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

    try {
      const results = await fetch(url);
      const data = await results.json()

      if (data.status !== '1' && data.message !== 'No transactions found') {
        throw new Error(`Etherscan API error: ${data.message}`);
      }

      const txs = data.result;
      allTxs = allTxs.concat(txs);

      console.log(`Fetched page ${page}: ${txs.length} transactions`);

      // If the page is fully populated, cache it
      if (txs.length === PAGE_SIZE) {
        transactionCache.set(page, {
          transactions: txs,
          timestamp: process.hrtime.bigint(),
        });
        console.log(`Cached page ${page}.`);
        page += 1;
        await setTimeout(250); // Delay to respect rate limits (4 requests/sec)
      } else {
        // Page is not fully populated; do not cache and stop fetching further pages
        console.log(`Page ${page} is not fully populated. Not caching and stopping fetch.`);
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}: ${error.message}`);
      // Decide whether to continue or exit; here, we'll exit to prevent infinite loops
      hasMore = false;
    }
  }

  console.log(`Total transactions fetched: ${allTxs.length}`);
  return allTxs;
}

//
// Function to filter transactions based on claimed senders
//

function filterTransactions(txs, claimsSet) {
  return txs.filter(tx => claimsSet.has(tx.from.toLowerCase()));
}

//
// Function to aggregate donations per address with thresholds
//

function aggregateDonations(filteredTxs) {
  const totalsMap = {}; // { fromAddress: totalWei }

  for (const tx of filteredTxs) {
    const from = tx.from.toLowerCase();
    const valueWei = BigInt(tx.value);

    if (!totalsMap[from]) {
      totalsMap[from] = 0n;
    }
    totalsMap[from] += valueWei;
  }

  // Apply thresholds
  const totalsPerAddress = [];

  for (const [address, totalWei] of Object.entries(totalsMap)) {
    if (totalWei < MIN_TOTAL_WEI) {
//      continue;
    }

    let adjustedWei = totalWei;
    if (totalWei > MAX_TOTAL_WEI) {
      adjustedWei = MAX_TOTAL_WEI;
    }

    totalsPerAddress.push({
      address,
      originalTotalEth: weiToEther(totalWei),
      adjustedTotalEth: weiToEther(adjustedWei),
    });
  }

  return totalsPerAddress;
}

//
// sum up transactions within bounds
//

async function sumTransactions() {
  try {

  	// fetch transactions
    const allTxs = await getTransactions(TARGET_ADDRESS);

    // this is the set of claims
    const claimsSet = new Set(CLAIMS);

    // filter against claims
    const filteredTxs = filterTransactions(allTxs, claimsSet);
    console.log(`Filtered transactions from claimed addresses: ${filteredTxs.length}`);

    // get donation totals
    const totalsPerAddress = aggregateDonations(filteredTxs);
    console.log('Final Totals Per Address (after thresholds):');
    console.log(totalsPerAddress);

    return totalsPerAddress

  } catch (error) {
    console.error(`Error in main execution: ${error.message}`);
  }
}

sumTransactions();
