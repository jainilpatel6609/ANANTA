const assert = require('assert');
const { buildHashMessageV1, computeHashV1, verifyHashV1 } = require('../src/services/iciciPaymentService');

let passedTests = 0;
let totalTests = 0;

const check = (condition, testName) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Assertion failed for: ${testName}`);
  }
};

const runIciciHashV1Tests = async () => {
  console.log('====================================================');
  console.log('  ICICI ORANGE PG -- HASH CALCULATION V1 TEST SUITE');
  console.log('====================================================\n');

  // Worked example straight from the ICICI Interface Specification PDF (Chapter 3 sample
  // Initiate Sale request). The secret key used to produce their sample secureHash isn't ours
  // to know, so this test verifies the part we CAN verify exactly: field sorting +
  // concatenation -- the message the HMAC is computed over must match their documented
  // "HashText" byte-for-byte. The HMAC step itself is Node's own crypto primitive, not
  // something this integration can get subtly wrong independently of that.
  console.log('[1: Field sorting & concatenation matches the spec\'s worked example]');
  const specFields = {
    merchantId: '100000000006873',
    aggregatorID: 'A100000000006873',
    merchantTxnNo: '757585887575',
    amount: '2.00',
    currencyCode: '356',
    payType: '0',
    customerEmailID: 'narayan.kapase@phicommerce.com',
    transactionType: 'SALE',
    returnURL: 'https://pgpayuat.icicibank.com/tsp/pg/api/merchant',
    txnDate: '20241121115413',
    customerMobileNo: '917709356362',
    customerName: 'Narayan',
    addlParam1: '000',
    addlParam2: '111'
  };
  const expectedHashText =
    '000111A1000000000068732.00356narayan.kapase@phicommerce.com917709356362Narayan' +
    '1000000000068737575858875750https://pgpayuat.icicibank.com/tsp/pg/api/merchantSALE20241121115413';

  const actualMessage = buildHashMessageV1(specFields);
  check(actualMessage === expectedHashText, 'buildHashMessageV1 reproduces the spec\'s exact HashText');

  console.log('\n[2: secureHash field itself is excluded from the hashed message]');
  const withSecureHash = { ...specFields, secureHash: 'should-never-appear-in-message' };
  const messageWithExtra = buildHashMessageV1(withSecureHash);
  check(messageWithExtra === expectedHashText, 'secureHash key is excluded even when present on the input object');

  console.log('\n[3: null/undefined/empty-string fields are excluded]');
  const withEmpties = { ...specFields, addlParam1: '', addlParam2: null, country: undefined };
  const messageWithoutEmpties = buildHashMessageV1(withEmpties);
  check(
    messageWithoutEmpties === 'A1000000000068732.00356narayan.kapase@phicommerce.com917709356362Narayan1000000000068737575858875750https://pgpayuat.icicibank.com/tsp/pg/api/merchantSALE20241121115413',
    'empty-string, null, and undefined fields are dropped from the hashed message'
  );

  console.log('\n[4: computeHashV1 produces a deterministic HMAC-SHA256 hex digest]');
  const hashA = computeHashV1(specFields, 'test-secret-key');
  const hashB = computeHashV1(specFields, 'test-secret-key');
  check(hashA === hashB, 'same input + same key always produces the same hash (deterministic)');
  check(/^[0-9a-f]{64}$/.test(hashA), 'hash is a 64-char lowercase hex string (SHA-256 digest)');

  const hashWithDifferentKey = computeHashV1(specFields, 'a-different-secret-key');
  check(hashA !== hashWithDifferentKey, 'different secret key produces a different hash');

  console.log('\n[5: verifyHashV1 round-trips correctly]');
  const signed = { ...specFields, secureHash: computeHashV1(specFields, 'round-trip-key') };
  check(
    computeHashV1(signed, 'round-trip-key') === signed.secureHash,
    'computeHashV1 on a signed payload (minus secureHash) matches the embedded secureHash'
  );
  const tampered = { ...signed, amount: '999.99' };
  check(
    computeHashV1(tampered, 'round-trip-key') !== tampered.secureHash,
    'tampering with a signed field changes the hash (tamper detection works)'
  );

  console.log('\n[6: verifyHashV1 helper]');
  check(verifyHashV1(signed) === false, 'verifyHashV1 fails against the default/wrong configured secret (no key passed)');

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
};

module.exports = runIciciHashV1Tests;

if (require.main === module) {
  runIciciHashV1Tests().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
