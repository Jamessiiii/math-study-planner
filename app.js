const STORAGE_KEY = "math-study-planner-state-v3";
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;
const WEEK_ANCHOR = "2026-06-15";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const rangeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const yearFormatter = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });
const monthDayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "numeric" });

const state = {
  view: "calendar",
  selectedSessionId: loadSettings().selectedSessionId || null,
  selectedDomainId: loadSettings().selectedDomainId || "maths",
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
    JSON.stringify({
      selectedSessionId: state.selectedSessionId,
      selectedDomainId: state.selectedDomainId,
      weekOffset: state.weekOffset,
    })
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
  let touchStartedInCalendar = false;

  calendarView.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartedInCalendar = Boolean(event.target.closest("#weekCalendar"));
  }, { passive: true });

  calendarView.addEventListener("touchend", (event) => {
    if (touchStartX === null || touchStartY === null) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;

    if (touchStartedInCalendar) {
      touchStartedInCalendar = false;
      return;
    }

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
      state.selectedDomainId = button.dataset.domainId;
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
    <button class="course-block accent-${day.domain.accent} status-${status}${selected}" type="button" data-session-id="${session.id}" data-domain-id="${day.domain.id}">
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
  const selectedDomain = getDomain(state.selectedDomainId) || domains()[0];
  const current = currentBlockForDomain(selectedDomain.id);
  const topic = currentTopicForDomain(selectedDomain.id);
  const domainDay = days.find((day) => day.domainId === selectedDomain.id);
  const accent = selectedDomain.accent;

  if (!topic || current?.complete) {
    detail.innerHTML = `
      <section class="detail-card">
        ${renderDomainSelector("calendar")}
        <h2>${escapeHtml(selectedDomain.title)}</h2>
        <p>Ce domaine est termine dans les donnees actuelles.</p>
      </section>
    `;
    attachDomainSelectorHandlers(detail);
    return;
  }

  detail.innerHTML = `
    <section class="detail-card accent-${accent}">
      ${renderDomainSelector("calendar")}
      <div class="detail-head">
        <span>${escapeHtml(domainDay ? `${domainDay.longLabel} ${domainDay.dateLabel}` : "Domaine courant")}</span>
        <strong>${escapeHtml(selectedDomain.title)}</strong>
      </div>
      <h2>${escapeHtml(topic.title)}</h2>
      <p>${escapeHtml(current.program.title)} · ${escapeHtml(current.block.title)}</p>
      <div class="resource-line">${escapeHtml((topic.resources || [])[0] || "Ressource a definir")}</div>
      ${renderStatusActions(topic)}
    </section>
  `;
  attachStatusHandlers(detail);
  attachDomainSelectorHandlers(detail);
}

function renderProgress() {
  const container = document.getElementById("progressContent");
  const selectedDomain = getDomain(state.selectedDomainId) || domains()[0];
  container.innerHTML = `
    ${renderCompletionStats()}
    ${renderDomainSelector("progress")}
    ${selectedDomain ? renderDomainProgress(selectedDomain) : ""}
  `;
  attachStatusHandlers(container);
  attachDomainSelectorHandlers(container);
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

function selectDomain(domainId) {
  state.selectedDomainId = domainId;
  saveSettings();
  render();
}

function renderDomainSelector(context) {
  return `
    <div class="domain-selector" data-domain-selector="${context}">
      ${domains()
        .map((domain) => {
          const active = domain.id === state.selectedDomainId ? " active-domain" : "";
          return `<button class="domain-chip accent-${domain.accent}${active}" type="button" data-domain-id="${domain.id}">${escapeHtml(domain.title)}</button>`;
        })
        .join("")}
    </div>
  `;
}

function attachDomainSelectorHandlers(root = document) {
  root.querySelectorAll("[data-domain-id]").forEach((button) => {
    button.addEventListener("click", () => selectDomain(button.dataset.domainId));
  });
}

function renderCompletionStats() {
  const completed = completedTopics();
  const recent = completed.slice(-5).reverse();

  return `
    <section class="stats-card">
      <div class="stats-head">
        <div>
          <span>Stats</span>
          <h2>${completed.length} chapitres finis</h2>
        </div>
        <strong>${recent[0] ? shortCompletionDate(recent[0].completedAt) : "Aucun"}</strong>
      </div>
      ${renderCompletionChart(completed)}
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

function renderCompletionChart(completed) {
  const chartWidth = 360;
  const chartHeight = 230;
  const padding = { top: 18, right: 18, bottom: 42, left: 42 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const today = startOfDay(new Date());
  const firstCompleted = completed[0]?.completedAt ? startOfDay(new Date(completed[0].completedAt)) : addDays(today, -13);
  const start = addDays(firstCompleted < addDays(today, -13) ? firstCompleted : addDays(today, -13), 0);
  const end = today;
  const dayCount = Math.max(1, Math.round((end - start) / MS_PER_DAY));
  const dates = Array.from({ length: dayCount + 1 }, (_, index) => addDays(start, index));
  const domainRows = domains();
  const countsByDomain = new Map(domainRows.map((domain) => [domain.id, 0]));
  const completedByDay = new Map();

  completed.forEach((topic) => {
    const key = completionDateKey(topic.completedAt);
    const rows = completedByDay.get(key) || [];
    rows.push(topic);
    completedByDay.set(key, rows);
  });

  const series = domainRows.map((domain) => ({ domain, points: [] }));

  dates.forEach((date, index) => {
    const key = dateId(date);
    (completedByDay.get(key) || []).forEach((topic) => {
      countsByDomain.set(topic.domainId, (countsByDomain.get(topic.domainId) || 0) + 1);
    });
    const x = padding.left + (index / dayCount) * plotWidth;
    series.forEach((row) => {
      row.points.push({ date, x, value: countsByDomain.get(row.domain.id) || 0 });
    });
  });

  const maxY = Math.max(1, ...series.flatMap((row) => row.points.map((point) => point.value)));
  const yStep = Math.max(1, Math.ceil(maxY / 4));
  const yTicks = Array.from(new Set([0, ...Array.from({ length: Math.ceil(maxY / yStep) + 1 }, (_, index) => Math.min(maxY, index * yStep))]));
  const xTickIndexes = Array.from(new Set([0, Math.floor(dayCount / 2), dayCount]));

  const linePaths = series
    .map((row) => {
      const path = row.points
        .map((point, index) => {
          const y = padding.top + plotHeight - (point.value / maxY) * plotHeight;
          return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
      const points = row.points
        .filter((point, index, list) => point.value !== (list[index - 1]?.value ?? 0))
        .map((point) => {
          const y = padding.top + plotHeight - (point.value / maxY) * plotHeight;
          return `<circle class="chart-point accent-${row.domain.accent}" cx="${point.x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"></circle>`;
        })
        .join("");

      return `
        <path class="chart-line accent-${row.domain.accent}" d="${path}"></path>
        ${points}
      `;
    })
    .join("");

  return `
    <div class="completion-chart">
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Chapitres finis par date et par domaine">
        <line class="axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}"></line>
        <line class="axis-line" x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}"></line>
        ${yTicks
          .map((tick) => {
            const y = padding.top + plotHeight - (tick / maxY) * plotHeight;
            return `
              <line class="grid-line" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + plotWidth}" y2="${y.toFixed(1)}"></line>
              <text class="axis-label" x="${padding.left - 9}" y="${(y + 4).toFixed(1)}" text-anchor="end">${tick}</text>
            `;
          })
          .join("")}
        ${xTickIndexes
          .map((index) => {
            const x = padding.left + (index / dayCount) * plotWidth;
            const label = monthDayFormatter.format(dates[index]);
            return `<text class="axis-label" x="${x.toFixed(1)}" y="${chartHeight - 14}" text-anchor="middle">${escapeHtml(label)}</text>`;
          })
          .join("")}
        ${linePaths}
        <text class="axis-title" x="${padding.left + plotWidth / 2}" y="${chartHeight - 2}" text-anchor="middle">date</text>
        <text class="axis-title" transform="translate(12 ${padding.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">chapitres faits</text>
      </svg>
      <div class="chart-legend">
        ${domainRows
          .map((domain) => `<span class="accent-${domain.accent}"><i></i>${escapeHtml(domain.title)}</span>`)
          .join("")}
      </div>
    </div>
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
