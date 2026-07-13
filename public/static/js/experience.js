/* GStar V3 interactions: readiness, evidence filters, responsive disclosure, and application state. */
(function () {
  window.addEventListener("load", () => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  });
})();

(function () {
  const form = document.getElementById("readiness-form");
  if (!form) return;

  const inputs = Array.from(form.querySelectorAll('input[name="readiness"]'));
  const bar = document.getElementById("readiness-progress-bar");
  const progress = document.getElementById("readiness-progress-copy");
  const result = document.getElementById("readiness-result");
  const storageKey = "gstar_readiness_signals";

  const states = [
    {
      title: "Select what already feels true.",
      copy: "We will show the most useful next step based on your current foundation.",
      label: "Explore the curriculum",
      href: "#curriculum"
    },
    {
      title: "Start with the foundations.",
      copy: "Build confidence in Python, PyTorch, and transformer internals before the entrance assessment.",
      label: "Review the prerequisites",
      href: "#fit"
    },
    {
      title: "You are building toward the bar.",
      copy: "Your foundation is forming. Use the curriculum to identify the one or two gaps worth closing next.",
      label: "Map your learning path",
      href: "#curriculum"
    },
    {
      title: "You show a strong readiness signal.",
      copy: "You do not need every box checked. The entrance assessment is the right next piece of evidence.",
      label: "Start your application",
      href: "#apply"
    }
  ];

  function selectedValues() {
    return inputs.filter((input) => input.checked).map((input) => input.value);
  }

  function updateReadiness(publish = true) {
    const count = inputs.filter((input) => input.checked).length;
    const state = count === 0 ? states[0] : count <= 2 ? states[1] : count <= 3 ? states[2] : states[3];
    bar.style.width = ((count / inputs.length) * 100) + "%";
    progress.textContent = count + " of " + inputs.length + " signals selected";
    result.querySelector("h3").textContent = state.title;
    result.querySelector("p").textContent = state.copy;
    const link = result.querySelector("a");
    link.href = state.href;
    link.firstChild.textContent = state.label + " ";
    const values = selectedValues();
    localStorage.setItem(storageKey, JSON.stringify(values));
    if (publish) window.dispatchEvent(new CustomEvent("gstar:readiness-change", { detail: { values } }));
  }

  form.addEventListener("change", updateReadiness);
  window.addEventListener("gstar:readiness-set", (event) => {
    const values = Array.isArray(event.detail?.values) ? event.detail.values : [];
    inputs.forEach((input) => { input.checked = values.includes(input.value); });
    updateReadiness(false);
  });
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(stored)) inputs.forEach((input) => { input.checked = stored.includes(input.value); });
  } catch { localStorage.removeItem(storageKey); }
  updateReadiness(false);
})();

(function () {
  const filters = Array.from(document.querySelectorAll("[data-project-filter]"));
  const projects = Array.from(document.querySelectorAll("[data-project-category]"));
  if (!filters.length || !projects.length) return;

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.projectFilter;
      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      projects.forEach((project) => {
        project.hidden = filter !== "all" && project.dataset.projectCategory !== filter;
      });
    });
  });

  document.querySelectorAll(".project-detail-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const detail = button.nextElementSibling;
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      detail.classList.toggle("is-open", open);
    });
  });
})();

(function () {
  const section = document.querySelector(".mentors-v2");
  const toggle = document.getElementById("mentors-mobile-toggle");
  if (!section || !toggle) return;

  toggle.addEventListener("click", () => {
    const open = !section.classList.contains("show-all-mobile");
    section.classList.toggle("show-all-mobile", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Show fewer mentor profiles" : "View all mentor profiles";
  });
})();

(function () {
  const sticky = document.getElementById("sticky-apply");
  const hero = document.getElementById("top");
  const admissions = document.getElementById("admissions");
  const apply = document.getElementById("apply");
  const config = window.GSTAR_CONFIG;
  if (!sticky || !hero || !admissions || !apply || !config) return;

  const now = new Date();
  const dates = config.dates;
  const earlyBird = new Date(dates.earlyBirdDeadline);
  const finalDeadline = new Date(dates.finalDeadline);
  const bootcampStart = new Date(dates.bootcampStart);
  const capstone = new Date(dates.capstone);
  const summit = new Date(dates.summit);
  const format = (date, options) => new Intl.DateTimeFormat("en-US", { timeZone: config.timezone, ...options }).format(date);
  const shortDate = (date) => format(date, { month: "short", day: "numeric" });
  const longDate = (date) => format(date, { month: "long", day: "numeric", year: "numeric" });
  const monthYear = (date) => format(date, { month: "short", year: "numeric" });
  const label = document.getElementById("sticky-deadline-label");
  const value = document.getElementById("sticky-deadline-value");
  const heroNote = document.getElementById("hero-deadline-note");
  const finalNote = document.getElementById("final-deadline-note");

  const heroProgramDates = document.getElementById("hero-program-dates");
  if (heroProgramDates) heroProgramDates.textContent = format(bootcampStart, { month: "short" }) + "–" + monthYear(capstone);

  const applicationDeadline = document.getElementById("application-step-deadline");
  if (applicationDeadline) applicationDeadline.textContent = "Before " + shortDate(finalDeadline);
  const applicationStart = document.getElementById("application-step-start");
  if (applicationStart) applicationStart.textContent = format(bootcampStart, { month: "long" }) + " start";

  document.querySelectorAll("[data-date-key]").forEach((element) => {
    const key = element.dataset.dateKey;
    const date = new Date(dates[key]);
    element.dateTime = dates[key].slice(0, 10);
    if (key === "bootcampStart") element.textContent = "Early " + format(date, { month: "short" });
    else if (key === "capstone") element.textContent = monthYear(date);
    else if (key === "summit") element.textContent = format(date, { year: "numeric" });
    else element.textContent = shortDate(date);
  });

  const faqDates = document.getElementById("faq-program-dates");
  if (faqDates) {
    faqDates.textContent = "Applications open " + longDate(new Date(dates.applicationsOpen)) +
      ", with two deadlines — Early Bird (" + longDate(earlyBird) + ") and Final (" + longDate(finalDeadline) +
      "). The 12-week program runs from early " + format(bootcampStart, { month: "long" }) + " to " +
      monthYear(capstone) + ", fully online. Top teams present at the GStar Summit in " +
      format(summit, { year: "numeric" }) + ".";
  }

  if (now <= earlyBird) {
    label.textContent = "Applications open";
    value.textContent = "Early Bird · " + shortDate(earlyBird);
    if (heroNote) heroNote.textContent = "Applications are open · Early Bird Deadline: " + longDate(earlyBird);
    if (finalNote) finalNote.textContent = "Applications are open · Final Deadline: " + longDate(finalDeadline) + " (" + config.timezoneLabel + ")";
  } else if (now <= finalDeadline) {
    label.textContent = "Final application round";
    value.textContent = "Final deadline · " + shortDate(finalDeadline);
    if (heroNote) heroNote.textContent = "Applications are open · Final Deadline: " + longDate(finalDeadline);
    if (finalNote) finalNote.textContent = "Applications are open · Final Deadline: " + longDate(finalDeadline) + " (" + config.timezoneLabel + ")";
  } else {
    label.textContent = "Applications closed";
    value.textContent = "Register for the next cohort";
    if (heroNote) heroNote.textContent = "Applications for the " + config.cohortYear + " cohort are closed";
    if (finalNote) finalNote.textContent = "Applications for the " + config.cohortYear + " cohort are closed · Register interest for future updates";
  }

  let heroVisible = true;
  let admissionsVisible = false;
  let applyVisible = false;
  const render = () => sticky.classList.toggle("is-visible", !heroVisible && !admissionsVisible && !applyVisible);
  const isInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };
  const syncFromPosition = () => {
    heroVisible = isInViewport(hero);
    admissionsVisible = isInViewport(admissions);
    applyVisible = isInViewport(apply);
    render();
  };

  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === hero) heroVisible = entry.isIntersecting;
      if (entry.target === admissions) admissionsVisible = entry.isIntersecting;
      if (entry.target === apply) applyVisible = entry.isIntersecting;
    });
    render();
  }, { threshold: .08 });
  observer.observe(hero);
  observer.observe(admissions);
  observer.observe(apply);
  window.addEventListener("scroll", syncFromPosition, { passive: true });
  window.addEventListener("load", () => requestAnimationFrame(syncFromPosition));
  requestAnimationFrame(syncFromPosition);
})();
