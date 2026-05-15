import React, { useState } from "react";
import { Send, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const EMPTY_FORM = {
  athlete_first_name: "",
  athlete_last_name: "",
  grade: "",
  birth_year: "",
  position: "",
  school: "",
  parent_first_name: "",
  parent_last_name: "",
  parent_email: "",
  parent_phone: "",
  years_of_experience: "",
  highest_level_played: "",
  improvement_goals: ""
};

export default function App() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function submitEvaluationRequest(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const requiredFields = [
      "athlete_first_name",
      "athlete_last_name",
      "grade",
      "birth_year",
      "position",
      "parent_first_name",
      "parent_last_name",
      "parent_email",
      "parent_phone"
    ];

    const missing = requiredFields.find(field => !String(formData[field] || "").trim());
    if (missing) {
      setSaving(false);
      setMessage("Please complete all required fields before submitting.");
      return;
    }

    const payload = {
      athlete_first_name: formData.athlete_first_name.trim(),
      athlete_last_name: formData.athlete_last_name.trim(),
      grade: formData.grade,
      birth_year: formData.birth_year.trim(),
      position: formData.position,
      school: formData.school.trim(),
      parent_first_name: formData.parent_first_name.trim(),
      parent_last_name: formData.parent_last_name.trim(),
      parent_email: formData.parent_email.trim(),
      email_1a31: formData.parent_email.trim(),
      parent_phone: formData.parent_phone.trim(),
      phone_7aeb: formData.parent_phone.trim(),
      years_of_experience: formData.years_of_experience.trim(),
      highest_level_played: formData.highest_level_played.trim(),
      improvement_goals: formData.improvement_goals.trim(),
      what_does_the_athlete_want_to_improve: formData.improvement_goals.trim(),
      status: "new",
      payment_status: "unpaid"
    };

    const { error } = await supabase.from("evaluation_submissions").insert([payload]);

    setSaving(false);

    if (error) {
      setMessage(`Could not submit request: ${error.message}`);
      return;
    }

    setSubmitted(true);
    setFormData(EMPTY_FORM);
    setMessage("Your THRiVE evaluation request has been submitted. We will contact you as evaluation groups are organized.");
  }

  return (
    <main className="parentApp">
      <section className="parentHero">
        <div className="parentBrand">
          <img src="/thrive-logo.png" alt="THRiVE Basketball Academy" />
          <div>
            <strong>THRiVE</strong>
            <span>Basketball Academy</span>
          </div>
        </div>

        <div className="heroCopy">
          <span>Player Evaluation Request</span>
          <h1>Start the Evaluation Process</h1>
          <p>Submit your athlete’s information and THRiVE will place them into the right evaluation pathway based on age, skill, and development needs.</p>
        </div>

        <div className="heroTrust">
          <ShieldCheck size={18} />
          <span>Private intake form · Coach reviewed · Evaluation pathway</span>
        </div>
      </section>

      <section className="formShell">
        {submitted && (
          <div className="successCard">
            <CheckCircle2 size={22} />
            <div>
              <strong>Request received</strong>
              <span>Thank you. THRiVE will follow up as evaluation sessions are organized.</span>
            </div>
          </div>
        )}

        {message && <div className={submitted ? "formMessage success" : "formMessage"}>{message}</div>}

        <form className="requestForm" onSubmit={submitEvaluationRequest}>
          <FormSection title="Athlete Information" />
          <div className="formGrid">
            <Field label="Athlete First Name" name="athlete_first_name" value={formData.athlete_first_name} onChange={handleChange} required />
            <Field label="Athlete Last Name" name="athlete_last_name" value={formData.athlete_last_name} onChange={handleChange} required />

            <div className="field">
              <label>Evaluation Group / Age Level *</label>
              <select name="grade" value={formData.grade} onChange={handleChange} required>
                <option value="">Select Evaluation Group</option>
                <option value="Grade 5/6">Grade 5/6</option>
                <option value="Grade 7/8">Grade 7/8</option>
                <option value="Grade 9/10">Grade 9/10</option>
                <option value="Grade 11/12/Prep/U1">Grade 11/12/Prep/U1</option>
              </select>
            </div>

            <Field label="Birth Year" name="birth_year" value={formData.birth_year} onChange={handleChange} placeholder="2010" required />

            <div className="field">
              <label>Position *</label>
              <select name="position" value={formData.position} onChange={handleChange} required>
                <option value="">Select Position</option>
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Post">Post</option>
              </select>
            </div>

            <Field label="School" name="school" value={formData.school} onChange={handleChange} />
          </div>

          <FormSection title="Parent / Guardian Information" />
          <div className="formGrid">
            <Field label="Parent First Name" name="parent_first_name" value={formData.parent_first_name} onChange={handleChange} required />
            <Field label="Parent Last Name" name="parent_last_name" value={formData.parent_last_name} onChange={handleChange} required />
            <Field label="Parent Email" type="email" name="parent_email" value={formData.parent_email} onChange={handleChange} required />
            <Field label="Parent Phone" type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange} required />
          </div>

          <FormSection title="Basketball Background" />
          <div className="formGrid">
            <Field label="Years of Experience" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} />
            <Field label="Highest Level Played" name="highest_level_played" value={formData.highest_level_played} onChange={handleChange} />
          </div>

          <div className="field full">
            <label>What does the athlete want to improve?</label>
            <textarea
              name="improvement_goals"
              value={formData.improvement_goals}
              onChange={handleChange}
              placeholder="Example: shooting confidence, ball handling, finishing, defensive footwork, decision-making..."
            />
          </div>

          <button className="submitBtn" disabled={saving}>
            <Send size={18} /> {saving ? "Submitting..." : "Submit Evaluation Request"}
          </button>
        </form>
      </section>
    </main>
  );
}

function FormSection({ title }) {
  return <h2 className="sectionTitle">{title}</h2>;
}

function Field({ label, name, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div className="field">
      <label>{label}{required ? " *" : ""}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} />
    </div>
  );
}
