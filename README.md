# THRiVE Development Evaluation Registration

Secure, branded registration experience for:

`https://start.thrivebasketball.org`

## Purpose

This application is the intake entry point for the THRiVE Development Evaluation. It uses the approved Carolina Blue public-site design language and creates the athlete directly in THRiVE Athlete Intake.

The family chooses one of two payment methods:

- **Pay Now — $30 CAD:** registration is saved, then the family is redirected to a server-created Stripe Checkout Session.
- **Pay at Evaluation — $30 CAD:** registration is saved with `cash_due` / `pay_at_session` status and no Stripe redirect.

Families do not select a THRiVE Development Stage. Evaluation establishes the athlete's appropriate starting stage across Mind • Body • Skill.

## Stack

- React + Vite
- Vercel Functions under `/api`
- THRiVE Supabase project
- Stripe Checkout and signed webhook

## Data flow

```text
Evaluation Registration
        ↓
evaluation_submissions
        ↓
Pay Now OR Pay at Evaluation
        ↓
Evaluation Booked
        ↓
Evaluation Complete
        ↓
Initial Development Review
        ↓
Athlete HQ / THRiVE TRAINING
```

## Server environment variables

Copy `.env.example` and configure these values in Vercel:

```text
THRIVE_SUPABASE_URL
THRIVE_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
THRIVE_START_URL=https://start.thrivebasketball.org
```

All keys above are server-only. Never expose the Supabase service-role key or Stripe secret key through a `VITE_` variable.

## Stripe webhook

Production webhook endpoint:

```text
https://start.thrivebasketball.org/api/stripe-webhook
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
```

The webhook verifies the Stripe signature, confirms the `$30 CAD` amount and `thrive_evaluation` metadata, and updates the matching `evaluation_submissions` row.

## Local development

```bash
npm install
npm run dev
npm run lint
npm run build
```

Vercel Functions require a Vercel-compatible local environment for full end-to-end payment testing. Use Stripe test mode before enabling live checkout.
