const STORAGE_KEY = "math-study-planner-state-v3";
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;
const WEEK_ANCHOR = "2026-06-15";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const rangeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const yearFormatter = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });

const state = {
  view: "calendar",
  selectedSessionId: loadSettings().selectedSessionId || null,
  weekOffset: loadSettings().weekOffset || 0,
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
    JSON.stringify({ selectedSessionId: state.selectedSessionId, weekOffset: state.weekOffset })
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
  const weekKey = getCurrentWeekKey(getViewedWeekStart());
  return window.WEEK_TEMPLATES[weekKey] || window.WEEK_TEMPLATES.A;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOfWeek(date) {
  const dayIndex = (date.getDay() + 6) % 7;
  const monday = startOfDay(date);
  monday.setDate(monday.getDate() - dayIndex);
  return monday;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function getWeekStart(date = new Date()) {
  return mondayOfWeek(date);
}

function getPlanningWeekStart(date = new Date()) {
  const today = startOfDay(date);
  const day = today.getDay();
  const monday = mondayOfWeek(today);

  if (day === 0) return addDays(monday, 7);
  if (day === 6) return addDays(monday, 7);
  return monday;
}

function getViewedWeekStart() {
  return addDays(getPlanningWeekStart(), state.weekOffset * 7);
}

function getCurrentWeekKey(date = getViewedWeekStart()) {
  const anchor = mondayOfWeek(parseLocalDate(WEEK_ANCHOR));
  const current = mondayOfWeek(date);
  const distance = Math.floor((current - anchor) / MS_PER_WEEK);
  return Math.abs(distance % 2) === 0 ? "A" : "B";
}

function getWeekRangeLabel(date = getViewedWeekStart()) {
  const monday = mondayOfWeek(date);
  const friday = addDays(monday, 4);
  return `${rangeFormatter.format(monday)} au ${rangeFormatter.format(friday)} ${yearFormatter.format(friday)}`;
}

function todayLabel(date = new Date()) {
  return `${rangeFormatter.format(date)} ${yearFormatter.format(date)}`;
}

function dateId(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getStatus(topicId) {
  return state.progress[topicId]?.status || "todo";
}

function setStatus(topicId, status) {
  const now = new Date().toISOString();
  const previous = state.progress[topicId] || {};
  const next = {
    ...previous,
    status,
    updatedAt: now,
  };

  if (status === "done") {
    next.completedAt = previous.completedAt || now;
  } else {
    delete next.completedAt;
  }

  state.progress[topicId] = {
    ...next,
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

function currentTopicForDomain(domainId) {
  const current = currentBlockForDomain(domainId);
  if (!current || current.complete) return null;
  return current.topics.find((topic) => getStatus(topic.id) !== "done") || null;
}

function scheduleForWeek() {
  const monday = getViewedWeekStart();
  return getWeek().days.map((day) => {
    const dayIndex = ["mon", "tue", "wed", "thu", "fri"].indexOf(day.id);
    const dayDate = addDays(monday, Math.max(dayIndex, 0));
    const domain = getDomain(day.domainId);
    const current = currentBlockForDomain(day.domainId);
    const topic = currentTopicForDomain(day.domainId);
    const sessions = window.SESSION_SLOTS.map((slot) => {
      return {
        ...slot,
        id: `${dateId(dayDate)}-${day.id}-${slot.id}`,
        topic,
      };
    });
    return {
      ...day,
      domain,
      current,
      date: dayDate,
      dateLabel: dayFormatter.format(dayDate),
      sessions,
    };
  });
}

function shiftWeek(delta) {
  state.weekOffset += delta;
  state.selectedSessionId = null;
  saveSettings();
  render();
}

function initControls() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  const calendarView = document.getElementById("calendarView");
  let touchStartX = null;
  let touchStartY = null;

  calendarView.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  calendarView.addEventListener("touchend", (event) => {
    if (touchStartX === null || touchStartY === null) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;

    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    shiftWeek(dx < 0 ? 1 : -1);
  }, { passive: true });

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
  document.getElementById("weekEyebrow").textContent = `${getWeek().label} automatique`;

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.getElementById(`${state.view}View`).classList.add("active-view");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  renderCalendar();
  renderProgress();
}

function renderCalendar() {
  const days = scheduleForWeek();
  const calendar = document.getElementById("weekCalendar");

  const visibleSessionIds = new Set(days.flatMap((day) => day.sessions.map((session) => session.id)));
  if (!visibleSessionIds.has(state.selectedSessionId) && days[0]?.sessions[0]) {
    state.selectedSessionId = days[0].sessions[0].id;
    saveSettings();
  }

  document.getElementById("weekSummary").innerHTML = `
    <button class="week-arrow" type="button" data-week-shift="-1" aria-label="Semaine precedente">‹</button>
    <strong>${escapeHtml(getWeek().label)}</strong>
    <span>Aujourd'hui ${escapeHtml(todayLabel())} · planning du ${escapeHtml(getWeekRangeLabel())}</span>
    <button class="week-arrow" type="button" data-week-shift="1" aria-label="Semaine suivante">›</button>
  `;
  calendar.innerHTML = days.map((day) => renderDayCard(day)).join("");

  document.querySelectorAll("[data-week-shift]").forEach((button) => {
    button.addEventListener("click", () => shiftWeek(Number(button.dataset.weekShift)));
  });

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
          <small>${escapeHtml(day.dateLabel)} · ${escapeHtml(day.domain.title)}</small>
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
        <span>${escapeHtml(selected.day.longLabel)} ${escapeHtml(selected.day.dateLabel)} · ${selected.start}-${selected.end}</span>
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
  container.innerHTML = `
    ${renderCompletionStats()}
    ${domains().map((domain) => renderDomainProgress(domain)).join("")}
  `;
  attachStatusHandlers(container);
}

function completedTopics() {
  return allTopics()
    .map((topic) => {
      const progress = state.progress[topic.id];
      if (progress?.status !== "done") return null;
      return { ...topic, completedAt: progress.completedAt || progress.updatedAt || new Date().toISOString() };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

function completionDateKey(value) {
  return dateId(new Date(value));
}

function shortCompletionDate(value) {
  return dayFormatter.format(new Date(value));
}

function renderCompletionStats() {
  const completed = completedTopics();
  const recent = completed.slice(-5).reverse();
  const byDate = new Map();

  completed.forEach((topic) => {
    const key = completionDateKey(topic.completedAt);
    byDate.set(key, (byDate.get(key) || 0) + 1);
  });

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(startOfDay(new Date()), index - 13);
    const key = dateId(date);
    return { key, date, count: byDate.get(key) || 0 };
  });
  const max = Math.max(1, ...days.map((day) => day.count));

  return `
    <section class="stats-card">
      <div class="stats-head">
        <div>
          <span>Stats</span>
          <h2>${completed.length} chapitres finis</h2>
        </div>
        <strong>${recent[0] ? shortCompletionDate(recent[0].completedAt) : "Aucun"}</strong>
      </div>
      <div class="mini-chart" aria-label="Chapitres termines par date">
        ${days
          .map((day) => {
            const height = Math.max(8, Math.round((day.count / max) * 54));
            return `
              <div class="chart-day" title="${escapeHtml(day.key)} : ${day.count}">
                <span style="height:${height}px"></span>
                <small>${day.date.getDate()}</small>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="recent-list">
        ${
          recent.length
            ? recent
                .map(
                  (topic) => `
                    <div>
                      <strong>${escapeHtml(topic.title)}</strong>
                      <span>${escapeHtml(shortCompletionDate(topic.completedAt))} · ${escapeHtml(topic.domainShortTitle)}</span>
                    </div>
                  `
                )
                .join("")
            : "<p>Aucun chapitre marque fait pour l'instant.</p>"
        }
      </div>
    </section>
  `;
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
