const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNTS_BASE,
  ZOHO_API_BASE
} = require('../config/env');

// 18% GST (9% CGST + 9% SGST) tax group, confirmed against the live organization's own
// Settings > Taxes list (id is per-organization, not a Zoho-wide constant).
const GST_18_TAX_ID = '4297259000000034299';

let cachedToken = null; // { accessToken, expiresAt }

// Zoho's access tokens last ~1hr; refreshed a few minutes early so a request never races an
// about-to-expire token.
const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 2 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });

  const res = await fetch(`${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000
  };
  return cachedToken.accessToken;
};

const zohoRequest = async (path, { method = 'GET', body } = {}) => {
  const accessToken = await getAccessToken();
  const url = `${ZOHO_API_BASE}${path}${path.includes('?') ? '&' : '?'}organization_id=${ZOHO_ORG_ID}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Zoho PG returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  // Zoho's own success/error signal is `code` (0 = success), independent of HTTP status.
  if (data.code !== 0) {
    throw new Error(`Zoho API error (HTTP ${res.status}, code ${data.code}): ${data.message || 'Unknown error'}`);
  }
  return data;
};

// @desc  Finds an existing Zoho Contact by name, or creates one -- every Zoho Books invoice must
//        reference a Contact (here, the end customer being billed for the service charge, never
//        the dealer).
const findOrCreateContact = async ({ name, email, mobile }) => {
  const safeName = String(name || 'ANANTA Customer').trim();
  const searchData = await zohoRequest(`/books/v3/contacts?contact_name=${encodeURIComponent(safeName)}`);
  const existing = (searchData.contacts || []).find(
    (c) => c.contact_name.toLowerCase() === safeName.toLowerCase()
  );
  if (existing) return existing.contact_id;

  const createData = await zohoRequest('/books/v3/contacts', {
    method: 'POST',
    body: {
      contact_name: safeName,
      contact_persons: [
        {
          first_name: safeName,
          email: email || undefined,
          phone: mobile || undefined,
          is_primary_contact: true
        }
      ]
    }
  });
  return createData.contact.contact_id;
};

// @desc  Issues the real, 18%-GST, Ananta-GSTIN Service Charge invoice for one order's upfront
//        payment. Caller is responsible for idempotency (never calling this twice for the same
//        order) -- see orderController.getServiceChargeInvoice.
const createServiceChargeInvoice = async ({ customerContactId, orderNumber, amount }) => {
  const data = await zohoRequest('/books/v3/invoices', {
    method: 'POST',
    body: {
      customer_id: customerContactId,
      line_items: [
        {
          name: `Platform Service Charge - Order #${orderNumber}`,
          rate: amount,
          quantity: 1,
          tax_id: GST_18_TAX_ID
        }
      ]
    }
  });

  return {
    invoiceId: data.invoice.invoice_id,
    invoiceNumber: data.invoice.invoice_number
  };
};

// @desc  Fetches Zoho's own rendered PDF for an already-issued invoice (raw bytes, not JSON) --
//        used so the customer sees Zoho's real invoice for the Service Charge portion instead of
//        a locally re-rendered copy of the same data.
const getInvoicePdfBytes = async (invoiceId) => {
  const accessToken = await getAccessToken();
  const url = `${ZOHO_API_BASE}/books/v3/invoices/${invoiceId}?organization_id=${ZOHO_ORG_ID}&accept=pdf`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
  });

  if (!res.ok || !res.headers.get('content-type')?.includes('pdf')) {
    const text = await res.text();
    throw new Error(`Zoho invoice PDF fetch failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

module.exports = {
  getAccessToken,
  findOrCreateContact,
  createServiceChargeInvoice,
  getInvoicePdfBytes
};
