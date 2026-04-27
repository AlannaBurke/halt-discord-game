/**
 * Patreon Webhook Handler
 *
 * Processes incoming Patreon webhook events for automatic pledge tracking.
 * Verifies webhook signatures using the shared secret, then records new
 * pledges in the fundraiser system.
 *
 * Patreon webhook triggers:
 *   - members:pledge:create — A member pledges
 *   - members:pledge:update — A member updates their pledge
 *   - members:pledge:delete — A member deletes their pledge
 *
 * We primarily listen for members:pledge:create to auto-track new patrons.
 *
 * Setup:
 *   1. Go to https://www.patreon.com/portal/registration/register-webhooks
 *   2. Create a webhook pointing to https://yourdomain.com/webhooks/patreon
 *   3. Subscribe to "members:pledge:create" trigger
 *   4. Copy the webhook secret to PATREON_WEBHOOK_SECRET in .env
 */

const crypto = require('crypto');

/**
 * Verify the Patreon webhook signature
 * Patreon signs webhooks with HMAC-MD5 using the webhook secret.
 * The signature is sent in the X-Patreon-Signature header.
 *
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Value of X-Patreon-Signature header
 * @param {string} secret - Webhook secret from Patreon
 * @returns {boolean}
 */
function verifyPatreonSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const computed = crypto
    .createHmac('md5', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Parse and process a Patreon webhook event
 *
 * @param {Object} params
 * @param {Buffer} params.rawBody - Raw request body
 * @param {Object} params.headers - Request headers
 * @param {Object} params.fundraiser - Fundraiser instance
 * @returns {{ success: boolean, message: string, pledge?: Object }}
 */
function processPatreonWebhook({ rawBody, headers, fundraiser }) {
  const secret = process.env.PATREON_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (secret) {
    const signature = headers['x-patreon-signature'];
    if (!verifyPatreonSignature(rawBody, signature, secret)) {
      return { success: false, message: 'Invalid webhook signature' };
    }
  }

  // Parse the JSON:API payload
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch (e) {
    return { success: false, message: 'Invalid JSON payload' };
  }

  // Get the event trigger from headers
  const eventTrigger = headers['x-patreon-event'];

  // We only process pledge creation events
  if (eventTrigger !== 'members:pledge:create') {
    return { success: true, message: `Ignored event: ${eventTrigger}` };
  }

  // Extract member data from JSON:API format
  const data = payload.data;
  if (!data) {
    return { success: false, message: 'No data in payload' };
  }

  const attributes = data.attributes || {};
  const memberId = data.id;

  // Check for duplicate (already processed this member)
  const existingPledges = fundraiser.getPatreonPledges();
  if (memberId && existingPledges.some(p => p.patreonMemberId === memberId)) {
    return { success: true, message: `Duplicate pledge ignored: ${memberId}` };
  }

  // Extract pledge amount (in cents)
  const pledgeAmountCents = attributes.currently_entitled_amount_cents || attributes.will_pay_amount_cents || 0;

  // Extract patron info from included resources
  let patronName = 'Patreon Patron';
  let patronEmail = '';

  if (payload.included && Array.isArray(payload.included)) {
    const userResource = payload.included.find(r => r.type === 'user');
    if (userResource && userResource.attributes) {
      patronName = userResource.attributes.full_name || userResource.attributes.first_name || 'Patreon Patron';
      patronEmail = userResource.attributes.email || '';
    }
  }

  // Record the pledge
  const pledge = fundraiser.addPatreonPledge({
    userId: `patreon_${memberId || Date.now()}`,
    username: patronName,
    pledgeAmountCents,
    additionalDonation: 0,
    anonymous: false,
    confirmedBy: 'Patreon Webhook',
    patreonMemberId: memberId,
  });

  console.log(`[Patreon Webhook] New pledge recorded: ${patronName} - $${(pledgeAmountCents / 100).toFixed(2)}/mo (member: ${memberId})`);

  return {
    success: true,
    message: `Pledge recorded: ${patronName}`,
    pledge,
  };
}

module.exports = { processPatreonWebhook, verifyPatreonSignature };
