import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [form, setForm] = useState({
    parent_first_name: "",
    parent_last_name: "",
    email: "",
    phone: "",
    player_first_name: "",
    player_last_name: "",
    grade: "",
    birth_year: "",
    position: "",
    improvement_goal: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const requiredFields = [
      "parent_first_name",
      "parent_last_name",
      "email",
      "phone",
      "player_first_name",
      "player_last_name",
      "grade",
      "position",
    ];

    const missingField = requiredFields.find((field) => !form[field].trim());

    if (missingField) {
      setErrorMessage("Please complete all required fields.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("evaluation_requests").insert([
      {
        parent_first_name: form.parent_first_name.trim(),
        parent_last_name: form.parent_last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        player_first_name: form.player_first_name.trim(),
        player_last_name: form.player_last_name.trim(),
        grade: form.grade.trim(),
        birth_year: form.birth_year.trim(),
        position: form.position.trim(),
        improvement_goal: form.improvement_goal.trim(),
        status: "new",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      setErrorMessage("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <main className="page">
        <section className="confirmation-card">
          <div className="logo-pill">THRiVE Basketball Academy</div>

          <h1>You’re on the THRiVE Evaluation List</h1>

          <p className="confirmation-lead">
            Thanks — we received your request. A THRiVE coach will follow up
            with evaluation details, available next steps, and how the player
            development pathway works.
          </p>

          <div className="next-box">
            <h2>What happens next?</h2>

            <div className="step">
              <span>1</span>
              <p>We review your player’s information.</p>
            </div>

            <div className="step">
              <span>2</span>
              <p>We recommend the right evaluation or training pathway.</p>
            </div>

            <div className="step">
              <span>3</span>
              <p>You receive booking details and next steps.</p>
            </div>

            <div className="step">
              <span>4</span>
              <p>Your player begins with a clear development plan.</p>
            </div>
          </div>

          <div className="confirmation-actions">
            <a
              className="primary-link"
              href="https://www.thrivebasketball.org/"
            >
              Visit THRiVE Website
            </a>

            <a
              className="secondary-link"
              href="https://www.thrivebasketball.org/copy-of-evaluation"
            >
              Book $50 Evaluation Now
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero-panel">
<div className="hero-logo-wrap">
  <img
    src="/thrive-logo.png"
    alt="THRiVE Basketball Academy"
    className="hero-logo"
  />
</div>

<div className="hero-title-block">
  <p className="eyebrow">THRiVE Basketball Academy</p>
  <h1>Start Your Player Evaluation</h1>
</div>
        <p className="hero-copy">
          Every THRiVE athlete begins with an evaluation. Tell us about your
          player and we’ll send evaluation details, available next steps, and
          how THRiVE can help your player develop.
        </p>

        <div className="trust-grid">
          <div>
            <strong>Evaluation-Based</strong>
            <span>Clear player pathway</span>
          </div>

          <div>
            <strong>Coach Reviewed</strong>
            <span>Real feedback, not guesswork</span>
          </div>

          <div>
            <strong>No Payment Today</strong>
            <span>Request info first</span>
          </div>
        </div>
      </section>

      <section className="form-card">
        <div className="form-header">
          <p className="eyebrow">Parent / Player Info</p>
          <h2>Request Evaluation Info</h2>
          <p>
            Complete this short form and THRiVE will follow up with evaluation
            information.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="section-title">Parent / Guardian</div>

          <div className="field-grid">
            <label>
              Parent First Name *
              <input
                type="text"
                name="parent_first_name"
                value={form.parent_first_name}
                onChange={handleChange}
                placeholder="Parent first name"
              />
            </label>

            <label>
              Parent Last Name *
              <input
                type="text"
                name="parent_last_name"
                value={form.parent_last_name}
                onChange={handleChange}
                placeholder="Parent last name"
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              Email *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="parent@email.com"
              />
            </label>

            <label>
              Phone *
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="204-000-0000"
              />
            </label>
          </div>

          <div className="section-title">Player</div>

          <div className="field-grid">
            <label>
              Player First Name *
              <input
                type="text"
                name="player_first_name"
                value={form.player_first_name}
                onChange={handleChange}
                placeholder="Player first name"
              />
            </label>

            <label>
              Player Last Name *
              <input
                type="text"
                name="player_last_name"
                value={form.player_last_name}
                onChange={handleChange}
                placeholder="Player last name"
              />
            </label>
          </div>

          <div className="field-grid three">
            <label>
              Grade *
              <select name="grade" value={form.grade} onChange={handleChange}>
                <option value="">Select grade</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
                <option value="Post-Secondary">Post-Secondary</option>
              </select>
            </label>

            <label>
              Birth Year
              <input
                type="text"
                name="birth_year"
                value={form.birth_year}
                onChange={handleChange}
                placeholder="Example: 2011"
              />
            </label>

            <label>
              Position *
              <select
                name="position"
                value={form.position}
                onChange={handleChange}
              >
                <option value="">Select position</option>
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Post">Post</option>
                <option value="Unsure">Unsure</option>
              </select>
            </label>
          </div>

          <label>
            What does your player want to improve?
            <textarea
              name="improvement_goal"
              value={form.improvement_goal}
              onChange={handleChange}
              placeholder="Example: shooting, ball handling, confidence, defense, making a team, basketball IQ..."
              rows="4"
            />
          </label>

          {errorMessage && <div className="error-box">{errorMessage}</div>}

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Request Evaluation Info"}
          </button>

          <p className="payment-note">
            No payment is required to request information. The $50 evaluation
            fee only applies when you officially book your player evaluation.
          </p>
        </form>
      </section>
    </main>
  );
}

export default App;
