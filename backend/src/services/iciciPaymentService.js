const crypto = require('crypto');
const { ICICI_BASE_URL, ICICI_MERCHANT_ID, ICICI_AGGREGATOR_ID, ICICI_SECRET_KEY } = require('../config/env');

// Hash Calculation V1 (ICICI Orange PG Interface Specification, p.68). Used for every API this
// integration touches (Initiate Sale, Authorization Redirect / Payment Response, Payment Advice,
// Settlement Advice, Transaction Status) -- Get Card Bin / UserCancel / Get Service Charges use
// V2 and are out of scope.
//
// Step 1: every field with a non-null, non-empty value, EXCEPT secureHash itself.
// Step 2: sort field NAMES alphabetically.
// Step 3: concatenate the corresponding VALUES (as strings, no separator) in that order.
// Step 4: HMAC-SHA256(concatenated, secretKey) -> hex -> lowercase.
const buildHashMessageV1 = (fields) => {
  const keys = Object.keys(fields)
    .filter((k) => k !== 'secureHash' && fields[k] !== null && fields[k] !== undefined && fields[k] !== '')
    .sort();
  return keys.map((k) => String(fields[k])).join('');
};

const computeHashV1 = (fields, secretKey = ICICI_SECRET_KEY) => {
  const message = buildHashMessageV1(fields);
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex').toLowerCase();
};

// Verifies an inbound response/webhook payload's secureHash against a freshly-computed one.
// Per spec Note 1: every field actually present must be included (not just documented ones),
// which `computeHashV1` already does since it operates on whatever keys `fields` has.
const verifyHashV1 = (fields) => {
  if (!fields || !fields.secureHash) return false;
  const expected = computeHashV1(fields);
  return expected === String(fields.secureHash).toLowerCase();
};

// YYYYMMDDHHMISS, as required by txnDate / paymentDateTime fields throughout the spec.
const formatIciciDateTime = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

// merchantTxnNo must be alphanumeric only, <=20 chars, unique per request (spec Chapter 3).
const generateMerchantTxnNo = () => {
  const raw = Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  return raw.toUpperCase().slice(0, 20);
};

const postForm = async (path, fields) => {
  const body = new URLSearchParams();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') body.append(k, String(v));
  });
  const res = await fetch(`${ICICI_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`ICICI PG returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
};

// @desc  Initiate Sale -- server-to-server. Returns the redirectURI the customer's browser is
//        navigated to (Standard/Redirection mode, payType '0' -- this app never does seamless
//        OTP-capture-on-merchant-page).
const initiateSale = async ({
  merchantTxnNo,
  amount,
  customerEmailID,
  customerMobileNo,
  customerName,
  returnURL,
  addlParam1,
  addlParam2
}) => {
  const request = {
    merchantId: ICICI_MERCHANT_ID,
    aggregatorID: ICICI_AGGREGATOR_ID || undefined,
    merchantTxnNo,
    amount: Number(amount).toFixed(2),
    currencyCode: '356',
    payType: '0',
    customerEmailID: customerEmailID || 'guest@anantatraders.com',
    transactionType: 'SALE',
    returnURL,
    txnDate: formatIciciDateTime(),
    customerMobileNo: customerMobileNo || undefined,
    customerName: customerName || undefined,
    addlParam1: addlParam1 || undefined,
    addlParam2: addlParam2 || undefined
  };
  request.secureHash = computeHashV1(request);

  const response = await postForm('/tsp/pg/api/v2/initiateSale', request);
  return { request, response };
};

// @desc  Transaction Status check -- used by the stuck-transaction poller.
const checkStatus = async ({ merchantTxnNo, originalTxnNo }) => {
  const request = {
    merchantId: ICICI_MERCHANT_ID,
    aggregatorID: ICICI_AGGREGATOR_ID || undefined,
    merchantTxnNo,
    originalTxnNo,
    transactionType: 'STATUS'
  };
  request.secureHash = computeHashV1(request);

  const response = await postForm('/tsp/pg/api/command', request);
  return { request, response };
};

module.exports = {
  buildHashMessageV1,
  computeHashV1,
  verifyHashV1,
  formatIciciDateTime,
  generateMerchantTxnNo,
  initiateSale,
  checkStatus
};
