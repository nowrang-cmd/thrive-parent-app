import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import './styles.css'

const EVALUATION_FEE = 30

const gradeOptions = [
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
]

const positionOptions = [
  'Guard',
  'Wing',
  'Forward',
  'Post',
  'Multiple Positions',
  'Not Sure',
]

const initialForm = {
  athleteFirstName: '',
  athleteLastName: '',
  athleteEmail: '',
  birthYear: '',
  grade: '',
  position: '',
  school: '',
  parentFirstName: '',
  parentLastName: '',
  parentEmail: '',
  parentPhone: '',
  yearsExperience: '',
  highestLevelPlayed: '',
  improvementGoals: '',
  notes: '',
  paymentChoice: 'pay_now',
  informationConfirmed: false,
  evaluationAcknowledged: false,
  communicationConsent: false,
  website: '',
}

const birthYears = Array.from(
  { length: 24 },
  (_, index) => String(new Date().getFullYear() - 7 - index)
)

function getQueryState() {
  if (typeof window === 'undefined') return { payment: '', submissionId: '' }

  const params = new URLSearchParams(window.location.search)
  return {
    payment: params.get('payment') || '',
    submissionId: params.get('submission_id') || '',
  }
}

export default function App() {
  const queryState = useMemo(getQueryState, [])
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [submittedAthlete, setSubmittedAthlete] = useState('')

  const paymentIsComplete = queryState.payment === 'success'
  const paymentWasCancelled = queryState.payment === 'cancelled'

  function setField(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setMessage('')
  }

  function choosePayment(paymentChoice) {
    setForm((current) => ({ ...current, paymentChoice }))
    setMessage('')
  }

  async function submitRegistration(event) {
    event.preventDefault()
    setMessage('')

    if (!form.informationConfirmed || !form.evaluationAcknowledged) {
      setStatus('error')
      setMessage('Please complete the required acknowledgements before registering.')
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/evaluation-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'We could not save the registration. Please review the form and try again.'
        )
      }

      const athleteName = `${form.athleteFirstName} ${form.athleteLastName}`.trim()
      setSubmittedAthlete(athleteName)

      if (payload.paymentUrl) {
        window.location.assign(payload.paymentUrl)
        return
      }

      setStatus('success')
      setForm(initialForm)
      setMessage(
        `${athleteName}'s registration is saved. The $${EVALUATION_FEE} Development Evaluation fee is due at the scheduled evaluation session.`
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'The registration could not be submitted. Please try again.'
      )
    }
  }

  function startAnotherRegistration() {
    setForm(initialForm)
    setStatus('idle')
    setMessage('')
    setSubmittedAthlete('')
    window.history.replaceState({}, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="registration-site">
      <SiteHeader />

      <main>
        <section className="registration-hero">
          <div className="hero-copy">
            <p className="eyebrow">THRiVE Development Evaluation</p>
            <h1>
              Every athlete has a starting point.
              <span>Discover yours.</span>
            </h1>
            <p className="hero-lede">
              Register for a Development Evaluation across Mind • Body • Skill.
              THRiVE will identify strengths, Development Priorities, Next Steps,
              and an appropriate starting stage in the THRiVE Development Pathway.
            </p>

            <div className="hero-facts" aria-label="Evaluation details">
              <div>
                <CircleDollarSign aria-hidden="true" />
                <span>
                  <strong>${EVALUATION_FEE} CAD</strong>
                  Evaluation fee
                </span>
              </div>
              <div>
                <CreditCard aria-hidden="true" />
                <span>
                  <strong>Two payment options</strong>
                  Pay now or at evaluation
                </span>
              </div>
              <div>
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Secure intake</strong>
                  Private athlete information
                </span>
              </div>
            </div>
          </div>

          <div className="hero-system-card" aria-label="THRiVE development model">
            <div className="system-mark system-mark--mind">
              <span>Mind</span>
              <small>Think the game</small>
            </div>
            <div className="system-athlete">
              <UserRound aria-hidden="true" />
              <strong>Athlete</strong>
              <span>at the centre</span>
            </div>
            <div className="system-mark system-mark--skill">
              <span>Skill</span>
              <small>Build the game</small>
            </div>
            <div className="system-mark system-mark--body">
              <span>Body</span>
              <small>Prepare to perform</small>
            </div>
            <div className="system-stage">Evaluation establishes the starting stage</div>
          </div>
        </section>

        <section className="journey-strip" aria-label="Registration journey">
          {[
            ['01', 'Register'],
            ['02', 'Choose Payment'],
            ['03', 'Attend Evaluation'],
            ['04', 'Receive Development Review'],
          ].map(([number, label]) => (
            <div key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </section>

        {paymentIsComplete ? (
          <SuccessPanel
            title="Payment received. Registration complete."
            message={`Your $${EVALUATION_FEE} Development Evaluation payment was completed successfully. THRiVE will contact you with evaluation session options and next steps.`}
            onReset={startAnotherRegistration}
          />
        ) : null}

        {paymentWasCancelled ? (
          <div className="notice notice--warning">
            <Clock3 aria-hidden="true" />
            <div>
              <strong>Your registration was saved, but online payment was not completed.</strong>
              <span>
                The evaluation fee remains due. THRiVE can send another payment option,
                or you may pay ${EVALUATION_FEE} at the scheduled evaluation.
              </span>
              {queryState.submissionId ? (
                <small>Registration reference: {queryState.submissionId}</small>
              ) : null}
            </div>
          </div>
        ) : null}

        {status === 'success' ? (
          <SuccessPanel
            title="Evaluation registration received."
            message={message}
            athleteName={submittedAthlete}
            onReset={startAnotherRegistration}
          />
        ) : (
          <section className="registration-layout">
            <form className="registration-form" onSubmit={submitRegistration} noValidate>
              <FormIntro />

              <FormSection
                number="01"
                title="Athlete Information"
                description="Tell us who the athlete is today. Families do not select a THRiVE Development Stage."
              >
                <div className="form-grid">
                  <Field
                    label="Athlete First Name"
                    name="athleteFirstName"
                    value={form.athleteFirstName}
                    onChange={setField}
                    autoComplete="given-name"
                    required
                  />
                  <Field
                    label="Athlete Last Name"
                    name="athleteLastName"
                    value={form.athleteLastName}
                    onChange={setField}
                    autoComplete="family-name"
                    required
                  />
                  <Field
                    label="Athlete Email"
                    name="athleteEmail"
                    value={form.athleteEmail}
                    onChange={setField}
                    type="email"
                    autoComplete="email"
                    help="Optional. Use an athlete-specific email when available."
                  />
                  <SelectField
                    label="Birth Year"
                    name="birthYear"
                    value={form.birthYear}
                    onChange={setField}
                    options={birthYears}
                    placeholder="Select birth year"
                    required
                  />
                  <SelectField
                    label="Current Grade / Level"
                    name="grade"
                    value={form.grade}
                    onChange={setField}
                    options={gradeOptions}
                    placeholder="Select grade or level"
                    required
                  />
                  <SelectField
                    label="Primary Position"
                    name="position"
                    value={form.position}
                    onChange={setField}
                    options={positionOptions}
                    placeholder="Select position"
                    required
                  />
                  <Field
                    label="School / Institution"
                    name="school"
                    value={form.school}
                    onChange={setField}
                    placeholder="Current school or institution"
                    full
                  />
                </div>
              </FormSection>

              <FormSection
                number="02"
                title="Parent / Guardian"
                description="This is the primary contact THRiVE will use for evaluation communication."
              >
                <div className="form-grid">
                  <Field
                    label="Parent / Guardian First Name"
                    name="parentFirstName"
                    value={form.parentFirstName}
                    onChange={setField}
                    autoComplete="given-name"
                    required
                  />
                  <Field
                    label="Parent / Guardian Last Name"
                    name="parentLastName"
                    value={form.parentLastName}
                    onChange={setField}
                    autoComplete="family-name"
                    required
                  />
                  <Field
                    label="Email"
                    name="parentEmail"
                    value={form.parentEmail}
                    onChange={setField}
                    type="email"
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="Mobile Number"
                    name="parentPhone"
                    value={form.parentPhone}
                    onChange={setField}
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                </div>
              </FormSection>

              <FormSection
                number="03"
                title="Basketball Background"
                description="This provides context only. THRiVE will evaluate the athlete in front of us."
              >
                <div className="form-grid">
                  <Field
                    label="Years Playing Basketball"
                    name="yearsExperience"
                    value={form.yearsExperience}
                    onChange={setField}
                    placeholder="Example: 4 years"
                  />
                  <Field
                    label="Highest Level Played"
                    name="highestLevelPlayed"
                    value={form.highestLevelPlayed}
                    onChange={setField}
                    placeholder="School, club, provincial, prep..."
                  />
                  <TextAreaField
                    label="What does the athlete want to improve?"
                    name="improvementGoals"
                    value={form.improvementGoals}
                    onChange={setField}
                    placeholder="Shooting confidence, ball handling, finishing, movement, decision-making, defense..."
                    required
                  />
                  <TextAreaField
                    label="Additional Information"
                    name="notes"
                    value={form.notes}
                    onChange={setField}
                    placeholder="Anything else THRiVE should know before the evaluation?"
                  />
                </div>
              </FormSection>

              <FormSection
                number="04"
                title="Evaluation Fee"
                description={`Choose how you will pay the $${EVALUATION_FEE} Development Evaluation fee.`}
              >
                <div className="payment-choice-grid">
                  <PaymentChoice
                    selected={form.paymentChoice === 'pay_now'}
                    icon={<CreditCard aria-hidden="true" />}
                    title={`Pay Now — $${EVALUATION_FEE}`}
                    description="Complete secure Stripe Checkout after submitting this registration."
                    badge="Recommended"
                    onClick={() => choosePayment('pay_now')}
                  />
                  <PaymentChoice
                    selected={form.paymentChoice === 'pay_at_evaluation'}
                    icon={<UsersRound aria-hidden="true" />}
                    title={`Pay at Evaluation — $${EVALUATION_FEE}`}
                    description="Bring payment to the scheduled evaluation before the athlete enters the gym."
                    onClick={() => choosePayment('pay_at_evaluation')}
                  />
                </div>

                <input
                  className="honeypot"
                  tabIndex="-1"
                  autoComplete="off"
                  name="website"
                  value={form.website}
                  onChange={setField}
                  aria-hidden="true"
                />
              </FormSection>

              <FormSection
                number="05"
                title="Review & Acknowledge"
                description="Confirm the information and THRiVE Development Evaluation process."
              >
                <div className="acknowledgement-list">
                  <CheckboxField
                    name="informationConfirmed"
                    checked={form.informationConfirmed}
                    onChange={setField}
                    required
                  >
                    I confirm the athlete and parent/guardian information is accurate.
                  </CheckboxField>
                  <CheckboxField
                    name="evaluationAcknowledged"
                    checked={form.evaluationAcknowledged}
                    onChange={setField}
                    required
                  >
                    I understand the evaluation establishes a developmental starting point;
                    families do not select a Development Stage and advancement is not guaranteed.
                  </CheckboxField>
                  <CheckboxField
                    name="communicationConsent"
                    checked={form.communicationConsent}
                    onChange={setField}
                  >
                    I agree to receive evaluation scheduling and THRiVE program communication
                    related to this registration.
                  </CheckboxField>
                </div>
              </FormSection>

              {message && status === 'error' ? (
                <div className="form-error" role="alert">
                  {message}
                </div>
              ) : null}

              <button
                className="submit-button"
                type="submit"
                disabled={status === 'submitting'}
              >
                <span>
                  {status === 'submitting'
                    ? 'Saving Registration...'
                    : form.paymentChoice === 'pay_now'
                      ? `Register & Pay $${EVALUATION_FEE}`
                      : 'Register — Pay at Evaluation'}
                </span>
                <ArrowRight aria-hidden="true" />
              </button>

              <div className="secure-note">
                <LockKeyhole aria-hidden="true" />
                <span>
                  Athlete information is submitted securely to THRiVE Athlete Intake.
                  Online payment is processed by Stripe.
                </span>
              </div>
            </form>

            <EvaluationSummary paymentChoice={form.paymentChoice} />
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="site-header">
      <a className="logo-zone" href="https://www.thrivebasketball.org" aria-label="THRiVE Basketball Academy home">
        <img src="/thrive-logo.png" alt="THRiVE Basketball Academy" />
      </a>
      <div className="header-utility">
        <a href="https://www.thrivebasketball.org/evaluation">
          <ArrowLeft aria-hidden="true" /> Evaluation Information
        </a>
        <a href="https://parent.thrivebasketball.org">Parent Portal</a>
      </div>
    </header>
  )
}

function FormIntro() {
  return (
    <div className="form-intro">
      <div>
        <p className="eyebrow">Registration</p>
        <h2>Start your THRiVE journey.</h2>
        <p>
          Complete the secure intake below. Required fields are marked with an asterisk.
        </p>
      </div>
      <div className="fee-pill">
        <CircleDollarSign aria-hidden="true" />
        <span>
          <strong>${EVALUATION_FEE}</strong>
          CAD
        </span>
      </div>
    </div>
  )
}

function FormSection({ number, title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <span>{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  autoComplete,
  help,
  required = false,
  full = false,
}) {
  return (
    <label className={full ? 'form-field form-field--full' : 'form-field'}>
      <span>
        {label} {required ? <b>*</b> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      {help ? <small>{help}</small> : null}
    </label>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}) {
  return (
    <label className="form-field">
      <span>
        {label} {required ? <b>*</b> : null}
      </span>
      <select name={name} value={value} onChange={onChange} required={required}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <label className="form-field form-field--full">
      <span>
        {label} {required ? <b>*</b> : null}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows="5"
        required={required}
      />
    </label>
  )
}

function PaymentChoice({ selected, icon, title, description, badge, onClick }) {
  return (
    <button
      type="button"
      className={selected ? 'payment-choice is-selected' : 'payment-choice'}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="payment-choice-icon">{icon}</span>
      <span className="payment-choice-copy">
        <span className="payment-choice-title-row">
          <strong>{title}</strong>
          {badge ? <em>{badge}</em> : null}
        </span>
        <small>{description}</small>
      </span>
      <span className="payment-choice-check" aria-hidden="true">
        {selected ? <Check /> : null}
      </span>
    </button>
  )
}

function CheckboxField({ name, checked, onChange, required = false, children }) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        required={required}
      />
      <span className="custom-check" aria-hidden="true">
        {checked ? <Check /> : null}
      </span>
      <span>{children}</span>
    </label>
  )
}

function EvaluationSummary({ paymentChoice }) {
  return (
    <aside className="evaluation-summary">
      <div className="summary-card summary-card--primary">
        <p className="eyebrow">Your First Step</p>
        <h2>Development Evaluation</h2>
        <div className="summary-price">
          <strong>${EVALUATION_FEE}</strong>
          <span>CAD</span>
        </div>
        <p>
          Evaluation across Mind • Body • Skill followed by a Development Review.
        </p>
      </div>

      <div className="summary-card">
        <h3>What families receive</h3>
        <ul>
          {[
            'Strengths',
            'Development Priorities',
            'Next Steps',
            'Evaluated Development Stage',
          ].map((item) => (
            <li key={item}>
              <CheckCircle2 aria-hidden="true" /> {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-card summary-card--payment">
        <h3>Payment selected</h3>
        <div>
          {paymentChoice === 'pay_now' ? (
            <CreditCard aria-hidden="true" />
          ) : (
            <UsersRound aria-hidden="true" />
          )}
          <span>
            <strong>
              {paymentChoice === 'pay_now' ? 'Pay Now' : 'Pay at Evaluation'}
            </strong>
            ${EVALUATION_FEE} CAD
          </span>
        </div>
      </div>

      <div className="summary-card summary-card--quiet">
        <Sparkles aria-hidden="true" />
        <p>
          <strong>You do not choose a THRiVE stage.</strong>
          Evaluation helps us understand where the athlete is today and what should come next.
        </p>
      </div>
    </aside>
  )
}

function SuccessPanel({ title, message, athleteName = '', onReset }) {
  return (
    <section className="success-panel">
      <span className="success-icon">
        <CheckCircle2 aria-hidden="true" />
      </span>
      <p className="eyebrow">Registration Received</p>
      <h2>{title}</h2>
      {athleteName ? <strong>{athleteName}</strong> : null}
      <p>{message}</p>
      <div className="success-next-steps">
        <span>1</span>
        <p>THRiVE reviews the registration and evaluation-fee status.</p>
        <span>2</span>
        <p>You receive available evaluation session options.</p>
        <span>3</span>
        <p>The athlete attends and receives a Development Review.</p>
      </div>
      <button type="button" onClick={onReset}>
        Register Another Athlete <ArrowRight aria-hidden="true" />
      </button>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <img src="/thrive-logo.png" alt="THRiVE Basketball Academy" />
        <p>Developing Athletes. Building Better People.</p>
      </div>
      <div>
        <strong>Mind • Body • Skill</strong>
        <span>Come Out and Play.</span>
      </div>
      <div>
        <a href="https://www.thrivebasketball.org">THRiVE Website</a>
        <a href="https://parent.thrivebasketball.org">Parent Portal</a>
        <a href="mailto:evaluation@thrivebasketball.org">Contact THRiVE</a>
      </div>
    </footer>
  )
}
