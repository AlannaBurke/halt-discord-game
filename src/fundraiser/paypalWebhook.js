/**
 * PayPal Webhook Handler
 *
 * Listens for PAYMENT.CAPTURE.COMPLETED events from PayPal and
 * automatically records donations in the fundraiser system.
 *
 * Verification uses PayPal's postback method: the incoming webhook
 * event is sent back to PayPal's verify-webhook-signature endpoint
 * to confirm authenticity. This avoids extra crypto dependencies.
 *
 * Setup:
 *   1. Create a REST app at https://developer.paypal.com/dashboard/applications
 *   2. Under the app, add a webhook URL pointing to https://yourdomain.com/webhooks/paypal
 *   3. Subscribe to the PAYMENT.CAPTURE.COMPLETED event
 *   4. Copy the Client ID, Client Secret, and Webhook ID into .env
 */

const fetch = require('node-fetch');

// PayPal API base URLs
const PAYPAL_API_LIVE = 'https://api-m.paypal.com';
const PAYPAL_API_SANDBOX = 'https://api-m.sandbox.paypal.com';

/**
 * Get the PayPal API base URL based on environment setting
 */
function getApiBase() {
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase();
  return mode === 'sandbox' ? PAYPAL_API_SANDBOX : PAYPAL_API_LIVE;
}

/**
 * Get a PayPal OAuth2 access token using client credentials
 */
async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required for webhook verification');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const apiBase = getApiBase();

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal OAuth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Verify a webhook event using PayPal's postback verification endpoint.
 *
 * @param {Object} headers - The raw HTTP headers from the incoming request
 * @param {string} rawBody - The raw request body as a string
 * @returns {Promise<boolean>} - Whether the webhook is verified
 */
async function verifyWebhookSignature(headers, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID is not set — cannot verify webhook');
    return false;
  }

  try {
    const accessToken = await getAccessToken();
    const apiBase = getApiBase();

    const verifyPayload = {
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    };

    const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`PayPal verify-webhook-signature failed (${response.status}): ${text}`);
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('PayPal webhook verification error:', err.message);
    return false;
  }
}

/**
 * Parse a PAYMENT.CAPTURE.COMPLETED event and extract donation info.
 *
 * @param {Object} event - The parsed webhook event body
 * @returns {Object|null} - { amount, currency, payerName, payerEmail, captureId } or null
 */
function parseCaptureCompleted(event) {
  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return null;
  }

  const resource = event.resource || {};
  const amount = parseFloat(resource.amount?.value || '0');
  const currency = resource.amount?.currency_code || 'USD';

  // Payer info may be in different locations depending on the payment type
  const payer = resource.payer || {};
  const payerName = payer.name
    ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim()
    : null;
  const payerEmail = payer.email_address || null;

  const captureId = resource.id || event.id;

  return {
    amount,
    currency,
    payerName,
    payerEmail,
    captureId,
    summary: event.summary || `Payment of ${amount} ${currency}`,
  };
}

/**
 * Create the Express middleware for the PayPal webhook endpoint.
 * This must be mounted BEFORE express.json() because it needs the raw body.
 *
 * @param {Object} fundraiser - The Fundraiser singleton instance
 * @returns {Function} Express route handler
 */
function createWebhookHandler(fundraiser) {
  return async (req, res) => {
    // Always respond 200 quickly to prevent PayPal retries
    // We process asynchronously after responding
    const rawBody = req.body; // This will be a Buffer if express.raw() is used

    if (!rawBody || rawBody.length === 0) {
      console.error('PayPal webhook: empty body received');
      return res.sendStatus(400);
    }

    const rawString = rawBody.toString('utf-8');

    // Respond 200 immediately so PayPal doesn't retry
    res.sendStatus(200);

    try {
      // Verify the webhook signature
      const isValid = await verifyWebhookSignature(req.headers, rawString);

      if (!isValid) {
        console.warn('PayPal webhook: signature verification FAILED — ignoring event');
        return;
      }

      const event = JSON.parse(rawString);
      console.log(`PayPal webhook received: ${event.event_type} (${event.id})`);

      // Only process payment capture completed events
      if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
        console.log(`PayPal webhook: ignoring event type ${event.event_type}`);
        return;
      }

      const donation = parseCaptureCompleted(event);
      if (!donation || donation.amount <= 0) {
        console.warn('PayPal webhook: could not parse donation amount from event');
        return;
      }

      // Check for duplicate capture IDs to prevent double-counting
      const existingDonations = fundraiser.getDonations();
      const isDuplicate = existingDonations.some(d =>
        d.paypalCaptureId === donation.captureId
      );

      if (isDuplicate) {
        console.log(`PayPal webhook: duplicate capture ${donation.captureId} — skipping`);
        return;
      }

      // Determine donor display name
      const donorName = donation.payerName || donation.payerEmail || 'PayPal Donor';

      // Record the donation
      const record = fundraiser.addDonation({
        userId: `paypal_${donation.captureId}`,
        username: donorName,
        amount: donation.amount,
        method: 'paypal',
        anonymous: false,
        confirmedBy: 'PayPal (auto)',
        paypalCaptureId: donation.captureId,
      });

      console.log(`💙 PayPal donation auto-recorded: $${donation.amount} from ${donorName} (capture: ${donation.captureId})`);

    } catch (err) {
      console.error('PayPal webhook processing error:', err.message);
    }
  };
}

module.exports = {
  createWebhookHandler,
  verifyWebhookSignature,
  parseCaptureCompleted,
  getAccessToken,
};
