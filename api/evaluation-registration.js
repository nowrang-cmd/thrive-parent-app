const EVALUATION_FEE_CAD = 30
const EVALUATION_FEE_CENTS = EVALUATION_FEE_CAD * 100

const allowedPaymentChoices = new Set(['pay_now', 'pay_at_evaluation'])
const allowedGrades = new Set([
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Prep / College / University',
  'Other',
])
const allowedPositions = new Set([
  'Guard',
  'Wing',
  'Forward',
  'Post',
  'Multiple Positions',
  'Not Sure',
])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value, maxLength = 3000) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength)
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
    throw new Error('THRiVE intake database is not configured.')
  }

  return { url, serviceRoleKey }
}

function getStartUrl(req) {
  const configured = clean(process.env.THRIVE_START_URL, 500).replace(/\/+$/, '')
  if (configured) return configured

  const protocol = clean(req.headers?.['x-forwarded-proto'], 20) || 'https'
  const host = clean(req.headers?.['x-forwarded-host'] || req.headers?.host, 300)
  return host ? `${protocol}://${host}` : 'https://start.thrivebasketball.org'
}

async function insertEvaluationSubmission(payload) {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(
    `${url}/rest/v1/evaluation_submissions?select=id,athlete_first_name,athlete_last_name,parent_email,evaluation_fee_status,payment_status`,
    {
      method: 'POST',
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
    console.error('THRiVE evaluation registration insert failed:', response.status, raw)
    throw new Error('We could not save the evaluation registration. Please try again.')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id) {
    throw new Error('The evaluation registration could not be confirmed.')
  }

  return row
}

async function updateRegistrationNote(submissionId, note) {
  try {
    const { url, serviceRoleKey } = getSupabaseConfig()
    await fetch(`${url}/rest/v1/evaluation_submissions?id=eq.${encodeURIComponent(submissionId)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_note: note,
        evaluation_fee_note: note,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.warn('Could not update THRiVE registration payment note:', error)
  }
}

async function createStripeCheckout({ submission, parentEmail, athleteName, req }) {
  const stripeSecretKey = clean(process.env.STRIPE_SECRET_KEY, 1500)
  if (!stripeSecretKey) {
    throw new Error('Secure online payment is not configured yet.')
  }

  const startUrl = getStartUrl(req)
  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set(
    'success_url',
    `${startUrl}/?payment=success&submission_id=${encodeURIComponent(submission.id)}&session_id={CHECKOUT_SESSION_ID}`
  )
  params.set(
    'cancel_url',
    `${startUrl}/?payment=cancelled&submission_id=${encodeURIComponent(submission.id)}`
  )
  params.set('client_reference_id', submission.id)
  params.set('customer_email', parentEmail)
  params.set('locale', 'auto')
  params.set('submit_type', 'pay')
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'cad')
  params.set('line_items[0][price_data][unit_amount]', String(EVALUATION_FEE_CENTS))
  params.set(
    'line_items[0][price_data][product_data][name]',
    'THRiVE Development Evaluation'
  )
  params.set(
    'line_items[0][price_data][product_data][description]',
    'Development Evaluation across Mind • Body • Skill, including strengths, Development Priorities, Next Steps, and an evaluated starting stage.'
  )
  params.set('metadata[flow]', 'thrive_evaluation')
  params.set('metadata[submission_id]', submission.id)
  params.set('metadata[athlete_name]', athleteName)
  params.set('payment_intent_data[metadata][flow]', 'thrive_evaluation')
  params.set('payment_intent_data[metadata][submission_id]', submission.id)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `thrive-evaluation-${submission.id}`,
    },
    body: params.toString(),
  })

  const raw = await response.text()
  let session = null

  try {
    session = raw ? JSON.parse(raw) : null
  } catch {
    session = null
  }

  if (!response.ok || !session?.url) {
    console.error('THRiVE Stripe Checkout creation failed:', response.status, raw)
    throw new Error(
      'Your registration was saved, but secure online payment could not be opened. THRiVE will follow up with payment options.'
    )
  }

  return session
}

function validateRegistration(data) {
  const requiredFields = [
    'athleteFirstName',
    'athleteLastName',
    'birthYear',
    'grade',
    'position',
    'parentFirstName',
    'parentLastName',
    'parentEmail',
    'parentPhone',
    'improvementGoals',
  ]

  const missing = requiredFields.filter((field) => !clean(data[field], 500))
  if (missing.length > 0) {
    return 'Please complete all required athlete and parent/guardian fields.'
  }

  const parentEmail = clean(data.parentEmail, 320).toLowerCase()
  const athleteEmail = clean(data.athleteEmail, 320).toLowerCase()

  if (!emailPattern.test(parentEmail)) {
    return 'Enter a valid parent or guardian email address.'
  }

  if (athleteEmail && !emailPattern.test(athleteEmail)) {
    return 'Enter a valid athlete email address or leave it blank.'
  }

  if (athleteEmail && athleteEmail === parentEmail) {
    return 'Use different email addresses for the athlete and parent when both are provided.'
  }

  const birthYear = Number(clean(data.birthYear, 4))
  const currentYear = new Date().getFullYear()
  if (!Number.isInteger(birthYear) || birthYear < 1995 || birthYear > currentYear - 5) {
    return 'Choose a valid athlete birth year.'
  }

  if (!allowedGrades.has(clean(data.grade, 100))) {
    return 'Choose a valid current grade or level.'
  }

  if (!allowedPositions.has(clean(data.position, 100))) {
    return 'Choose a valid primary position.'
  }

  if (!allowedPaymentChoices.has(clean(data.paymentChoice, 40))) {
    return 'Choose Pay Now or Pay at Evaluation.'
  }

  if (data.informationConfirmed !== true || data.evaluationAcknowledged !== true) {
    return 'Complete the required registration acknowledgements.'
  }

  return ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const data = req.body || {}

  // Honeypot: silently accept bots without creating a record.
  if (clean(data.website, 200)) {
    return res.status(200).json({ ok: true })
  }

  const validationError = validateRegistration(data)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const now = new Date().toISOString()
  const paymentChoice = clean(data.paymentChoice, 40)
  const parentEmail = clean(data.parentEmail, 320).toLowerCase()
  const athleteEmail = clean(data.athleteEmail, 320).toLowerCase()
  const athleteFirstName = clean(data.athleteFirstName, 100)
  const athleteLastName = clean(data.athleteLastName, 100)
  const athleteName = `${athleteFirstName} ${athleteLastName}`.trim()
  const parentFirstName = clean(data.parentFirstName, 100)
  const parentLastName = clean(data.parentLastName, 100)
  const parentName = `${parentFirstName} ${parentLastName}`.trim()
  const paymentAtEvaluation = paymentChoice === 'pay_at_evaluation'
  const paymentStatus = paymentAtEvaluation ? 'cash_due' : 'unpaid'
  const paymentMethod = paymentAtEvaluation ? 'pay_at_session' : 'stripe'
  const paymentNote = paymentAtEvaluation
    ? `Family selected Pay at Evaluation. $${EVALUATION_FEE_CAD} CAD is due before the athlete enters the gym.`
    : `Family selected Pay Now. $${EVALUATION_FEE_CAD} CAD Stripe payment is pending.`

  const payload = {
    athlete_first_name: athleteFirstName,
    athlete_last_name: athleteLastName,
    athlete_name: athleteName,
    athlete_email: athleteEmail || null,
    birth_year: clean(data.birthYear, 4),
    grade: clean(data.grade, 100),
    evaluation_group: clean(data.grade, 100),
    position: clean(data.position, 100),
    school: clean(data.school, 200) || null,

    parent_first_name: parentFirstName,
    parent_last_name: parentLastName,
    parent_name: parentName,
    parent_email: parentEmail,
    email: parentEmail,
    parent_phone: clean(data.parentPhone, 80),
    phone: clean(data.parentPhone, 80),

    years_of_experience: clean(data.yearsExperience, 100) || null,
    years_experience: clean(data.yearsExperience, 100) || null,
    highest_level_played: clean(data.highestLevelPlayed, 300) || null,
    improvement_goals: clean(data.improvementGoals, 3000),
    what_does_the_athlete_want_to_improve: clean(data.improvementGoals, 3000),
    goals: clean(data.improvementGoals, 3000),
    notes: clean(data.notes, 3000) || null,

    status: 'new',
    workflow_status: 'New Submission',
    workflow_stage: 'evaluation_intake',

    payment_status: paymentStatus,
    payment_method: paymentMethod,
    amount_due: EVALUATION_FEE_CAD,
    amount_paid: 0,
    currency: 'CAD',
    payment_provider: paymentAtEvaluation ? 'in_person' : 'stripe',
    payment_note: paymentNote,

    evaluation_fee_status: paymentStatus,
    evaluation_fee_paid: false,
    evaluation_fee_waived: false,
    evaluation_fee_amount: EVALUATION_FEE_CAD,
    evaluation_fee_paid_at: null,
    evaluation_fee_note: paymentNote,

    source: 'start.thrivebasketball.org',
    submitted_from: 'thrive_evaluation_registration',
    submitted_origin: clean(req.headers?.origin, 500) || getStartUrl(req),
    submitted_at: now,
    parent_app_submitted_at: now,
    updated_at: now,
  }

  try {
    const submission = await insertEvaluationSubmission(payload)

    if (paymentAtEvaluation) {
      return res.status(200).json({
        ok: true,
        submissionId: submission.id,
        paymentStatus: 'cash_due',
        paymentMethod: 'pay_at_session',
        paymentUrl: null,
      })
    }

    try {
      const checkoutSession = await createStripeCheckout({
        submission,
        parentEmail,
        athleteName,
        req,
      })

      await updateRegistrationNote(
        submission.id,
        `Stripe Checkout created for $${EVALUATION_FEE_CAD} CAD. Checkout Session: ${checkoutSession.id}`
      )

      return res.status(200).json({
        ok: true,
        submissionId: submission.id,
        paymentStatus: 'unpaid',
        paymentMethod: 'stripe',
        paymentUrl: checkoutSession.url,
      })
    } catch (checkoutError) {
      await updateRegistrationNote(
        submission.id,
        `Registration saved; Stripe Checkout creation failed. ${checkoutError.message}`
      )

      return res.status(502).json({
        error: checkoutError.message,
        registrationSaved: true,
        submissionId: submission.id,
      })
    }
  } catch (error) {
    console.error('THRiVE evaluation registration failed:', error)
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'The registration could not be submitted. Please try again.',
    })
  }
}
