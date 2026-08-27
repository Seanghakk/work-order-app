"use client";

// Shared multi-step wizard shell for the create-forms (Work Order, Sale Order,
// Defect Report). Presentation + step-navigation only — each page still owns all
// its own field state and its existing submit handler untouched; this component
// just decides which step's content to show and gates "Next" with that step's
// validate() (mirroring, not changing, that page's existing required-field
// checks). Rendered as a single <form> (not one per step) so Enter-key and the
// primary button both flow through the same onSubmit, which advances the step
// on every step but the last, and only calls the real submit handler on the
// last one.
export type WizardStep = {
  label: string;
  // Return an error message to block advancing past this step, or null/undefined
  // to allow it. Omit entirely for a step with nothing required.
  validate?: () => string | null | undefined;
  content: React.ReactNode;
};

export default function Wizard({
  steps,
  step,
  setStep,
  onSubmit,
  submitLabel,
  error,
  setError,
}: {
  steps: WizardStep[];
  step: number;
  setStep: (n: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error: string;
  setError: (s: string) => void;
}) {
  const isLast = step === steps.length - 1;
  const current = steps[step];

  function handleFormSubmit(e: React.FormEvent) {
    if (isLast) {
      onSubmit(e);
      return;
    }
    e.preventDefault();
    const msg = current.validate?.();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setStep(step + 1);
  }

  function handleBack() {
    setError("");
    setStep(step - 1);
  }

  return (
    <form onSubmit={handleFormSubmit} className="card">
      <div className="wizard-progress">
        <span className="section-label" style={{ marginBottom: 4 }}>Step {step + 1} of {steps.length}</span>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>{current.label}</h3>
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {current.content}

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <div className="action-row" style={{ marginTop: 16 }}>
        {step > 0 && <button type="button" onClick={handleBack}>Back</button>}
        <button className="primary" type="submit" style={{ marginLeft: "auto" }}>
          {isLast ? submitLabel : "Next"}
        </button>
      </div>
    </form>
  );
}
