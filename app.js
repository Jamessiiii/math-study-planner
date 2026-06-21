const STORAGE_KEY = "math-study-planner-state-v3";
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;
const WEEK_ANCHOR = "2026-06-15";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 19;
const TIMELINE_PX_PER_HOUR = 40;
const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const rangeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const yearFormatter = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });
const monthDayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

const state = {
  view: "calendar",
  selectedSessionId: loadSettings().selectedSessionId || null,
  selectedDomainId: loadSettings().selectedDomainId || "maths",
  selectedBlockByDomain: loadSettings().selectedBlockByDomain || {},
  selectedProgramByDomain: loadSettings().selectedProgramByDomain || {},
  selectedTopicByDomain: loadSettings().selectedTopicByDomain || {},
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
      selectedBlockByDomain: state.selectedBlockByDomain,
      selectedProgramByDomain: state.selectedProgramByDomain,
      selectedTopicByDomain: state.selectedTopicByDomain,
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

function isSameDay(a, b) {
  return dateId(a) === dateId(b);
}

function sessionTimingLabel(dayDate, session) {
  const now = new Date();
  const [startHour, startMinute] = session.start.split(":").map(Number);
  const [endHour, endMinute] = session.end.split(":").map(Number);
  const startsAt = new Date(dayDate);
  startsAt.setHours(startHour, startMinute, 0, 0);
  const endsAt = new Date(dayDate);
  endsAt.setHours(endHour, endMinute, 0, 0);

  if (endsAt < now) return "Passe";
  if (startsAt <= now && now <= endsAt) return "Maintenant";
  if (!isSameDay(dayDate, now)) return session.label;

  const minutes = Math.round((startsAt - now) / 60000);
  if (minutes < 60) return `Dans ${Math.max(1, minutes)} min`;
  return `A ${timeFormatter.format(startsAt)}`;
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timelineHours() {
  return Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, index) => TIMELINE_START_HOUR + index
  );
}

function timelineStyle(session) {
  const start = minutesFromTime(session.start);
  const end = minutesFromTime(session.end);
  const startMinute = TIMELINE_START_HOUR * 60;
  const endMinute = TIMELINE_END_HOUR * 60;
  const top = ((Math.max(start, startMinute) - startMinute) / 60) * TIMELINE_PX_PER_HOUR;
  const height = ((Math.min(end, endMinute) - Math.max(start, startMinute)) / 60) * TIMELINE_PX_PER_HOUR;
  return `--event-top:${Math.max(0, top)}px;--event-height:${Math.max(34, height)}px;`;
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
    if (previous.status === "done" && previous.completedAt) {
      next.completedAt = previous.completedAt;
    } else if (previous.lastCompletedAt) {
      const changeDate = confirm(
        "Ce chapitre avait deja une date de validation. Utiliser la date d'aujourd'hui pour le graphique ?\n\nOK : nouvelle date\nAnnuler : garder l'ancienne date"
      );
      next.completedAt = changeDate ? now : previous.lastCompletedAt;
      next.lastCompletedAt = next.completedAt;
    } else {
      next.completedAt = now;
      next.lastCompletedAt = now;
    }
  } else {
    if (previous.completedAt) {
      next.lastCompletedAt = previous.completedAt;
    }
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

function accessibleBlocksForDomain(domainId) {
  const domain = getDomain(domainId);
  if (!domain) return [];

  const blocks = [];
  const current = currentBlockForDomain(domainId);
  const currentKey = current && !current.complete ? blockKey(current) : null;
  let currentIndex = -1;

  for (const programId of domain.programIds) {
    const program = getProgram(programId);
    if (!program) continue;

    for (const block of program.blocks) {
      const topics = topicsForProgramBlock(program.id, block.title);
      if (!topics.length) continue;

      const stats = blockStats(topics);
      const entry = { domain, program, block, topics, stats, current: false, position: "after" };
      if (currentKey && blockKey(entry) === currentKey) {
        entry.current = true;
        currentIndex = blocks.length;
      }
      blocks.push(entry);
    }
  }

  blocks.forEach((entry, index) => {
    if (!currentKey) {
      entry.position = "before";
    } else if (index < currentIndex) {
      entry.position = "before";
    } else if (index === currentIndex) {
      entry.position = "current";
    } else {
      entry.position = "after";
    }
  });

  return blocks;
}

function blockKey(entry) {
  return `${entry.program.id}::${entry.block.title}`;
}

function selectedBlockForDomain(domainId, blocks = accessibleBlocksForDomain(domainId)) {
  const selectedKey = state.selectedBlockByDomain[domainId];
  const selected = blocks.find((entry) => blockKey(entry) === selectedKey);
  if (selected) return selected;

  const current = blocks.find((entry) => entry.current);
  return current || blocks[0] || null;
}

function selectBlock(domainId, key) {
  state.selectedBlockByDomain = {
    ...state.selectedBlockByDomain,
    [domainId]: key,
  };
  const nextSelectedTopics = { ...state.selectedTopicByDomain };
  delete nextSelectedTopics[domainId];
  state.selectedTopicByDomain = nextSelectedTopics;
  saveSettings();
  render();
}

function programOptionsForDomain(domainId) {
  const domain = getDomain(domainId);
  if (!domain || domain.id !== "maths") return [];
  return domain.programIds.map(getProgram).filter(Boolean);
}

function selectedProgramForDomain(domainId) {
  const options = programOptionsForDomain(domainId);
  if (!options.length) return null;

  const selectedId = state.selectedProgramByDomain[domainId];
  const selected = options.find((program) => program.id === selectedId);
  if (selected) return selected;

  const current = currentBlockForDomain(domainId);
  if (current && !current.complete) {
    const currentProgram = options.find((program) => program.id === current.program.id);
    if (currentProgram) return currentProgram;
  }

  return options[0];
}

function visibleBlocksForDomain(domainId, blocks = accessibleBlocksForDomain(domainId)) {
  const selectedProgram = selectedProgramForDomain(domainId);
  if (!selectedProgram) return blocks;
  return blocks.filter((entry) => entry.program.id === selectedProgram.id);
}

function selectProgram(domainId, programId) {
  state.selectedProgramByDomain = {
    ...state.selectedProgramByDomain,
    [domainId]: programId,
  };

  const nextSelectedBlocks = { ...state.selectedBlockByDomain };
  delete nextSelectedBlocks[domainId];
  state.selectedBlockByDomain = nextSelectedBlocks;

  saveSettings();
  render();
}

function selectedTopicForEntry(domainId, entry) {
  if (!entry?.topics?.length) return null;
  const selectedId = state.selectedTopicByDomain[domainId];
  const selected = entry.topics.find((topic) => topic.id === selectedId);
  if (selected) return selected;
  return entry.topics.find((topic) => getStatus(topic.id) !== "done") || entry.topics[0];
}

function selectTopic(domainId, topicId) {
  state.selectedTopicByDomain = {
    ...state.selectedTopicByDomain,
    [domainId]: topicId,
  };
  saveSettings();
  render();
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
      window.scrollTo({ top: 0, behavior: "auto" });
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
    <span>
      <b>Aujourd'hui ${escapeHtml(todayLabel())}</b>
      <small>${escapeHtml(getWeekRangeLabel())}</small>
    </span>
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
  const todayClass = isSameDay(day.date, new Date()) ? " today-day" : "";
  return `
    <section class="day-card accent-${day.domain.accent}${todayClass}">
      <div class="day-card-header">
        <span>${escapeHtml(day.label)}</span>
        <div>
          <strong>${escapeHtml(day.longLabel)}</strong>
          <small>${escapeHtml(day.dateLabel)} · ${escapeHtml(day.domain.title)}</small>
        </div>
      </div>
      <div class="day-timeline" style="--timeline-hours:${TIMELINE_END_HOUR - TIMELINE_START_HOUR};--hour-size:${TIMELINE_PX_PER_HOUR}px;">
        <div class="time-rail" aria-hidden="true">
          ${timelineHours().map((hour) => `<span>${String(hour).padStart(2, "0")}h</span>`).join("")}
        </div>
        <div class="timeline-area">
          ${timelineHours().map((hour) => `<i style="--hour-index:${hour - TIMELINE_START_HOUR}"></i>`).join("")}
          ${day.sessions.map((session) => renderCourseBlock(day, session)).join("")}
        </div>
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
    <button class="course-block timeline-block accent-${day.domain.accent} status-${status}${selected}" type="button" data-session-id="${session.id}" data-domain-id="${day.domain.id}" style="${timelineStyle(session)}">
      <time>${escapeHtml(session.start)}-${escapeHtml(session.end)}</time>
      <span>${escapeHtml(day.domain.shortTitle)} · ${escapeHtml(sessionTimingLabel(day.date, session))}</span>
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
  const accent = selectedDomain.accent;

  if (!topic || current?.complete) {
    detail.innerHTML = `
      <section class="detail-card calendar-title-card">
        <div class="calendar-selector-head">
          <span>Domaine</span>
          ${renderDomainSelector("calendar")}
        </div>
        <div class="calendar-topic-strip">
          <span>Chapitre actuel</span>
          <strong>Termine</strong>
        </div>
      </section>
    `;
    attachDomainSelectorHandlers(detail);
    return;
  }

  detail.innerHTML = `
    <section class="detail-card calendar-title-card accent-${accent}">
      <div class="calendar-selector-head">
        <span>Domaine</span>
        ${renderDomainSelector("calendar")}
      </div>
      <div class="calendar-topic-strip">
        <span>Chapitre actuel</span>
        <strong>${escapeHtml(topic.title)}</strong>
      </div>
      <div class="calendar-status-strip">
        <span>Etat</span>
        ${renderStatusActions(topic)}
      </div>
    </section>
  `;
  attachStatusHandlers(detail);
  attachDomainSelectorHandlers(detail);
}

function renderBlockMeter(stats) {
  const total = Math.max(1, stats.total || 1);
  return `
    <div class="block-meter" aria-label="${stats.done} chapitre(s) fait(s) sur ${stats.total}">
      <span>${escapeHtml(String(stats.done))}/${escapeHtml(String(stats.total))}</span>
      <div>
        ${Array.from({ length: total }, (_, index) => `<i class="${index < stats.done ? "filled" : ""}"></i>`).join("")}
      </div>
    </div>
  `;
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
  attachProgramSelectorHandlers(container);
  attachBlockSelectorHandlers(container);
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
          return `<button class="domain-chip accent-${domain.accent}${active}" type="button" data-domain-id="${domain.id}">${escapeHtml(domain.shortTitle || domain.title)}</button>`;
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

function renderProgramSelector(domain) {
  const programs = programOptionsForDomain(domain.id);
  if (!programs.length) return "";

  const selectedProgram = selectedProgramForDomain(domain.id);
  return `
    <div class="program-selector" data-program-selector="${domain.id}">
      ${programs
        .map((program) => {
          const active = selectedProgram?.id === program.id ? " active-program" : "";
          const shortTitle = program.title.replace(/\s*Mathematiques$/i, "");
          return `
            <button class="program-chip${active}" type="button" data-program-domain="${domain.id}" data-program-id="${program.id}">
              <span>${escapeHtml(shortTitle)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function attachProgramSelectorHandlers(root = document) {
  root.querySelectorAll("[data-program-id]").forEach((button) => {
    button.addEventListener("click", () => selectProgram(button.dataset.programDomain, button.dataset.programId));
  });
}

function renderBlockSelector(domain, blocks, selectedEntry) {
  if (!blocks.length) return "";
  return `
    <div class="block-selector" data-block-selector="${domain.id}">
      ${blocks
        .map((entry) => {
          const key = blockKey(entry);
          const active = selectedEntry && blockKey(selectedEntry) === key ? " active-block" : "";
          const label = entry.block.title.replace(/^Bloc\s*/i, "B");
          const marker = entry.position === "current" ? "Courant" : entry.position === "before" ? "Avant" : "Apres";
          return `
            <button class="block-chip block-chip-${entry.position}${active}" type="button" data-block-domain="${domain.id}" data-block-key="${escapeHtml(key)}">
              <span>${escapeHtml(marker)}</span>
              <strong>${escapeHtml(label)}</strong>
              <em>${entry.stats.done}/${entry.stats.total}</em>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function attachBlockSelectorHandlers(root = document) {
  root.querySelectorAll("[data-block-key]").forEach((button) => {
    button.addEventListener("click", () => selectBlock(button.dataset.blockDomain, button.dataset.blockKey));
  });
}

function renderCompletionStats() {
  const completed = completedTopics();
  const recent = completed.slice(-5).reverse();
  const completedLabel = `${completed.length} chapitre${completed.length > 1 ? "s" : ""} fini${completed.length > 1 ? "s" : ""}`;

  return `
    <section class="stats-card">
      <div class="stats-head">
        <div>
          <span>Stats</span>
          <h2>${completedLabel}</h2>
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
  const chartWidth = 340;
  const chartHeight = 230;
  const padding = { top: 18, right: 16, bottom: 32, left: 38 };
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

  const series = domainRows.map((domain) => ({ domain, points: [], events: [] }));

  dates.forEach((date, index) => {
    const key = dateId(date);
    (completedByDay.get(key) || []).forEach((topic) => {
      countsByDomain.set(topic.domainId, (countsByDomain.get(topic.domainId) || 0) + 1);
    });
    const x = padding.left + (index / dayCount) * plotWidth;
    series.forEach((row) => {
      row.points.push({ date, x, value: countsByDomain.get(row.domain.id) || 0 });
    });
    (completedByDay.get(key) || []).forEach((topic) => {
      const row = series.find((entry) => entry.domain.id === topic.domainId);
      if (row) row.events.push({ topic, date, x });
    });
  });

  const maxY = Math.max(1, ...series.flatMap((row) => row.points.map((point) => point.value)));
  const yStep = Math.max(1, Math.ceil(maxY / 4));
  const yTicks = Array.from(new Set([0, ...Array.from({ length: Math.ceil(maxY / yStep) + 1 }, (_, index) => Math.min(maxY, index * yStep))]));
  const xTickIndexes = Array.from(new Set([0, Math.floor(dayCount / 2), dayCount]));

  const linePaths = series
    .map((row) => {
      const path = stepPath(row.points, maxY, padding, plotHeight);
      const areaPath = `${path} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
      const points = row.points
        .filter((point, index, list) => point.value !== (list[index - 1]?.value ?? 0))
        .map((point) => {
          const y = padding.top + plotHeight - (point.value / maxY) * plotHeight;
          const topicsForPoint = row.events
            .filter((event) => isSameDay(event.date, point.date))
            .map((event) => event.topic.title)
            .join(", ");
          return `
            <circle class="chart-point accent-${row.domain.accent}" cx="${point.x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.6">
              <title>${escapeHtml(`${row.domain.title} - ${shortCompletionDate(point.date)} : ${topicsForPoint || point.value}`)}</title>
            </circle>
          `;
        })
        .join("");

      return `
        <path class="chart-area accent-${row.domain.accent}" d="${areaPath}"></path>
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

function stepPath(points, maxY, padding, plotHeight) {
  return points
    .map((point, index, list) => {
      const y = padding.top + plotHeight - (point.value / maxY) * plotHeight;
      if (index === 0) return `M ${point.x.toFixed(1)} ${y.toFixed(1)}`;
      const previous = list[index - 1];
      const previousY = padding.top + plotHeight - (previous.value / maxY) * plotHeight;
      return `L ${point.x.toFixed(1)} ${previousY.toFixed(1)} L ${point.x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderDomainProgress(domain) {
  const current = currentBlockForDomain(domain.id);
  const accessibleBlocks = accessibleBlocksForDomain(domain.id);
  const visibleBlocks = visibleBlocksForDomain(domain.id, accessibleBlocks);
  const selectedEntry = selectedBlockForDomain(domain.id, visibleBlocks);

  if ((!current || current.complete) && !visibleBlocks.length) {
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

  if (current?.complete) {
    return `
      <section class="progress-card accent-${domain.accent}">
        <div class="progress-head">
          <h2>${escapeHtml(domain.title)}</h2>
          <span>100%</span>
        </div>
        <p>Tout le programme visible est termine. Tu peux quand meme revenir sur un bloc.</p>
        ${renderProgramSelector(domain)}
        ${renderBlockSelector(domain, visibleBlocks, selectedEntry)}
        ${selectedEntry ? renderBlockProgress(selectedEntry) : ""}
      </section>
    `;
  }

  return `
    <section class="progress-card accent-${domain.accent}">
      <div class="progress-head">
        <h2>${escapeHtml(domain.title)}</h2>
        <span>${current.stats.pct}%</span>
      </div>
      ${renderProgramSelector(domain)}
      <div class="current-block">
        <span>Bloc courant</span>
        <strong>${escapeHtml(current.program.title)}</strong>
        <h3>${escapeHtml(current.block.title)}</h3>
        <small>${current.stats.done}/${current.stats.total} chapitres faits</small>
      </div>
      <div class="progress-bar"><span style="width:${current.stats.pct}%"></span></div>
      ${renderBlockSelector(domain, visibleBlocks, selectedEntry)}
      ${selectedEntry ? renderBlockProgress(selectedEntry) : ""}
    </section>
  `;
}

function renderBlockProgress(entry) {
  const marker = entry.position === "current" ? "Bloc courant" : entry.position === "before" ? "Bloc precedent" : "Bloc suivant";
  return `
    <section class="block-group${entry.current ? " current-group" : ""}">
      <div class="block-group-head">
        <div>
          <span>${escapeHtml(marker)}</span>
          <strong>${escapeHtml(entry.program.title)}</strong>
          <h3>${escapeHtml(entry.block.title)}</h3>
        </div>
        <em>${entry.stats.done}/${entry.stats.total}</em>
      </div>
      ${entry.topics.map((topic) => renderChapterProgress(topic)).join("")}
    </section>
  `;
}

function renderChapterProgress(topic) {
  const status = getStatus(topic.id);
  return `
    <article class="chapter-row status-${status}">
      <div class="chapter-row-head">
        <strong>${escapeHtml(topic.title)}</strong>
        <span class="status-pill status-pill-${status}">${escapeHtml(statusLabels[status])}</span>
      </div>
      ${renderStatusActions(topic)}
    </article>
  `;
}

function renderStatusActions(topic) {
  return `
    <div class="status-actions" data-topic-id="${topic.id}">
      ${Object.entries(statusLabels)
        .map(([key, label]) => {
          const active = getStatus(topic.id) === key ? " active-status" : "";
          return `<button class="status-button status-button-${key}${active}" type="button" data-status="${key}">${label}</button>`;
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
