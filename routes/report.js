const express = require("express");
const router = express.Router();

const { ethers } = require("ethers");
const { donationQueryAll, signatureValidityInMin } = require("../db");

const STARTBLOCK = 21454915;
const TARGET_ADDRESS = '0x15322b546e31F5bfe144C4ae133a9db6f0059fe3';
const INFURA_API_KEY = process.env.INFURA;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN;
const MIN_TOTAL_WEI = etherToWei(0.03)
const MAX_TOTAL_WEI = etherToWei(0.3)

//
// Helpers
//

const delay = (time) => new Promise((resolve, reject) => setTimeout(resolve, time))

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
        await delay(250); // Delay to respect rate limits (4 requests/sec)
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
      continue;
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

    // get claims
    const claims = await donationQueryAll()

    // this is the set of claims
    const claimsSet = new Set(claims);

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


router.post("/report", async (req, res, next) => {
  try {
    sumTransactions.then( transactions => {
      if(!transactions) {
        res.status(400)
      } else {
        res.status(200).json(transactions);
      }
    })
  } catch (error) {
    next(error);
  }
})

