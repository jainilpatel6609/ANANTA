const { CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET, CASHFREE_VERIFICATION_BASE } = require('../config/env');

// @desc  Verifies a GSTIN against the government registry via Cashfree's Verification Suite.
//        Requires the calling server's outbound IP to be whitelisted in the Cashfree dashboard
//        (Secure ID > IP Whitelisting) -- every call fails with HTTP 403 otherwise, regardless of
//        how correct the credentials are.
const verifyGSTIN = async (gstin, businessName) => {
  const res = await fetch(`${CASHFREE_VERIFICATION_BASE}/verification/gstin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET
    },
    body: JSON.stringify({
      GSTIN: gstin,
      ...(businessName ? { business_name: businessName } : {})
    })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Cashfree returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(data.message || `Cashfree GSTIN verification failed (HTTP ${res.status}).`);
  }

  // A 200 response doesn't always mean the GSTIN is valid -- `valid: true` + "GSTIN Exists" is the
  // only success case; a non-existent GSTIN still comes back 200 with `message: "GSTIN Doesn't Exist"`
  // and none of the business-detail fields.
  return {
    valid: Boolean(data.valid),
    message: data.message || '',
    legalName: data.legal_name_of_business || '',
    tradeName: data.trade_name_of_business || '',
    gstInStatus: data.gst_in_status || '',
    dateOfRegistration: data.date_of_registration || '',
    principalPlaceAddress: data.principal_place_address || ''
  };
};

module.exports = { verifyGSTIN };
