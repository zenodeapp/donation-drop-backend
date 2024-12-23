
// @todo replace this volatile ram db with a real database and discard test data

let donations = {
  0xbdbae12f604e50f96afec86c5e56394d29999134: {
    ethAddress: '0xbdbae12f604e50f96afec86c5e56394d29999134',
    namAddress: '',
    message: '',
    messageTime: 0,
    verifiedTime: 0
  }
};

async function donationSave(data) {
  if(!data || typeof data !== 'object' || !data.ethAddress) throw new Error('Cannot save object')
  donations[data.ethAddress] = data
}

async function donationQueryOne(query={}) {
  if(query.ethAddress) {
    return donations[query.ethAddress]
  }
  return null
}

async function donationQueryAll() {
  return Object.entries(donations)
}

const signatureValidityInMin = 5;

module.exports = {
  donationSave,
  donationQueryOne,
  donationQueryAll,
  signatureValidityInMin,
};
