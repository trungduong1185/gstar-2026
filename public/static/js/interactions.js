// GStar Bootcamp — countdown Early Bird, hamburger nav toggle, FAQ accordion.

// ------- FAQ accordion fallback -------
// Modern browsers dùng `name` attribute cho <details> group (native).
// Với browser cũ: khi 1 details mở, đóng các details cùng group.
(function () {
  const supportsGroup = "name" in HTMLDetailsElement.prototype;
  if (supportsGroup) return;                              // browser tự lo, khỏi cần JS

  const items = document.querySelectorAll('.faq details[name="faq"]');
  items.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      items.forEach((other) => { if (other !== d) other.open = false; });
    });
  });
})();

// ------- Nav toggle -------
(function () {
  const nav = document.getElementById("nav");
  const btn = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");
  const scrim = document.getElementById("nav-scrim");
  if (!nav || !btn || !menu) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };

  // Toggle — bắt trong capture phase để không bị ai chặn trước
  btn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!nav.classList.contains("is-open"));
    },
    true
  );

  // Đóng khi bấm vào link trong menu
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  // Đóng khi bấm scrim
  if (scrim) scrim.addEventListener("click", () => setOpen(false));

  // Đóng khi bấm ngoài — check chặt: chỉ đóng nếu menu đang mở và target không thuộc nav/menu/toggle
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-open")) return;
    if (btn.contains(e.target) || menu.contains(e.target) || nav.contains(e.target)) return;
    setOpen(false);
  });

  // Đóng khi Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();

(function () {
  const configDates = window.GSTAR_CONFIG && window.GSTAR_CONFIG.dates;
  const earlyBirdTarget = new Date(configDates ? configDates.earlyBirdDeadline : "2026-07-25T23:59:59+07:00").getTime();
  const finalTarget = new Date(configDates ? configDates.finalDeadline : "2026-07-25T23:59:59+07:00").getTime();
  const target = Date.now() <= earlyBirdTarget ? earlyBirdTarget : finalTarget;
  const targetLabel = target === earlyBirdTarget ? "Early Bird Deadline" : "Final Deadline";

  const el = {
    d: document.getElementById("cd-days"),
    h: document.getElementById("cd-hours"),
    m: document.getElementById("cd-mins"),
    s: document.getElementById("cd-secs"),
    wrap: document.getElementById("countdown"),
  };
  if (!el.wrap) return;
  const countdownLabel = el.wrap.querySelector(".countdown-label");
  if (countdownLabel) countdownLabel.textContent = targetLabel;

  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      const closedCopy = configDates ? "Applications closed" : "Early Bird đã đóng";
      el.wrap.innerHTML = '<div class="countdown-cell" style="min-width:auto;padding:14px 24px"><div class="countdown-num" style="font-size:18px;color:#fff">' + closedCopy + '</div></div>';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (el.d) el.d.textContent = pad(d);
    if (el.h) el.h.textContent = pad(h);
    if (el.m) el.m.textContent = pad(m);
    if (el.s) el.s.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

// ------- Stats bar animation -------
(function () {
  const statsBar = document.querySelector(".stats-bar");
  if (!statsBar) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stats = Array.from(statsBar.querySelectorAll(".stat"));
  const numbers = statsBar.querySelectorAll(".stat-num");

  stats.forEach((stat, index) => {
    stat.style.setProperty("--stat-index", index);
  });

  const parseStat = (value) => {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return null;

    return {
      end: Number(match[1]),
      suffix: match[2],
      decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0,
    };
  };

  const animateNumber = (node, stat, duration) => {
    const start = performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = `${(stat.end * eased).toFixed(stat.decimals)}${stat.suffix}`;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        node.textContent = `${stat.end.toFixed(stat.decimals)}${stat.suffix}`;
      }
    };

    requestAnimationFrame(frame);
  };

  const runAnimation = () => {
    statsBar.classList.add("is-visible");
    window.setTimeout(() => {
      statsBar.classList.remove("is-animating");
    }, 1300);

    if (prefersReducedMotion) return;

    numbers.forEach((node, index) => {
      const stat = parseStat(node.textContent);
      if (!stat) return;

      window.setTimeout(() => {
        animateNumber(node, stat, 950);
      }, index * 90);
    });
  };

  if (prefersReducedMotion) {
    runAnimation();
    return;
  }

  statsBar.classList.add("is-animating");

  if (!("IntersectionObserver" in window)) {
    runAnimation();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;

    runAnimation();
    observer.disconnect();
  }, { threshold: 0.35 });

  observer.observe(statsBar);
})();

/* ---- Curriculum: click-to-expand weeks (accordion on desktop, bottom sheet on mobile) ---- */
(function () {
  const boot = () => {
  const cards = document.querySelectorAll(".week");
  if (!cards.length) return;

  const mq = window.matchMedia("(max-width: 640px)");

  // Shared backdrop for the mobile bottom sheet.
  const backdrop = document.createElement("div");
  backdrop.className = "week-backdrop";
  document.body.appendChild(backdrop);

  const closeAll = () => {
    cards.forEach((c) => { c.classList.remove("is-open"); c.setAttribute("aria-expanded", "false"); });
    backdrop.classList.remove("is-active");
    document.body.classList.remove("week-sheet-lock");
  };

  const open = (card) => {
    cards.forEach((o) => { if (o !== card) { o.classList.remove("is-open"); o.setAttribute("aria-expanded", "false"); } });
    card.classList.add("is-open");
    card.setAttribute("aria-expanded", "true");
    if (mq.matches) {
      backdrop.classList.add("is-active");
      document.body.classList.add("week-sheet-lock");
    }
  };

  cards.forEach((card) => {
    // Close (✕) button — only shown as a sheet on mobile.
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "week-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    card.appendChild(closeBtn);

    const handle = (e) => {
      if (e.target.closest(".week-close")) { closeAll(); return; }
      const isOpen = card.classList.contains("is-open");
      if (isOpen) {
        // On mobile the open card is a sheet — don't close on content taps
        // (use the ✕ button or the backdrop). On desktop, tapping toggles closed.
        if (mq.matches) return;
        closeAll();
      } else {
        open(card);
      }
    };

    card.addEventListener("click", handle);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (card.classList.contains("is-open")) closeAll(); else open(card);
      }
    });
  });

  backdrop.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
  // Reset when crossing the mobile/desktop breakpoint so a stray sheet doesn't linger.
  mq.addEventListener("change", closeAll);
  };
  // Week cards are rendered by the curriculum script (later), so wait for the DOM to settle.
  if (document.readyState === "loading" || document.readyState === "interactive") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* ---- Mentors: static list, modal (desktop) / bottom sheet (mobile) enriched from configured data ---- */
(async function () {
  let cards = document.querySelectorAll(".mentor");
  if (!cards.length) return;

  const href = (url) => (/^https?:\/\//i.test(url) ? url : "https://" + url);
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  const mentorSource = document.body.dataset.mentorSource || "";
  const basePath = mentorSource.replace(/\/api\/mentors(?:\?.*)?$/, "");
  const assetUrl = (value) => {
    const source = String(value || "");
    if (!source || /^(?:https?:|data:|blob:)/i.test(source)) return source;
    if (basePath && (source === basePath || source.startsWith(basePath + "/"))) return source;
    return basePath + "/" + source.replace(/^\//, "");
  };

  // Index the data file (if present) by normalized name — used only to enrich the static cards.
  let data = (typeof speakersData !== "undefined" && speakersData) ? speakersData : [];
  if (mentorSource) {
    try {
      const response = await fetch(mentorSource);
      if (!response.ok) throw new Error("Mentor data request failed");
      const payload = await response.json();
      data = Array.isArray(payload) ? payload : (payload.mentors || []);
    } catch (error) {
      console.warn("Using bundled mentor fallback data.", error);
    }
  }

  // The API is the publishing source for the mentor cards as well as modal details.
  if (mentorSource && data.length) {
    const grids = Array.from(document.querySelectorAll(".mentors-v2 .mentors-grid"));
    const titles = Array.from(document.querySelectorAll(".mentors-v2 .mentor-group-title"));
    const groups = ["Program leadership & senior mentors", "Guest lecturers & mentors", "Academic & mentoring team"];
    grids.forEach((grid, groupIndex) => {
      grid.textContent = "";
      const members = data.filter((mentor) => mentor.group === groups[groupIndex] && mentor.visible !== false);
      members.forEach((mentor) => {
        const card = document.createElement("div");
        card.className = "mentor";
        const avatar = document.createElement("div");
        avatar.className = "mentor-avatar";
        const initials = document.createElement("span");
        initials.textContent = String(mentor.name || "").replace(/^(Dr\.|Prof\.)\s*/i, "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
        avatar.appendChild(initials);
        if (mentor.image) {
          const image = document.createElement("img");
          image.src = assetUrl(mentor.image);
          image.alt = mentor.alt || "";
          image.loading = "lazy";
          image.decoding = "async";
          avatar.appendChild(image);
        }
        const content = document.createElement("div");
        const name = document.createElement("div");
        name.className = "mentor-name";
        name.textContent = mentor.name || "";
        const role = document.createElement("div");
        role.className = "mentor-role";
        role.textContent = (mentor.position || []).join(" · ");
        content.append(name, role);
        card.append(avatar, content);
        grid.appendChild(card);
      });
      const count = titles[groupIndex] && titles[groupIndex].querySelector("b");
      if (count) count.textContent = String(members.length).padStart(2, "0");
    });
    const contributorCount = document.querySelector(".mentor-network-meta strong");
    if (contributorCount) contributorCount.textContent = String(data.filter((mentor) => mentor.visible !== false).length);
    cards = document.querySelectorAll(".mentor");
  }
  const byName = {};
  data.forEach((sp) => { byName[norm(sp.name)] = sp; });

  const cardText = (card, sel) => { const n = card.querySelector(sel); return n ? n.textContent.trim() : ""; };

  // Build the shared modal once.
  const modal = document.createElement("div");
  modal.className = "mentor-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML =
    '<div class="mentor-modal-backdrop"></div>' +
    '<div class="mentor-modal-panel" role="document">' +
      '<button type="button" class="mentor-modal-close" aria-label="Close">&times;</button>' +
      '<div class="mentor-modal-avatar" aria-hidden="true"></div>' +
      '<div class="mentor-modal-cat"></div>' +
      '<div class="mentor-modal-name"></div>' +
      '<div class="mentor-modal-role"></div>' +
      '<div class="mentor-modal-bio"></div>' +
      '<div class="mentor-modal-social"></div>' +
    "</div>";
  document.body.appendChild(modal);

  const panel = modal.querySelector(".mentor-modal-panel");
  const elAvatar = modal.querySelector(".mentor-modal-avatar");
  const elCat = modal.querySelector(".mentor-modal-cat");
  const elName = modal.querySelector(".mentor-modal-name");
  const elRole = modal.querySelector(".mentor-modal-role");
  const elBio = modal.querySelector(".mentor-modal-bio");
  const elSocial = modal.querySelector(".mentor-modal-social");
  const closeBtn = modal.querySelector(".mentor-modal-close");
  let lastFocused = null;

  const fill = (card) => {
    const sp = byName[norm(cardText(card, ".mentor-name"))];
    const cardImage = card.querySelector(".mentor-avatar img");
    const imageSrc = assetUrl((sp && sp.image) || (cardImage && cardImage.getAttribute("src")));

    elAvatar.innerHTML = "";
    if (imageSrc) {
      const image = document.createElement("img");
      image.src = imageSrc;
      image.alt = (sp && sp.alt) || "";
      elAvatar.appendChild(image);
    } else {
      elAvatar.textContent = cardText(card, ".mentor-avatar");
    }
    elName.textContent = cardText(card, ".mentor-name");

    elCat.textContent = (sp && sp.category) || "";

    elRole.innerHTML = "";
    const positions = (sp && sp.position && sp.position.length) ? sp.position : [cardText(card, ".mentor-role")];
    positions.filter(Boolean).forEach((p) => {
      const d = document.createElement("div");
      d.className = "mentor-modal-pos";
      d.textContent = p;
      elRole.appendChild(d);
    });

    elBio.innerHTML = "";
    String((sp && sp.bio) || "").split(/\n+/).forEach((para) => {
      if (!para.trim()) return;
      const p = document.createElement("p");
      p.textContent = para.trim();
      elBio.appendChild(p);
    });

    elSocial.innerHTML = "";
    const soc = (sp && sp.social) || {};
    const add = (link, label) => {
      if (!link || !link.url) return;
      const a = document.createElement("a");
      a.className = "mentor-modal-link";
      a.href = href(link.url);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = label;
      elSocial.appendChild(a);
    };
    add(soc.linkedin, "LinkedIn");
    add(soc.twitter, "X (Twitter)");
    add(soc.boltz, "Boltz");
    add(soc.readingGroup, "Starkly Speaking");
  };

  const openModal = (card) => {
    lastFocused = card;
    fill(card);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("mentor-modal-lock");
    panel.scrollTop = 0;
    closeBtn.focus();
  };
  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mentor-modal-lock");
    if (lastFocused) lastFocused.focus();
  };

  cards.forEach((card) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", () => openModal(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); openModal(card); }
    });
  });

  modal.querySelector(".mentor-modal-backdrop").addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
})();

/* ---- Curriculum: sticky-scroll (scrollytelling) ---- */
(function () {
  const mount = document.getElementById("curriculum-scrolly");
  if (!mount) return;

  const phases = [
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3 19 6v5c0 4.8-2.8 8-7 10-4.2-2-7-5.2-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>', label: "Phase 1",
      title: "Foundations & Pre-training",
      desc: "Rebuild the fundamentals, then learn to train and adapt frontier models from scratch.",
      image: "static/img/projects/project-qgentic-ai.webp",
      pages: [
        { title: "Fundamentals", subtext: "Core concepts & setup" },
        { title: "Pre-training", subtext: "Attention, MoE & Mamba" },
        { title: "Post-training", subtext: "SFT & parameter-efficient tuning" },
        { title: "Alignment", subtext: "RLHF, DPO & reasoning" }
      ],
      weeks: [
        { n: 1, title: "Review of Advanced NLP", desc: "Recap the fundamentals: attention, tokenization, Transformers, and end-to-end training.", details: ["Self-attention & multi-head attention from first principles", "Tokenization — BPE, WordPiece, SentencePiece", "Transformer encoder / decoder architecture", "Positional encodings & embeddings", "End-to-end training loop & loss functions"] },
        { n: 2, title: "Pre-training", desc: "Linear & FlashAttention, advanced Transformers (Sparse, MoE), hybrid architectures (Mamba), and LLM pre-training from scratch.", details: ["Linear Attention & FlashAttention internals", "Sparse Transformers, Transformer-XL, Mixture-of-Experts", "Hybrid architectures — Mamba & state-space models", "Tutorial: train a language model from scratch", "Assignment 1: optimizer state sharding"] },
        { n: 3, title: "Post-training", desc: "Supervised fine-tuning and parameter-efficient methods — data prep, training, decoding, and evaluation.", details: ["Supervised fine-tuning (SFT) pipelines", "Parameter-efficient methods — LoRA, QLoRA, adapters", "Data preparation & curation", "Decoding strategies", "Evaluation & regression testing"] },
        { n: 4, title: "Alignment & Advanced Reasoning", desc: "Learning from human feedback (RLHF, DPO, SimPO) and reasoning models (DeepSeek-R1, GRPO, RLVR).", details: ["RLHF end-to-end", "Direct Preference Optimization (DPO) & SimPO", "Reward modeling", "Reasoning models — DeepSeek-R1, GRPO, RLVR", "Reinforcement learning for agents"] }
      ]
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/></svg>', label: "Phase 2",
      title: "Reasoning & Inference at Scale",
      desc: "Put the theory to work, form teams, and make models fast and cheap enough to ship.",
      image: "static/img/virtual-cell-presentation-preview.png",
      pages: [
        { title: "Reasoning in Practice", subtext: "Train models with GRPO" },
        { title: "Prototype", subtext: "First team build & demo" },
        { title: "Guest Lectures", subtext: "Frontier deep dives" },
        { title: "Advanced Inference", subtext: "Serving, decoding & speed" }
      ],
      weeks: [
        { n: 5, title: "Reasoning in Practice", desc: "Assignment 2 (Weeks 3–5): train math-reasoning models with GRPO, end to end.", details: ["Assignment 2 deep dive (Weeks 3–5)", "Train math-reasoning models with GRPO", "Reward shaping for verifiable rewards", "Evaluation on math benchmarks", "Debugging RL training runs"] },
        { n: 6, title: "Project Prototype Presentation", desc: "Individuals merge into teams for collaborative work and present a first prototype.", details: ["Form teams from individuals", "Scope a capstone problem", "Build a first working prototype", "Peer & mentor feedback", "Milestone planning for the capstone"] },
        { n: 7, title: "Guest Lectures", desc: "Text diffusion models and a FlashAttention deep dive from frontier researchers.", details: ["Text diffusion models — theory & practice", "FlashAttention deep dive", "Live Q&A with frontier researchers"] },
        { n: 8, title: "Advanced Inference", desc: "KV-caching, advanced & speculative decoding, Triton, serving optimizations, plus FLOPS and GPU utilization.", details: ["KV-caching strategies", "Speculative & advanced decoding", "Writing Triton kernels", "Serving optimizations & batching", "FLOPS & GPU utilization"] }
      ]
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM18.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM5.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/></svg>', label: "Phase 3",
      title: "Agentic Systems & Capstone",
      desc: "Build the systems powering today's AI and ship a mentored, graded, ranked capstone.",
      image: "static/img/projects/project-ares-ai.webp",
      pages: [
        { title: "Agentic Systems", subtext: "Computer-use & multi-agent" },
        { title: "Evaluation", subtext: "LLM-as-judge & benchmarks" },
        { title: "Guest Lectures", subtext: "Safety & leadership" },
        { title: "Capstone", subtext: "Present & publish" }
      ],
      weeks: [
        { n: 9, title: "Agentic Systems & Evaluation", desc: "Computer-use agents, coding agents, multi-agent systems, orchestration, and LLM-as-judge evaluation.", details: ["Computer Use Agents (CUA)", "Coding agents & autonomous engineering workflows", "Multi-agent systems — coordination & roles", "Harness, orchestration & the Harmony framework", "Evaluation — LLM-as-judge & benchmarks"] },
        { n: 10, title: "Guest Lectures", desc: "AI Safety and AI for Drug Discovery.", details: ["AI Safety — alignment & risk in practice", "AI for Drug Discovery", "Panel discussion with domain experts"] },
        { n: 11, title: "Guest Lectures", desc: "Leadership and research skills.", details: ["Leadership in AI teams", "Research skills & paper writing", "Navigating career pathways"] },
        { n: 12, title: "Final Project Presentation", desc: "Present your capstone, then publish a camera-ready write-up on Medium, Hugging Face & the NTI site.", details: ["Present your capstone to the cohort", "Camera-ready write-up", "Publish on Medium, Hugging Face & the NTI website", "Judging & awards"] }
      ]
    }
  ];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Rail
  const rail = document.createElement("div");
  rail.className = "scrolly-rail";
  rail.setAttribute("aria-label", "Curriculum phases");
  rail.innerHTML = phases.map((p, i) =>
    '<button type="button" class="scrolly-rail-btn' + (i === 0 ? " is-active" : "") +
    '" data-phase="' + i + '" aria-label="' + esc(p.label + ": " + p.title) + '">' + p.icon + "</button>"
  ).join("");

  // Week cards for a phase (shared by the mobile inline copy and the pinned panel)
  const bodyHTML = (p) =>
    '<div class="weeks weeks--panel">' +
      p.weeks.map((w) =>
        '<article class="week" role="button" tabindex="0" aria-expanded="false">' +
          '<div class="week-num">Week ' + esc(w.n) + "</div>" +
          "<h3>" + esc(w.title) + "</h3><p>" + esc(w.desc) + "</p>" +
          ((w.details && w.details.length)
            ? '<div class="week-details"><ul>' + w.details.map((d) => "<li>" + esc(d) + "</li>").join("") + "</ul></div>"
            : "") +
        "</article>"
      ).join("") +
    "</div>";

  // Center column — scrolling narrative (tiles + weeks show inline here only on mobile)
  const main = document.createElement("div");
  main.className = "scrolly-main";
  main.innerHTML = phases.map((p, i) =>
    '<article class="phase" id="phase-' + i + '" data-phase="' + i + '">' +
      '<span class="phase-eyebrow">' + esc(p.label) + "</span>" +
      '<h3 class="phase-title">' + esc(p.title) + "</h3>" +
      '<p class="phase-desc">' + esc(p.desc) + "</p>" +
      '<div class="phase-body">' + bodyHTML(p) + "</div>" +
    "</article>"
  ).join("");

  const curriculumCta = document.getElementById("curriculum-cta");
  if (curriculumCta) main.append(curriculumCta);

  // Right pinned column — the active phase's tiles + week list (crossfades on desktop)
  const visual = document.createElement("div");
  visual.className = "scrolly-visual";
  visual.innerHTML =
    '<div class="scrolly-stack">' +
      phases.map((p, i) =>
        '<div class="scrolly-panel' + (i === 0 ? " is-active" : "") + '" data-phase="' + i +
        '" aria-hidden="' + (i === 0 ? "false" : "true") + '">' + bodyHTML(p) + "</div>"
      ).join("") +
    "</div>";

  mount.append(rail, main, visual);

  const railBtns = rail.querySelectorAll(".scrolly-rail-btn");
  const panels = visual.querySelectorAll(".scrolly-panel");
  const blocks = main.querySelectorAll(".phase");

  const setActive = (i) => {
    railBtns.forEach((b, k) => b.classList.toggle("is-active", k === i));
    panels.forEach((pn, k) => {
      pn.classList.toggle("is-active", k === i);
      pn.setAttribute("aria-hidden", k === i ? "false" : "true");
    });
  };

  // Rail click → smooth-scroll to that phase
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  railBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.phase);
      blocks[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  });

  // Activate the phase crossing the viewport center
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.phase)); });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    blocks.forEach((b) => io.observe(b));
  }
})();
