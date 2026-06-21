const STORAGE_KEY = "math-study-planner-state-v3";
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;

const state = {
  view: "calendar",
  week: loadSettings().week || "A",
  selectedSessionId: loadSettings().selectedSessionId || null,
  progress: loadProgress(),
};

const statusLabels = {
  todo: "A faire",
  active: "En cours",
  done: "Fait",
  review: "A revoir",
};

const viewTitles = {
  calendar: "Calendrier",
  progress: "Progres",
};

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw.progress || raw || {};
  } catch {
    return {};
  }
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: state.progress }));
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ week: state.week, selectedSessionId: state.selectedSessionId })
  );
}

function domains() {
  return window.STUDY_DOMAINS || [];
}

function programs() {
  return window.STUDY_PROGRAM || [];
}

function getDomain(domainId) {
  return domains().find((domain) => domain.id === domainId);
}

function getProgram(programId) {
  return programs().find((program) => program.id === programId);
}

function getWeek() {
  return window.WEEK_TEMPLATES[state.week] || window.WEEK_TEMPLATES.A;
}

function getStatus(topicId) {
  return state.progress[topicId]?.status || "todo";
}

function setStatus(topicId, status) {
  state.progress[topicId] = {
    ...(state.progress[topicId] || {}),
    status,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  render();
}

function allTopics() {
  const rows = [];
  for (const domain of domains()) {
    domain.programIds.forEach((programId, programOrder) => {
      const program = getProgram(programId);
      if (!program) return;
      program.blocks.forEach((block, blockOrder) => {
        block.items.forEach((topic, topicOrder) => {
          rows.push({
            ...topic,
            domainId: domain.id,
            domainTitle: domain.title,
            domainShortTitle: domain.shortTitle,
            accent: domain.accent,
            programId: program.id,
            levelTitle: program.title,
            blockTitle: block.title,
            programOrder,
            blockOrder,
            topicOrder,
          });
        });
      });
    });
  }
  return rows;
}

function topicSort(a, b) {
  return (
    a.programOrder - b.programOrder ||
    a.blockOrder - b.blockOrder ||
    a.topicOrder - b.topicOrder ||
    (a.sequence || 0) - (b.sequence || 0)
  );
}

function topicsForProgramBlock(programId, blockTitle) {
  return allTopics()
    .filter((topic) => topic.programId === programId && topic.blockTitle === blockTitle)
    .sort(topicSort);
}

function isTopicDone(topic) {
  return getStatus(topic.id) === "done";
}

function blockStats(topics) {
  const total = topics.length;
  const done = topics.filter(isTopicDone).length;
  const active = topics.filter((topic) => getStatus(topic.id) === "active").length;
  const review = topics.filter((topic) => getStatus(topic.id) === "review").length;
  return {
    total,
    done,
    active,
    review,
    pct: total ? Math.round((done / total) * 100) : 100,
  };
}

function currentBlockForDomain(domainId) {
  const domain = getDomain(domainId);
  if (!domain) return null;

  for (const programId of domain.programIds) {
    const program = getProgram(programId);
    if (!program) continue;

    for (const block of program.blocks) {
      const topics = topicsForProgramBlock(program.id, block.title);
      if (!topics.length) continue;
      if (!topics.every(isTopicDone)) {
        return { domain, program, block, topics, stats: blockStats(topics) };
      }
    }
  }

  return { domain, complete: true, topics: [], stats: { total: 0, done: 0, pct: 100 } };
}

function nextTopicsForDomain(domainId, count = 2) {
  const current = currentBlockForDomain(domainId);
  if (!current || current.complete) return [];
  return current.topics.filter((topic) => getStatus(topic.id) !== "done").slice(0, count);
}

function scheduleForWeek() {
  const counters = {};
  return getWeek().days.map((day) => {
    const domain = getDomain(day.domainId);
    const current = currentBlockForDomain(day.domainId);
    const candidates = nextTopicsForDomain(day.domainId, 8);
    const sessions = window.SESSION_SLOTS.map((slot) => {
      const index = counters[day.domainId] || 0;
      const topic = candidates[index] || candidates[candidates.length - 1] || null;
      counters[day.domainId] = index + 1;
      return {
        ...slot,
        id: `${state.week}-${day.id}-${slot.id}`,
        topic,
      };
    });
    return { ...day, domain, current, sessions };
  });
}

function initControls() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.week = button.dataset.week;
      state.selectedSessionId = null;
      saveSettings();
      render();
    });
  });

  document.getElementById("resetProgress").addEventListener("click", () => {
    if (confirm("Remettre toute la progression a zero ?")) {
      state.progress = {};
      saveProgress();
      render();
    }
  });
}

function render() {
  document.getElementById("viewTitle").textContent = viewTitles[state.view];
  document.getElementById("weekEyebrow").textContent = `${getWeek().label} · planning`;

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.getElementById(`${state.view}View`).classList.add("active-view");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.week === state.week);
  });

  renderCalendar();
  renderProgress();
}

function renderCalendar() {
  const days = scheduleForWeek();
  const calendar = document.getElementById("weekCalendar");

  if (!state.selectedSessionId && days[0]?.sessions[0]) {
    state.selectedSessionId = days[0].sessions[0].id;
    saveSettings();
  }

  calendar.innerHTML = days.map((day) => renderDayCard(day)).join("");

  calendar.querySelectorAll(".course-block").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSessionId = button.dataset.sessionId;
      saveSettings();
      renderCalendar();
    });
  });

  renderSelectedCourse(days);
}

function renderDayCard(day) {
  return `
    <section class="day-card accent-${day.domain.accent}">
      <div class="day-card-header">
        <span>${escapeHtml(day.label)}</span>
        <div>
          <strong>${escapeHtml(day.longLabel)}</strong>
          <small>${escapeHtml(day.domain.title)}</small>
        </div>
      </div>
      <div class="day-slots">
        ${day.sessions.map((session) => renderCourseBlock(day, session)).join("")}
      </div>
    </section>
  `;
}

function renderCourseBlock(day, session) {
  const topic = session?.topic;
  const selected = session?.id === state.selectedSessionId ? " selected" : "";
  const status = topic ? getStatus(topic.id) : "done";
  const currentLabel = day.current?.complete
    ? "Termine"
    : `${day.current.program.title} · ${day.current.block.title}`;

  return `
    <button class="course-block accent-${day.domain.accent} status-${status}${selected}" type="button" data-session-id="${session.id}">
      <time>${escapeHtml(session.start)}-${escapeHtml(session.end)}</time>
      <span>${escapeHtml(day.domain.shortTitle)}</span>
      <strong>${escapeHtml(topic?.title || "Termine")}</strong>
      <small>${escapeHtml(currentLabel)}</small>
      <em>${escapeHtml(statusLabels[status] || status)}</em>
    </button>
  `;
}

function renderSelectedCourse(days) {
  const detail = document.getElementById("courseDetail");
  const allSessions = days.flatMap((day) => day.sessions.map((session) => ({ ...session, day })));
  const selected = allSessions.find((session) => session.id === state.selectedSessionId) || allSessions[0];

  if (!selected?.topic) {
    detail.innerHTML = `
      <section class="detail-card">
        <h2>${escapeHtml(selected?.day.domain.title || "Domaine")}</h2>
        <p>Ce domaine est termine dans les donnees actuelles.</p>
      </section>
    `;
    return;
  }

  const topic = selected.topic;
  const current = selected.day.current;
  detail.innerHTML = `
    <section class="detail-card accent-${selected.day.domain.accent}">
      <div class="detail-head">
        <span>${escapeHtml(selected.day.longLabel)} · ${selected.start}-${selected.end}</span>
        <strong>${escapeHtml(selected.day.domain.title)}</strong>
      </div>
      <h2>${escapeHtml(topic.title)}</h2>
      <p>${escapeHtml(current.program.title)} · ${escapeHtml(current.block.title)}</p>
      <div class="resource-line">${escapeHtml((topic.resources || [])[0] || "Ressource a definir")}</div>
      ${renderStatusActions(topic)}
    </section>
  `;
  attachStatusHandlers(detail);
}

function renderProgress() {
  const container = document.getElementById("progressContent");
  container.innerHTML = domains().map((domain) => renderDomainProgress(domain)).join("");
  attachStatusHandlers(container);
}

function renderDomainProgress(domain) {
  const current = currentBlockForDomain(domain.id);

  if (!current || current.complete) {
    return `
      <section class="progress-card accent-${domain.accent}">
        <div class="progress-head">
          <h2>${escapeHtml(domain.title)}</h2>
          <span>100%</span>
        </div>
        <p>Tout le programme visible est termine.</p>
      </section>
    `;
  }

  return `
    <section class="progress-card accent-${domain.accent}">
      <div class="progress-head">
        <h2>${escapeHtml(domain.title)}</h2>
        <span>${current.stats.pct}%</span>
      </div>
      <div class="current-block">
        <span>Bloc courant</span>
        <strong>${escapeHtml(current.program.title)}</strong>
        <h3>${escapeHtml(current.block.title)}</h3>
        <small>${current.stats.done}/${current.stats.total} chapitres faits</small>
      </div>
      <div class="progress-bar"><span style="width:${current.stats.pct}%"></span></div>
      <div class="chapter-list">
        ${current.topics.map((topic) => renderChapterProgress(topic)).join("")}
      </div>
    </section>
  `;
}

function renderChapterProgress(topic) {
  const status = getStatus(topic.id);
  return `
    <article class="chapter-row status-${status}">
      <div>
        <strong>${escapeHtml(topic.title)}</strong>
        <span>${escapeHtml(statusLabels[status])}</span>
      </div>
      ${renderStatusActions(topic)}
    </article>
  `;
}

function renderStatusActions(topic) {
  return `
    <div class="status-actions" data-topic-id="${topic.id}">
      ${Object.entries(statusLabels)
        .filter(([key]) => key !== "todo")
        .map(([key, label]) => {
          const active = getStatus(topic.id) === key ? " active-status" : "";
          return `<button class="status-button${active}" type="button" data-status="${key}">${label}</button>`;
        })
        .join("")}
    </div>
  `;
}

function attachStatusHandlers(root) {
  root.querySelectorAll(".status-actions").forEach((group) => {
    group.querySelectorAll(".status-button").forEach((button) => {
      button.addEventListener("click", () => setStatus(group.dataset.topicId, button.dataset.status));
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

initControls();
render();
