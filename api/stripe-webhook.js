import crypto from 'node:crypto'

const EVALUATION_FEE_CAD = 30
const EVALUATION_FEE_CENTS = EVALUATION_FEE_CAD * 100
const SIGNATURE_TOLERANCE_SECONDS = 300

export const config = {
  api: {
    bodyParser: false,
  },
}

function clean(value, maxLength = 2000) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength)
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function parseStripeSignature(header) {
  const values = String(header || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const timestampPart = values.find((part) => part.startsWith('t='))
  const signatures = values
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))

  return {
    timestamp: timestampPart ? Number(timestampPart.slice(2)) : NaN,
    signatures,
  }
}

function safeEqualHex(left, right) {
  try {
    const leftBuffer = Buffer.from(left, 'hex')
    const rightBuffer = Buffer.from(right, 'hex')
    return (
      leftBuffer.length === rightBuffer.length &&
      crypto.timingSafeEqual(leftBuffer, rightBuffer)
    )
  } catch {
    return false
  }
}

function verifyStripeSignature(rawBody, header, secret) {
  const { timestamp, signatures } = parseStripeSignature(header)

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    return false
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
  if (age > SIGNATURE_TOLERANCE_SECONDS) {
    return false
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  return signatures.some((signature) => safeEqualHex(signature, expected))
}

function getSupabaseConfig() {
  const url = clean(
    process.env.THRIVE_SUPABASE_URL || process.env.SUPABASE_URL,
    500
  ).replace(/\/+$/, '')
  const serviceRoleKey = clean(
    process.env.THRIVE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    1500
  )

  if (!url || !serviceRoleKey) {
    throw new Error('THRiVE Supabase webhook configuration is missing.')
  }

  return { url, serviceRoleKey }
}

async function updateSubmission(submissionId, payload) {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(
    `${url}/rest/v1/evaluation_submissions?id=eq.${encodeURIComponent(submissionId)}&select=id,evaluation_fee_status,payment_status,amount_paid`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    }
  )

  const raw = await response.text()
  let data = null

  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    console.error('THRiVE Stripe webhook Supabase update failed:', response.status, raw)
    throw new Error('Could not update the THRiVE evaluation payment record.')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id) {
    throw new Error('No THRiVE evaluation registration matched the Stripe payment.')
  }

  return row
}

function getSubmissionId(session) {
  return clean(
    session?.client_reference_id || session?.metadata?.submission_id,
    200
  )
}

function isThriveEvaluationSession(session) {
  return (
    clean(session?.metadata?.flow, 100) === 'thrive_evaluation' &&
    Number(session?.amount_total) === EVALUATION_FEE_CENTS &&
    clean(session?.currency, 20).toLowerCase() === 'cad'
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const webhookSecret = clean(process.env.STRIPE_WEBHOOK_SECRET, 1500)
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.')
    return res.status(500).json({ error: 'Webhook is not configured.' })
  }

  const signature = req.headers?.['stripe-signature']
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature.' })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch (error) {
    console.error('Could not read Stripe webhook body:', error)
    return res.status(400).json({ error: 'Invalid webhook body.' })
  }

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid Stripe signature.' })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid Stripe event payload.' })
  }

  const handledEvents = new Set([
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
  ])

  if (!handledEvents.has(event.type)) {
    return res.status(200).json({ received: true, ignored: true })
  }

  const session = event?.data?.object
  if (!isThriveEvaluationSession(session)) {
    return res.status(200).json({
      received: true,
      ignored: true,
      reason: 'Not a THRiVE Development Evaluation payment.',
    })
  }

  const submissionId = getSubmissionId(session)
  if (!submissionId) {
    return res.status(200).json({
      received: true,
      ignored: true,
      reason: 'Missing THRiVE evaluation submission reference.',
    })
  }

  const now = new Date().toISOString()

  try {
    if (
      event.type === 'checkout.session.completed' &&
      session.payment_status !== 'paid'
    ) {
      return res.status(200).json({
        received: true,
        pending: true,
        submissionId,
      })
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const row = await updateSubmission(submissionId, {
        payment_status: 'paid',
        payment_method: 'stripe',
        amount_due: EVALUATION_FEE_CAD,
        amount_paid: EVALUATION_FEE_CAD,
        currency: 'CAD',
        payment_provider: 'stripe',
        payment_reference: clean(session.id, 255),
        paid_at: now,
        payment_confirmed_at: now,
        payment_confirmed_by: 'Stripe Webhook',
        payment_note: `Paid $${EVALUATION_FEE_CAD} CAD through Stripe Checkout.`,
        evaluation_fee_status: 'paid',
        evaluation_fee_paid: true,
        evaluation_fee_waived: false,
        evaluation_fee_amount: EVALUATION_FEE_CAD,
        evaluation_fee_paid_at: now,
        evaluation_fee_note: `Stripe payment confirmed. Checkout Session: ${clean(session.id, 255)}`,
        updated_at: now,
      })

      return res.status(200).json({
        received: true,
        eventType: event.type,
        submissionId,
        paymentStatus: row.payment_status,
      })
    }

    const failureLabel =
      event.type === 'checkout.session.expired'
        ? 'Stripe Checkout expired before payment.'
        : 'Stripe reported that the online payment did not succeed.'

    const row = await updateSubmission(submissionId, {
      payment_status: 'unpaid',
      payment_method: 'stripe',
      amount_due: EVALUATION_FEE_CAD,
      amount_paid: 0,
      evaluation_fee_status: 'unpaid',
      evaluation_fee_paid: false,
      evaluation_fee_waived: false,
      evaluation_fee_amount: EVALUATION_FEE_CAD,
      payment_note: failureLabel,
      evaluation_fee_note: failureLabel,
      updated_at: now,
    })

    return res.status(200).json({
      received: true,
      eventType: event.type,
      submissionId,
      paymentStatus: row.payment_status,
    })
  } catch (error) {
    console.error('THRiVE Stripe webhook processing failed:', error)
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'THRiVE payment processing failed.',
    })
  }
}
