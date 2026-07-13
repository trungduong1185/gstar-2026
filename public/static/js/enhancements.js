(() => {
  const curriculum = document.getElementById("curriculum");
  const projects = document.getElementById("projects");
  const mentors = document.getElementById("mentors");
  const outcomes = document.getElementById("outcomes");
  const testimonials = document.getElementById("testimonials");

  if (curriculum && projects) {
    curriculum.parentNode.insertBefore(projects, curriculum);
  }

  if (mentors && outcomes && testimonials) {
    mentors.parentNode.insertBefore(testimonials, outcomes);
  }

  const weeks = curriculum ? [...curriculum.querySelectorAll(".week")] : [];
  const phases = [
    [0, "Phase 1 · Foundations", "Refresh the core and train from first principles."],
    [2, "Phase 2 · Post-training & reasoning", "Align, evaluate, and improve model reasoning."],
    [5, "Phase 3 · Capstone formation", "Form teams, prototype, and respond to critique."],
    [7, "Phase 4 · Systems & delivery", "Optimize inference, build agents, and ship the final work."]
  ];

  phases.slice().reverse().forEach(([index, title, description]) => {
    const week = weeks[index];
    if (!week) return;

    const heading = document.createElement("div");
    heading.className = "phase-label";
    heading.innerHTML = `<strong>${title}</strong><span>${description}</span>`;
    week.parentNode.insertBefore(heading, week);
  });

  document.querySelectorAll("iframe, #outcomes img").forEach((media) => {
    media.setAttribute("loading", "lazy");
  });

  document.querySelectorAll(".mentor-avatar img").forEach((image) => {
    const showFallback = () => { image.hidden = true; };
    image.addEventListener("error", showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });
})();

/* ---- Unified scroll reveal for every content section ----
   One mechanism (scroll + rAF + safety timeout, no IntersectionObserver) drives:
   - generic sections  → `is-reveal-ready` (opacity fade)
   - mentors/outcomes  → `is-motion-ready` (their richer staggered reveal)
   Content can never get stuck hidden: reduced-motion and the safety timeout
   both guarantee a visible end state. */
(() => {
  // [element, readyClass] — readyClass sets the pre-reveal hidden state in CSS.
  const targets = [];
  document
    .querySelectorAll("section.section:not(.mentors-v2):not(.outcomes-v2)")
    .forEach((section) => targets.push([section, "is-reveal-ready"]));
  document
    .querySelectorAll(".mentors-v2, .outcomes-v2")
    .forEach((section) => targets.push([section, "is-motion-ready"]));

  if (!targets.length) return;

  const revealAll = () => targets.forEach(([el]) => el.classList.add("is-revealed"));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealAll();
    return;
  }

  targets.forEach(([el, cls]) => el.classList.add(cls));

  let pending = targets.map(([el]) => el);
  const reveal = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    pending = pending.filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.88 && rect.bottom > 0) { el.classList.add("is-revealed"); return false; }
      return true;
    });
    if (!pending.length) window.removeEventListener("scroll", onScroll);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; reveal(); });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", () => requestAnimationFrame(reveal));
  requestAnimationFrame(reveal);

  // Safety net: guarantee every target is visible even if scroll events never fire.
  setTimeout(revealAll, 2500);
})();
