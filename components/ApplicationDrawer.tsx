"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Attribution, MAX_TOUCHPOINTS, Touchpoint, hasAttribution, readUtm } from "@/lib/utm";
import { withBasePath } from "@/lib/base-path";
import { FormSelect } from "@/components/FormSelect";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

const EMPTY_ATTRIBUTION: Attribution = { firstTouch: {}, lastTouch: {}, touchpoints: [], landingPage: "", referrer: "" };
const TOUCHPOINTS_KEY = "gstar_touchpoints";
const READINESS_OPTIONS = [
  ["python", "Python & PyTorch"],
  ["papers", "Research literacy"],
  ["transformers", "Transformer internals"],
  ["training", "Model training"],
  ["time", "Weekly commitment"]
] as const;

type FieldErrors = Record<string, string>;

function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? <span className="apply-field-error" id={`${name}-error`} role="alert">{errors[name]}</span> : null;
}

function storedReadiness() {
  try {
    const value = JSON.parse(localStorage.getItem("gstar_readiness_signals") || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { localStorage.removeItem("gstar_readiness_signals"); return []; }
}

function storedUtm(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { localStorage.removeItem(key); return {}; }
}

function storedTouchpoints(): Touchpoint[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TOUCHPOINTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(-MAX_TOUCHPOINTS) : [];
  } catch {
    localStorage.removeItem(TOUCHPOINTS_KEY);
    return [];
  }
}

/**
 * Append the current visit to the touchpoints history if it carries any UTM/click-ID.
 * Same UTMs within 30 minutes are deduped so a browser refresh doesn't spam entries.
 */
function recordTouchpoint(current: ReturnType<typeof readUtm>): Touchpoint[] {
  const points = storedTouchpoints();
  if (!hasAttribution(current)) return points;
  const now = new Date();
  const nowIso = now.toISOString();
  const last = points[points.length - 1];
  if (last) {
    const sameCampaign = last.utm_campaign === current.utm_campaign
      && last.utm_source === current.utm_source
      && last.utm_medium === current.utm_medium;
    const recent = Date.parse(last.at) > now.getTime() - 30 * 60 * 1000;
    if (sameCampaign && recent) return points;
  }
  const next: Touchpoint = { ...current, at: nowIso, landingPage: window.location.href, referrer: document.referrer };
  const trimmed = [...points, next].slice(-MAX_TOUCHPOINTS);
  try { localStorage.setItem(TOUCHPOINTS_KEY, JSON.stringify(trimmed)); }
  catch { /* storage disabled — attribution still lives in memory for this session */ }
  return trimmed;
}

function track(name: string, params: Record<string, unknown> = {}) {
  window.gtag?.("event", name, params);
}

function newIdempotencyKey() {
  const raw = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return raw.replace(/[^a-zA-Z0-9._:-]/g, "-");
}

export function ApplicationDrawer() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [readiness, setReadiness] = useState<string[]>([]);
  const [aiExperience, setAiExperience] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attribution, setAttribution] = useState<Attribution>(EMPTY_ATTRIBUTION);
  const dialog = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Fresh key per drawer open. Reused across submit retries within the same open
  // so a client that clicks submit twice (network flake) does not create a duplicate row.
  const idempotencyKey = useRef<string>("");

  useEffect(() => {
    const current = readUtm(window.location.search);
    const storedFirst = storedUtm("gstar_first_touch");
    const firstTouch = Object.keys(storedFirst).length ? storedFirst : current;
    if (!Object.keys(storedFirst).length && Object.keys(current).length) localStorage.setItem("gstar_first_touch", JSON.stringify(current));
    if (Object.keys(current).length) localStorage.setItem("gstar_last_touch", JSON.stringify(current));
    const lastTouch = Object.keys(current).length ? current : storedUtm("gstar_last_touch");
    const touchpoints = recordTouchpoint(current);
    setAttribution({ firstTouch, lastTouch, touchpoints, landingPage: window.location.href, referrer: document.referrer });
    setReadiness(storedReadiness());

    const syncReadiness = (event: Event) => {
      const values = (event as CustomEvent<{ values?: string[] }>).detail?.values;
      if (Array.isArray(values)) setReadiness(values);
    };
    window.addEventListener("gstar:readiness-change", syncReadiness);

    const selector = 'a[href="#apply"], a[href^="https://gstar.newturing.ai"]';
    const handler = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLAnchorElement>(selector);
      if (!target) return;
      event.preventDefault();
      setOpen(true);
      setStep(1);
      setStatus("idle");
      setMessage("");
      setErrors({});
      setResumeName("");
      setReadiness(storedReadiness());
      setAiExperience("");
      idempotencyKey.current = newIdempotencyKey();
      track("apply_form_open", { placement: target.textContent?.trim() || "apply" });
    };
    document.addEventListener("click", handler, true);
    return () => { document.removeEventListener("click", handler, true); window.removeEventListener("gstar:readiness-change", syncReadiness); };
  }, []);

  function toggleReadiness(value: string) {
    const next = readiness.includes(value) ? readiness.filter((item) => item !== value) : [...readiness, value];
    setReadiness(next);
    localStorage.setItem("gstar_readiness_signals", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("gstar:readiness-set", { detail: { values: next } }));
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    if (open) requestAnimationFrame(() => dialog.current?.focus());
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  // Track drop-off signals. We only fire once per (field, drawer-open) so
  // toggling focus repeatedly does not spam the analytics endpoint.
  const droppedFields = useRef<Set<string>>(new Set());
  useEffect(() => { if (open) droppedFields.current = new Set(); }, [open]);

  function handleFieldBlur(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const name = target.name;
    if (!name || droppedFields.current.has(name)) return;
    const value = target.value?.trim() || "";
    if (value) return;
    // Only count blur-empty for fields the user actually touched.
    if (!target.matches(":focus-visible") && !target.dataset.gstarTouched) return;
    droppedFields.current.add(name);
    track("apply_form_field_exit", { field: name });
  }

  function markTouched(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      target.dataset.gstarTouched = "1";
    }
  }

  function clearFieldError(name: string) {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function clearEventError(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) clearFieldError(target.name);
  }

  function validate(form: HTMLFormElement) {
    const next: FieldErrors = {};
    const value = (name: string) => String(new FormData(form).get(name) || "").trim();
    const required: Array<[string, string]> = [
      ["fullName", "Enter your full name."],
      ["email", "Enter your email address."],
      ["yearOfBirth", "Enter your year of birth."],
      ["country", "Enter your city and country."],
      ["organization", "Enter your current company or school."],
      ["currentStatus", "Select your current status."],
      ["currentRole", "Enter your current position or school major."],
      ["linkedin", "Enter your website or LinkedIn URL."],
      ["motivation", "Tell us why you want to join GStar."]
    ];
    required.forEach(([name, text]) => { if (!value(name)) next[name] = text; });

    const email = form.elements.namedItem("email") as HTMLInputElement | null;
    if (email?.value && email.validity.typeMismatch) next.email = "Enter a valid email address.";
    const birthYear = Number(value("yearOfBirth"));
    if (value("yearOfBirth") && (birthYear < 1940 || birthYear > 2010)) next.yearOfBirth = "Enter a year between 1940 and 2010.";
    const linkedin = form.elements.namedItem("linkedin") as HTMLInputElement | null;
    if (linkedin?.value && linkedin.validity.typeMismatch) next.linkedin = "Enter a complete URL starting with https://";

    const resume = form.elements.namedItem("resume") as HTMLInputElement | null;
    const file = resume?.files?.[0];
    if (!file) next.resume = "Attach your resume or CV as a PDF.";
    else if (file.size > 5_000_000) next.resume = "The PDF must be 5 MB or smaller.";
    else if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) next.resume = "Choose a PDF file.";

    if (!aiExperience) next.aiExperience = "Select your AI experience level.";
    if (!(form.elements.namedItem("weeklyAvailability") as HTMLInputElement | null)?.checked) next.weeklyAvailability = "Confirm your weekly availability.";
    if (!(form.elements.namedItem("consent") as HTMLInputElement | null)?.checked) next.consent = "Consent is required to submit your application.";
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const fieldErrors = validate(formElement);
    if (Object.keys(fieldErrors).length) {
      setStatus("error");
      setMessage("");
      setErrors(fieldErrors);
      const firstName = Object.keys(fieldErrors)[0];
      requestAnimationFrame(() => {
        const target = firstName === "aiExperience"
          ? formElement.querySelector<HTMLElement>(".form-select__trigger")
          : formElement.querySelector<HTMLElement>(`[name="${firstName}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus({ preventScroll: true });
      });
      return;
    }
    setStatus("submitting");
    setMessage("");
    setErrors({});
    const form = new FormData(event.currentTarget);
    form.set("attribution", JSON.stringify(attribution));
    try {
      if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
      const response = await fetch(withBasePath("/api/applications"), {
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey.current },
        body: form
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your application");
      setStatus("success");
      if (result.mode === "duplicate") {
        setMessage(result.message || "We already received your application for this email in the last 24 hours.");
      } else {
        setMessage("Your application has been received and saved for review.");
        track("apply_form_submit", { utm_campaign: attribution.lastTouch.utm_campaign || "direct" });
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit. Please try again.");
    }
  }

  function continueToProfile() {
    setStep(2);
    track("apply_form_start");
    requestAnimationFrame(() => dialog.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  if (!open) return null;

  return (
    <div className="apply-drawer" role="presentation">
      <button className="apply-drawer__backdrop" aria-label="Close application form" onClick={() => setOpen(false)} />
      <div className="apply-drawer__panel" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="apply-title" tabIndex={-1}>
        <header>
          <div><span>NTI Global Talent Program · 2026</span><h2 id="apply-title">GStar Bootcamp registration</h2></div>
          <button className="apply-drawer__close" onClick={() => setOpen(false)} aria-label="Close application form"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </header>
        <div className="apply-drawer__progress" aria-label={`Step ${step} of 2`}><span className={step >= 1 ? "is-active" : ""}>01 · Overview</span><i /><span className={step >= 2 ? "is-active" : ""}>02 · Registration</span></div>

        {status === "success" ? (
          <div className="apply-success" aria-live="polite"><b>Application received</b><p>{message}</p><button className="btn btn-secondary-dark btn--size-40" onClick={() => setOpen(false)}>Done</button></div>
        ) : (
          <form ref={formRef} onSubmit={submit} noValidate onInput={(event) => { markTouched(event); clearEventError(event); }} onChange={clearEventError} onBlur={handleFieldBlur}>
            <input className="apply-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <section className="apply-overview-step" hidden={step !== 1}>
              <div className="apply-overview">
                <p className="apply-overview__lead"><strong>A 12-week, fully online accelerator</strong> for engineers who want to work at the frontier of AI, culminating in a mentored capstone showcased at the GStar Summit.</p>
                <div className="apply-overview__group"><span>What you will gain</span><ul><li><b>Advanced LLM &amp; NLP mastery</b><small>Train, adapt and evaluate state-of-the-art language models.</small></li><li><b>World-class mentorship</b><small>Learn with researchers and engineers from leading global AI labs.</small></li><li><b>A lifetime alumni network</b><small>Join NTI&apos;s global builder community and 30,000+ member ecosystem.</small></li><li><b>Direct pathways to R&amp;D careers</b><small>Access research acceleration and partner opportunities.</small></li></ul></div>
                <div className="apply-overview__group"><span>Who should apply</span><ul><li><b>Technical foundation</b><small>Python, PyTorch and hands-on AI/ML project or research experience.</small></li><li><b>Builder mindset</b><small>Strong English, collaborative practice and the drive to ship.</small></li></ul></div>
                <dl className="apply-overview__facts"><div><dt>Format</dt><dd>12 weeks · Online</dd></div><div><dt>Language</dt><dd>English</dd></div><div><dt>Financial aid</dt><dd>Up to 100% tuition</dd></div></dl>
              </div>
              <div className="apply-form-actions"><button type="button" className="btn btn-secondary-dark btn--size-40 btn--full" onClick={continueToProfile}>Start registration →</button></div>
            </section>
            <section className="apply-registration" hidden={step !== 2}>
              <div className="apply-section-heading"><span>Personal information</span><p>Fields marked with * are required.</p></div>
              <label className={errors.fullName ? "is-invalid" : ""}>Full name *<input name="fullName" required autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined}/><FieldError name="fullName" errors={errors}/></label>
              <div className="apply-field-row"><label className={errors.email ? "is-invalid" : ""}>Email *<input name="email" type="email" required autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined}/><FieldError name="email" errors={errors}/></label><label className={errors.yearOfBirth ? "is-invalid" : ""}>Year of birth *<input name="yearOfBirth" type="number" min="1940" max="2010" required inputMode="numeric" aria-invalid={Boolean(errors.yearOfBirth)} aria-describedby={errors.yearOfBirth ? "yearOfBirth-error" : undefined}/><FieldError name="yearOfBirth" errors={errors}/></label></div>
              <label className={errors.country ? "is-invalid" : ""}>City and country of residence &amp; work *<input name="country" required autoComplete="country-name" placeholder="Ho Chi Minh City, Vietnam" aria-invalid={Boolean(errors.country)} aria-describedby={errors.country ? "country-error" : undefined}/><FieldError name="country" errors={errors}/></label>
              <label className={errors.organization ? "is-invalid" : ""}>Current company or school *<input name="organization" required placeholder="Full organization name" aria-invalid={Boolean(errors.organization)} aria-describedby={errors.organization ? "organization-error" : undefined}/><FieldError name="organization" errors={errors}/></label>
              <fieldset className={`apply-options${errors.currentStatus ? " is-invalid" : ""}`} aria-invalid={Boolean(errors.currentStatus)} aria-describedby={errors.currentStatus ? "currentStatus-error" : undefined}><legend>Current status *</legend>{["Final-year undergraduate","Recent graduate","Working professional (2+ years experience)","Other"].map((item)=><label key={item}><input type="radio" name="currentStatus" value={item} required/><span>{item}</span></label>)}<FieldError name="currentStatus" errors={errors}/></fieldset>
              <label className={errors.currentRole ? "is-invalid" : ""}>Current position or school major *<input name="currentRole" required aria-invalid={Boolean(errors.currentRole)} aria-describedby={errors.currentRole ? "currentRole-error" : undefined}/><FieldError name="currentRole" errors={errors}/></label>
              <label className={`apply-upload${errors.resume ? " is-invalid" : ""}`}>Resume / CV (PDF, max 5 MB) *<input name="resume" type="file" accept="application/pdf,.pdf" required aria-invalid={Boolean(errors.resume)} aria-describedby={errors.resume ? "resume-error" : undefined} onChange={(event)=>setResumeName(event.target.files?.[0]?.name || "")}/><span className="apply-upload__control"><b>{resumeName || "Choose PDF"}</b><small>{resumeName ? "PDF selected · choose again to replace" : "Attach one current English resume or CV."}</small></span><FieldError name="resume" errors={errors}/></label>
              <label className={errors.linkedin ? "is-invalid" : ""}>Website or LinkedIn profile *<input name="linkedin" type="url" required placeholder="https://" aria-invalid={Boolean(errors.linkedin)} aria-describedby={errors.linkedin ? "linkedin-error" : undefined}/><FieldError name="linkedin" errors={errors}/></label>
              <div className="apply-section-heading"><span>Readiness</span><p>Help the selection team understand your technical starting point.</p></div>
              <fieldset className="apply-options apply-options--signals"><legend>Signals selected in your readiness check</legend>{READINESS_OPTIONS.map(([value,label])=><label key={value}><input type="checkbox" name="readiness" value={value} checked={readiness.includes(value)} onChange={()=>toggleReadiness(value)}/><span>{label}</span></label>)}</fieldset>
              <p className="apply-field-help">{readiness.length} of {READINESS_OPTIONS.length} signals selected · You can update these before submitting.</p>
              <FormSelect name="aiExperience" label="AI experience *" placeholder="Select your level" value={aiExperience} onChange={(value)=>{setAiExperience(value);clearFieldError("aiExperience");setMessage("");setStatus("idle");}} invalid={Boolean(errors.aiExperience)} error={errors.aiExperience} options={["Under 1 year","1–2 years","3–5 years","5+ years"].map((item)=>({value:item,label:item}))}/>
              <label className={errors.motivation ? "is-invalid" : ""}>Why GStar? *<textarea name="motivation" required rows={5} maxLength={2000} placeholder="What do you want to build, research or become capable of?" aria-invalid={Boolean(errors.motivation)} aria-describedby={errors.motivation ? "motivation-error" : undefined}/><FieldError name="motivation" errors={errors}/></label>
              <label className="apply-check"><input type="checkbox" name="scholarshipRequest" value="yes" /><span>I want to request scholarship consideration.</span></label>
              <label className={`apply-check${errors.weeklyAvailability ? " is-invalid" : ""}`}><input type="checkbox" name="weeklyAvailability" value="yes" required aria-invalid={Boolean(errors.weeklyAvailability)} aria-describedby={errors.weeklyAvailability ? "weeklyAvailability-error" : undefined}/><span>I can commit 15–20 hours per week.</span><FieldError name="weeklyAvailability" errors={errors}/></label>
              <label className={`apply-check${errors.consent ? " is-invalid" : ""}`}><input type="checkbox" name="consent" value="yes" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined}/><span>I consent to NTI processing this application.</span><FieldError name="consent" errors={errors}/></label>
              {message && <p className="apply-form-message" role="alert">{message}</p>}
              <div className="apply-form-actions"><button type="button" className="btn btn-ghost btn--size-40" onClick={() => setStep(1)}>Back</button><button className="btn btn-secondary-dark btn--size-40" disabled={status === "submitting"}>{status === "submitting" ? "Submitting…" : "Submit application →"}</button></div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
