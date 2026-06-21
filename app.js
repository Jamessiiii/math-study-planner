const STORAGE_KEY = "math-study-planner-state-v2";
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri"];

const state = {
  view: "today",
  week: loadSettings().week || "A",
  selectedDay: loadSettings().selectedDay || getDefaultDayId(),
  query: "",
  domainFilter: "all",
  statusFilter: "all",
  progress: loadProgress(),
};

const statusLabels = {
  todo: "A faire",
  active: "En cours",
  done: "Termine",
  review: "A revoir",
};

const viewTitles = {
  today: "Aujourd'hui",
  planning: "Planning",
  program: "Programme",
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
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY}:settings`) || "{}");
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: state.progress }));
}

function saveSettings() {
  localStorage.setItem(
    `${STORAGE_KEY}:settings`,
    JSON.stringify({ week: state.week, selectedDay: state.selectedDay })
  );
}

function getDefaultDayId() {
  const index = new Date().getDay() - 1;
  return DAY_ORDER[index] || "mon";
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

function getDay(dayId = state.selectedDay) {
  return getWeek().days.find((day) => day.id === dayId) || getWeek().days[0];
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
            phase: program.phase,
            blockTitle: block.title,
            path: [domain.title, program.title, block.title, topic.title],
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

function filteredTopics() {
  const query = state.query.trim().toLowerCase();
  return allTopics().filter((topic) => {
    const status = getStatus(topic.id);
    const haystack = [
      topic.title,
      topic.summary,
      topic.domainTitle,
      topic.levelTitle,
      topic.blockTitle,
      ...(topic.resources || []),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (state.domainFilter === "all" || topic.domainId === state.domainFilter) &&
      (state.statusFilter === "all" || status === state.statusFilter) &&
      (!query || haystack.includes(query))
    );
  });
}

function topicSort(a, b) {
  return (
    a.programOrder - b.programOrder ||
    a.blockOrder - b.blockOrder ||
    a.topicOrder - b.topicOrder ||
    (a.sequence || 0) - (b.sequence || 0)
  );
}

function nextTopicsForDomain(domainId, count = 2) {
  const topics = allTopics()
    .filter((topic) => topic.domainId === domainId && getStatus(topic.id) !== "done")
    .sort(topicSort);
  return topics.slice(0, count);
}

function scheduleForWeek() {
  const counters = {};
  return getWeek().days.map((day) => {
    const sessions = window.SESSION_SLOTS.map((slot) => {
      const domainTopics = nextTopicsForDomain(day.domainId, 8);
      const offset = counters[day.domainId] || 0;
      const topic = domainTopics[offset] || domainTopics[domainTopics.length - 1] || null;
      counters[day.domainId] = offset + 1;
      return { ...slot, topic };
    });
    return { ...day, domain: getDomain(day.domainId), sessions };
  });
}

function completionStats(topics) {
  const totalHours = topics.reduce((sum, topic) => sum + (topic.hours || 4), 0);
  const doneHours = topics
    .filter((topic) => getStatus(topic.id) === "done")
    .reduce((sum, topic) => sum + (topic.hours || 4), 0);
  const done = topics.filter((topic) => getStatus(topic.id) === "done").length;
  const active = topics.filter((topic) => getStatus(topic.id) === "active").length;
  const review = topics.filter((topic) => getStatus(topic.id) === "review").length;
  return {
    total: topics.length,
    done,
    active,
    review,
    todo: topics.length - done - active - review,
    pct: totalHours ? Math.round((doneHours / totalHours) * 100) : 0,
    remainingHours: Math.max(0, totalHours - doneHours),
  };
}

function initControls() {
  const domainFilter = document.getElementById("domainFilter");
  for (const domain of domains()) {
    const option = document.createElement("option");
    option.value = domain.id;
    option.textContent = domain.title;
    domainFilter.appendChild(option);
  }

  const daySelect = document.getElementById("daySelect");
  for (const day of getWeek().days) {
    const option = document.createElement("option");
    option.value = day.id;
    option.textContent = day.longLabel;
    daySelect.appendChild(option);
  }
  daySelect.value = state.selectedDay;

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.week = button.dataset.week;
      saveSettings();
      render();
    });
  });

  daySelect.addEventListener("change", (event) => {
    state.selectedDay = event.target.value;
    saveSettings();
    render();
  });

  document.getElementById("globalSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderProgram();
  });

  domainFilter.addEventListener("change", (event) => {
    state.domainFilter = event.target.value;
    renderProgram();
  });

  document.getElementById("statusFilter").addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderProgram();
  });

  document.getElementById("resetProgress").addEventListener("click", () => {
    if (confirm("Remettre toute la progression a zero ?")) {
      state.progress = {};
      saveProgress();
      render();
    }
  });

  document.getElementById("exportState").addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      week: state.week,
      selectedDay: state.selectedDay,
      progress: state.progress,
    };
    document.getElementById("exportText").value = JSON.stringify(payload, null, 2);
    document.getElementById("exportDialog").showModal();
  });
}

function render() {
  document.getElementById("viewTitle").textContent = viewTitles[state.view];
  document.getElementById("weekEyebrow").textContent = `${getWeek().label} · ${getWeek().summary}`;

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.getElementById(`${state.view}View`).classList.add("active-view");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.week === state.week);
  });

  const daySelect = document.getElementById("daySelect");
  daySelect.value = state.selectedDay;

  renderToday();
  renderPlanning();
  renderProgram();
  renderProgress();
}

function renderToday() {
  const day = getDay();
  const domain = getDomain(day.domainId);
  const topics = nextTopicsForDomain(day.domainId, 2);
  const container = document.getElementById("todayContent");
  container.innerHTML = `
    <section class="today-hero accent-${domain.accent}">
      <div>
        <span class="chip">${escapeHtml(getWeek().label)}</span>
        <h2>${escapeHtml(day.longLabel)} · ${escapeHtml(domain.title)}</h2>
        <p>${escapeHtml(domain.rule)}</p>
      </div>
      <div class="hero-progress">
        <strong>${completionStats(allTopics().filter((topic) => topic.domainId === domain.id)).pct}%</strong>
        <span>${escapeHtml(domain.title)}</span>
      </div>
    </section>
    <div class="session-stack">
      ${window.SESSION_SLOTS.map((slot, index) => renderSessionCard(slot, topics[index] || topics[0], domain)).join("")}
    </div>
    <section class="card">
      <div class="card-header">
        <h2>Domaines cette semaine</h2>
      </div>
      <div class="domain-strip">
        ${domains().map((item) => renderDomainSummary(item)).join("")}
      </div>
    </section>
  `;
  attachStatusHandlers(container);
}

function renderSessionCard(slot, topic, domain) {
  if (!topic) {
    return `
      <article class="session-card accent-${domain.accent}">
        <div class="session-time">${slot.start}-${slot.end}</div>
        <h3>Aucune notion restante</h3>
        <p>${escapeHtml(domain.title)} est termine dans les donnees actuelles.</p>
      </article>
    `;
  }
  return `
    <article class="session-card accent-${domain.accent}">
      <div class="session-time">${slot.start}-${slot.end}</div>
      <h3>${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml(compactPath(topic))}</p>
      <div class="resource-line">${escapeHtml((topic.resources || [])[0] || "Ressource a definir")}</div>
      ${renderStatusActions(topic)}
    </article>
  `;
}

function renderPlanning() {
  const grid = document.getElementById("weekGrid");
  const days = scheduleForWeek();
  grid.innerHTML = days
    .map((day) => {
      const active = day.id === state.selectedDay ? " selected" : "";
      return `
        <button class="week-day accent-${day.domain.accent}${active}" type="button" data-day="${day.id}">
          <span>${escapeHtml(day.label)}</span>
          <strong>${escapeHtml(day.domain.shortTitle)}</strong>
          ${day.sessions
            .map((session) => `<small>${session.start} · ${escapeHtml(session.topic?.title || "Termine")}</small>`)
            .join("")}
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll(".week-day").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = button.dataset.day;
      saveSettings();
      render();
    });
  });

  const day = days.find((item) => item.id === state.selectedDay) || days[0];
  const detail = document.getElementById("dayDetail");
  detail.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div>
          <span class="chip">${escapeHtml(getWeek().label)}</span>
          <h2>${escapeHtml(day.longLabel)} · ${escapeHtml(day.domain.title)}</h2>
        </div>
      </div>
      <div class="session-stack">
        ${day.sessions.map((session) => renderSessionCard(session, session.topic, day.domain)).join("")}
      </div>
    </section>
  `;
  attachStatusHandlers(detail);
}

function renderProgram() {
  const tree = document.getElementById("programTree");
  const topics = filteredTopics();
  tree.innerHTML = "";

  for (const domain of domains()) {
    if (state.domainFilter !== "all" && state.domainFilter !== domain.id) continue;
    const domainTopics = topics.filter((topic) => topic.domainId === domain.id);
    const stats = completionStats(allTopics().filter((topic) => topic.domainId === domain.id));
    const section = document.createElement("section");
    section.className = `tree-domain card accent-${domain.accent}`;
    section.innerHTML = `
      <details open>
        <summary>
          <span>
            <strong>${escapeHtml(domain.title)}</strong>
            <small>${escapeHtml(domain.rule)}</small>
          </span>
          <span class="progress-chip">${stats.pct}%</span>
        </summary>
        <div class="tree-levels"></div>
      </details>
    `;

    const levels = section.querySelector(".tree-levels");
    for (const programId of domain.programIds) {
      const program = getProgram(programId);
      if (!program) continue;
      const levelTopics = domainTopics.filter((topic) => topic.programId === program.id);
      if (!levelTopics.length && (state.query || state.statusFilter !== "all")) continue;
      const levelStats = completionStats(allTopics().filter((topic) => topic.programId === program.id));
      const levelNode = document.createElement("details");
      levelNode.className = "tree-level";
      levelNode.open = programId === "l1" || domain.programIds.length === 1;
      levelNode.innerHTML = `
        <summary>
          <span>${escapeHtml(program.title)}</span>
          <span class="progress-chip">${levelStats.pct}%</span>
        </summary>
        <div class="tree-blocks"></div>
      `;
      const blocks = levelNode.querySelector(".tree-blocks");
      program.blocks.forEach((block) => {
        const blockTopics = levelTopics.filter((topic) => topic.blockTitle === block.title);
        if (!blockTopics.length && (state.query || state.statusFilter !== "all")) return;
        const blockStats = completionStats(allTopics().filter((topic) => topic.programId === program.id && topic.blockTitle === block.title));
        const blockNode = document.createElement("details");
        blockNode.className = "tree-block";
        blockNode.innerHTML = `
          <summary>
            <span>${escapeHtml(block.title)}</span>
            <span class="progress-chip">${blockStats.pct}%</span>
          </summary>
          <div class="topic-list">
            ${blockTopics.map((topic) => renderTopicCard(topic)).join("")}
          </div>
        `;
        blocks.appendChild(blockNode);
      });
      levels.appendChild(levelNode);
    }
    tree.appendChild(section);
  }
  attachStatusHandlers(tree);
}

function renderTopicCard(topic) {
  return `
    <article class="topic-card">
      <div>
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.summary || "")}</p>
        <div class="topic-meta">
          <span class="chip">${escapeHtml(topic.levelTitle)}</span>
          <span class="chip">${topic.hours || 4} h</span>
          <span class="chip">${escapeHtml(statusLabels[getStatus(topic.id)])}</span>
        </div>
        <ol class="resources">
          ${(topic.resources || []).map((resource) => `<li>${escapeHtml(resource)}</li>`).join("")}
        </ol>
      </div>
      ${renderStatusActions(topic)}
    </article>
  `;
}

function renderProgress() {
  const container = document.getElementById("progressContent");
  container.innerHTML = `
    <section class="metrics-grid">
      ${renderMetric("Total", completionStats(allTopics()).pct + "%")}
      ${renderMetric("Termine", completionStats(allTopics()).done + "/" + completionStats(allTopics()).total)}
      ${renderMetric("En cours", String(completionStats(allTopics()).active))}
      ${renderMetric("Restant", Math.round(completionStats(allTopics()).remainingHours) + " h")}
    </section>
    <section class="card">
      <div class="card-header">
        <h2>Progression par domaine</h2>
      </div>
      <div class="progress-list">
        ${domains().map((domain) => renderDomainProgress(domain)).join("")}
      </div>
    </section>
  `;
}

function renderMetric(label, value) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function renderDomainSummary(domain) {
  const stats = completionStats(allTopics().filter((topic) => topic.domainId === domain.id));
  return `
    <article class="domain-card accent-${domain.accent}">
      <strong>${escapeHtml(domain.title)}</strong>
      <div class="progress-bar"><span style="width:${stats.pct}%"></span></div>
      <small>${stats.pct}% · ${stats.remainingHours} h restantes</small>
    </article>
  `;
}

function renderDomainProgress(domain) {
  const domainTopics = allTopics().filter((topic) => topic.domainId === domain.id);
  const stats = completionStats(domainTopics);
  const levels = domain.programIds
    .map((programId) => {
      const program = getProgram(programId);
      const levelTopics = allTopics().filter((topic) => topic.programId === programId);
      const levelStats = completionStats(levelTopics);
      return `
        <div class="nested-progress">
          <span>${escapeHtml(program?.title || programId)}</span>
          <div class="progress-bar"><span style="width:${levelStats.pct}%"></span></div>
          <strong>${levelStats.pct}%</strong>
        </div>
      `;
    })
    .join("");
  return `
    <article class="progress-domain accent-${domain.accent}">
      <div class="progress-head">
        <strong>${escapeHtml(domain.title)}</strong>
        <span>${stats.pct}%</span>
      </div>
      <div class="progress-bar"><span style="width:${stats.pct}%"></span></div>
      <div class="nested-list">${levels}</div>
    </article>
  `;
}

function renderStatusActions(topic) {
  return `
    <div class="status-actions" data-topic-id="${topic.id}">
      ${Object.entries(statusLabels)
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

function compactPath(topic) {
  return `${topic.levelTitle} > ${topic.blockTitle}`;
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
