const STORAGE_KEY = "math-study-planner-state-v3";
const SETTINGS_KEY = `${STORAGE_KEY}:settings`;
const BACKUP_KEY = `${STORAGE_KEY}:backups`;
const WEEK_ANCHOR = "2026-06-15";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 24;
const TIMELINE_PX_PER_HOUR = 40;
const MAX_COURSE_SLOTS_PER_DAY = 4;
const DEFAULT_WEEKLY_GOALS = { chapters: 4, minutes: 600 };
const AUTO_BACKUP_LIMIT = 10;
const DAY_DEFS = [
  { id: "mon", label: "Lun", longLabel: "Lundi" },
  { id: "tue", label: "Mar", longLabel: "Mardi" },
  { id: "wed", label: "Mer", longLabel: "Mercredi" },
  { id: "thu", label: "Jeu", longLabel: "Jeudi" },
  { id: "fri", label: "Ven", longLabel: "Vendredi" },
  { id: "sat", label: "Sam", longLabel: "Samedi" },
  { id: "sun", label: "Dim", longLabel: "Dimanche" },
];
const SLOT_PRESETS = [
  { id: "morning", label: "Matin", start: "09:00", end: "12:30" },
  { id: "afternoon", label: "Apres-midi", start: "13:30", end: "18:00" },
  { id: "evening", label: "Soir", start: "18:00", end: "20:00" },
  { id: "short", label: "Court", start: "10:00", end: "12:00" },
];
const SPORT_PRESETS = [
  { id: "sport-evening", label: "Sport", start: "18:00", end: "19:30" },
  { id: "sport-morning", label: "Sport matin", start: "07:00", end: "08:00" },
  { id: "sport-lunch", label: "Sport midi", start: "12:30", end: "13:30" },
];
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
  selectedProgrammingWeek: loadSettings().selectedProgrammingWeek || getCurrentWeekKey(getPlanningWeekStart()),
  selectedProgrammingOccurrence: loadSettings().selectedProgrammingOccurrence || "current",
  selectedScheduleDay: loadSettings().selectedScheduleDay || "mon",
  programmingSubjectsOpen: loadSettings().programmingSubjectsOpen === true,
  planning: normalizePlanning(loadSettings().planning),
  customTemplates: normalizeCustomTemplates(loadSettings().customTemplates),
  weeklyGoals: normalizeWeeklyGoals(loadSettings().weeklyGoals),
  weekOffset: 0,
  progress: loadProgress(),
  activity: loadActivity(),
  history: loadHistory(),
  scheduleNotice: null,
  selectedHeatmapDate: null,
  calendarInitialFocusDone: false,
  calendarShouldScrollToToday: false,
};

const statusLabels = {
  todo: "A faire",
  active: "En cours",
  done: "Fait",
  review: "A revoir",
};

const MASTERY_LABELS = [
  "Non evalue",
  "Lu",
  "Compris",
  "Exercices",
  "Maitrise",
];
const REVIEW_INTERVAL_DAYS = [2, 2, 4, 7, 14];

const viewTitles = {
  calendar: "Calendrier",
  progress: "Progres",
  programming: "Programmation",
  templates: "Modeles",
};

function loadStoredState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function loadProgress() {
  try {
    const raw = loadStoredState();
    if (raw.progress && typeof raw.progress === "object" && !Array.isArray(raw.progress)) {
      return raw.progress;
    }
    if (Object.prototype.hasOwnProperty.call(raw, "progress")) return {};
    return raw;
  } catch {
    return {};
  }
}

function loadActivity() {
  try {
    const raw = loadStoredState();
    const arr = raw.activity;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function normalizeHistoryEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const createdAt = event.createdAt || "";
  if (!createdAt || Number.isNaN(new Date(createdAt).getTime())) return null;
  const meta = event.meta && typeof event.meta === "object" && !Array.isArray(event.meta)
    ? sanitizeHistoryMeta(event.meta)
    : undefined;
  const normalized = {
    id: event.id ? String(event.id) : `hist-${createdAt}`,
    type: event.type ? String(event.type) : "event",
    createdAt,
    topicId: event.topicId ? String(event.topicId) : "",
    domainId: event.domainId ? String(event.domainId) : "",
    title: event.title ? String(event.title) : "",
  };
  if (meta && Object.keys(meta).length) normalized.meta = meta;
  return normalized;
}

function loadHistory() {
  try {
    const raw = loadStoredState();
    const arr = raw.history;
    if (!Array.isArray(arr)) return [];
    return arr
      .map(normalizeHistoryEvent)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 80);
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return { weeklyGoals: defaultWeeklyGoals() };
    }
    return { ...settings, weeklyGoals: normalizeWeeklyGoals(settings.weeklyGoals) };
  } catch {
    return { weeklyGoals: defaultWeeklyGoals() };
  }
}

function defaultWeeklyGoals() {
  return { ...DEFAULT_WEEKLY_GOALS };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeWeeklyGoalValue(value, fallback, min, max) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return clampNumber(Math.round(raw), min, max);
}

function normalizeWeeklyGoals(raw) {
  return {
    chapters: normalizeWeeklyGoalValue(raw?.chapters, DEFAULT_WEEKLY_GOALS.chapters, 1, 20),
    minutes: normalizeWeeklyGoalValue(raw?.minutes, DEFAULT_WEEKLY_GOALS.minutes, 60, 3600),
  };
}

function saveProgress() {
  const previous = loadStoredState();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...previous,
      progress: state.progress,
      activity: state.activity,
      history: state.history,
    })
  );
  createAutoBackup("Progression");
}

function saveSettings() {
  const previous = loadSettings();
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...previous,
      selectedSessionId: state.selectedSessionId,
      selectedDomainId: state.selectedDomainId,
      selectedBlockByDomain: state.selectedBlockByDomain,
      selectedProgramByDomain: state.selectedProgramByDomain,
      selectedTopicByDomain: state.selectedTopicByDomain,
      selectedProgrammingWeek: state.selectedProgrammingWeek,
      selectedProgrammingOccurrence: state.selectedProgrammingOccurrence,
      selectedScheduleDay: state.selectedScheduleDay,
      programmingSubjectsOpen: state.programmingSubjectsOpen === true,
      planning: state.planning,
      customTemplates: state.customTemplates,
      weeklyGoals: normalizeWeeklyGoals(state.weeklyGoals),
    })
  );
  createAutoBackup("Planning");
}

function backupSettingsSnapshot(source = state) {
  return {
    selectedDomainId: source.selectedDomainId,
    selectedBlockByDomain: source.selectedBlockByDomain || {},
    selectedProgramByDomain: source.selectedProgramByDomain || {},
    selectedTopicByDomain: source.selectedTopicByDomain || {},
    selectedProgrammingWeek: source.selectedProgrammingWeek,
    selectedProgrammingOccurrence: source.selectedProgrammingOccurrence,
    selectedScheduleDay: source.selectedScheduleDay,
    programmingSubjectsOpen: source.programmingSubjectsOpen === true,
    planning: source.planning,
    customTemplates: normalizeCustomTemplates(source.customTemplates),
    weeklyGoals: normalizeWeeklyGoals(source.weeklyGoals),
  };
}

function backupStateSnapshot(source = state) {
  return {
    progress: source.progress || {},
    activity: Array.isArray(source.activity) ? source.activity : [],
    history: Array.isArray(source.history) ? source.history : [],
  };
}

function backupMeta(payload) {
  const progressValues = Object.values(payload.state?.progress || {});
  const planning = payload.settings?.planning || {};
  return {
    progressCount: progressValues.length,
    doneCount: progressValues.filter((entry) => entry?.status === "done").length,
    activityCount: Array.isArray(payload.state?.activity) ? payload.state.activity.length : 0,
    historyCount: Array.isArray(payload.state?.history) ? payload.state.history.length : 0,
    overrideCount: planning.overrides ? Object.keys(planning.overrides).length : 0,
  };
}

function createBackupPayload(reason = "Sauvegarde") {
  const payload = {
    schema: "math-study-planner-backup-v1",
    createdAt: new Date().toISOString(),
    reason,
    state: backupStateSnapshot(),
    settings: backupSettingsSnapshot(),
  };
  payload.meta = backupMeta(payload);
  return payload;
}

function backupSignature(payload) {
  return JSON.stringify({
    state: payload.state,
    settings: payload.settings,
  });
}

function loadAutoBackups() {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    if (!Array.isArray(backups)) return [];
    return backups
      .filter((entry) => entry?.payload?.schema === "math-study-planner-backup-v1")
      .slice(0, AUTO_BACKUP_LIMIT);
  } catch {
    return [];
  }
}

function saveAutoBackups(backups) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, AUTO_BACKUP_LIMIT)));
}

function createAutoBackup(reason = "Modification") {
  try {
    const payload = createBackupPayload(reason);
    const signature = backupSignature(payload);
    const existing = loadAutoBackups();
    if (existing[0]?.signature === signature) return;
    const next = [
      {
        id: `backup-${Date.now()}`,
        createdAt: payload.createdAt,
        reason,
        signature,
        meta: payload.meta,
        payload,
      },
      ...existing.filter((entry) => entry.signature !== signature),
    ];
    saveAutoBackups(next);
  } catch {
    // A failed auto-backup must never block studying actions.
  }
}

function backupTitle(entry) {
  const date = entry?.createdAt ? new Date(entry.createdAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? `${rangeFormatter.format(date)} ${timeFormatter.format(date)}`
    : "Date inconnue";
  return `${dateLabel} · ${entry?.reason || "Sauvegarde"}`;
}

function backupSummary(meta = {}) {
  return `${meta.doneCount || 0} chap. finis · ${meta.activityCount || 0} séances · ${meta.overrideCount || 0} semaines`;
}

function restoreBackupPayload(payload) {
  if (!payload || payload.schema !== "math-study-planner-backup-v1") {
    throw new Error("Format de sauvegarde invalide.");
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.state || {}));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload.settings || {}));
}

function exportCurrentBackup() {
  const payload = createBackupPayload("Export manuel");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `math-study-planner-sauvegarde-${dateId(new Date())}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function confirmAndRestorePayload(payload, label = "cette sauvegarde") {
  const meta = backupMeta(payload);
  const ok = confirm(`Restaurer ${label} ?\n\n${backupSummary(meta)}\n\nLes données actuelles seront remplacées.`);
  if (!ok) return;
  restoreBackupPayload(payload);
  alert("Sauvegarde restaurée. L'application va se recharger.");
  window.location.reload();
}

function parseBackupPayload(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }
  if (!payload || payload.schema !== "math-study-planner-backup-v1") {
    throw new Error("Ce fichier n'est pas une sauvegarde Math Planner valide.");
  }
  return payload;
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
  const weekStart = getViewedWeekStart();
  return planningWeekForStart(weekStart);
}

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isAutomaticCourseSlotLabel(label) {
  return ["matin", "apres-midi", "apres midi", "soir"].includes(normalizeTextKey(label));
}

function normalizedCourseSlotLabel(slot, index) {
  if (slot?.label && !isAutomaticCourseSlotLabel(slot.label)) return slot.label;
  return slot?.start && slot?.end ? courseSlotDefaultLabel(slot) : `Creneau ${index + 1}`;
}

function compareSlotsByStart(a, b) {
  return slotTimeRange(a).start - slotTimeRange(b).start;
}

function normalizeSlots(slots, fallbackSlots = []) {
  const source = Array.isArray(slots) ? slots : fallbackSlots;
  return source
    .filter((slot) => slot?.start && slot?.end && slot.type !== "sport")
    .sort(compareSlotsByStart)
    .slice(0, MAX_COURSE_SLOTS_PER_DAY)
    .map((slot, index) => ({
      id: slot.id || `slot-${index + 1}`,
      label: normalizedCourseSlotLabel(slot, index),
      start: slot.start,
      end: slot.end,
    }));
}

function normalizeSportSlots(slots) {
  const seen = new Set();
  return (Array.isArray(slots) ? slots : [])
    .filter((slot) => slot?.start && slot?.end)
    .sort(compareSlotsByStart)
    .slice(0, 8)
    .map((slot, index) => ({
      id: slot.id || `sport-${index + 1}`,
      label: slot.label || "Sport",
      start: slot.start,
      end: slot.end,
    }))
    .filter((slot) => {
      const key = `${slot.id}-${slot.start}-${slot.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function slotsForDay(day, domainId = day?.domainId) {
  return normalizeSlots(day?.slotsByDomain?.[domainId], day?.slots || state.planning.slots || []);
}

function sportSlotsForDay(day) {
  return normalizeSportSlots(day?.sportSlots || []);
}

function visibleWeekSlots() {
  return getWeek().days
    .flatMap((day) => day.enabled === false ? [] : [...slotsForDay(day), ...sportSlotsForDay(day)]);
}

function defaultPlanning() {
  const defaultWeeks = window.WEEK_TEMPLATES || {};
  const fallbackDomain = domains()[0]?.id || "maths";
  const domainIds = domains().map((domain) => domain.id);
  const defaultSlots = normalizeSlots(window.SESSION_SLOTS || []);
  const weeks = {};

  ["A", "B"].forEach((weekKey) => {
    const source = defaultWeeks[weekKey] || { label: `Semaine ${weekKey}`, days: [] };
    const sourceDays = new Map((source.days || []).map((day) => [day.id, day]));
    weeks[weekKey] = {
      label: source.label || `Semaine ${weekKey}`,
      summary: source.summary || "",
      days: DAY_DEFS.map((dayDef) => {
        const sourceDay = sourceDays.get(dayDef.id);
        return {
          ...dayDef,
          domainId: sourceDay?.domainId || fallbackDomain,
          enabled: Boolean(sourceDay),
          slots: defaultSlots.map((slot) => ({ ...slot })),
          slotsByDomain: Object.fromEntries(domainIds.map((domainId) => [domainId, defaultSlots.map((slot) => ({ ...slot }))])),
          sportSlots: [],
        };
      }),
    };
  });

  return {
    weeks,
    slots: defaultSlots.map((slot) => ({ ...slot })),
    overrides: {},
  };
}

function clonePlanningWeek(week) {
  const slotsByDomain = (day) => Object.fromEntries(
    Object.entries(day.slotsByDomain || {}).map(([domainId, slots]) => [
      domainId,
      normalizeSlots(slots, []),
    ])
  );
  return {
    label: week.label,
    summary: week.summary || "",
    days: (week.days || []).map((day) => ({
      ...day,
      slots: normalizeSlots(day.slots, []),
      slotsByDomain: slotsByDomain(day),
      sportSlots: normalizeSportSlots(day.sportSlots),
    })),
  };
}

function normalizeTemplateWeek(rawWeek) {
  const base = defaultPlanning().weeks.A;
  const validDomainIds = new Set(domains().map((domain) => domain.id));
  const domainIds = domains().map((domain) => domain.id);
  const fallbackDomain = domains()[0]?.id || "maths";
  return normalizePlanningWeek("A", rawWeek, base, [], validDomainIds, domainIds, fallbackDomain);
}

function normalizeCustomTemplates(rawTemplates) {
  if (!Array.isArray(rawTemplates)) return [];
  return rawTemplates
    .map((template) => {
      if (!template || typeof template !== "object") return null;
      const name = String(template.name || "").trim();
      if (!name) return null;
      const createdAt = template.createdAt && !Number.isNaN(new Date(template.createdAt).getTime())
        ? template.createdAt
        : new Date().toISOString();
      const updatedAt = template.updatedAt && !Number.isNaN(new Date(template.updatedAt).getTime())
        ? template.updatedAt
        : createdAt;
      return {
        id: template.id ? String(template.id) : `template-${createdAt}`,
        name,
        createdAt,
        updatedAt,
        week: normalizeTemplateWeek(template.week),
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

function templateStats(template) {
  const week = template?.week || { days: [] };
  return (week.days || []).reduce((stats, day) => {
    if (day.enabled === false) return stats;
    const domain = getDomain(day.domainId) || domains()[0];
    return {
      activeDays: stats.activeDays + 1,
      courseSlots: stats.courseSlots + slotsForDay(day, domain.id).length,
      sportSlots: stats.sportSlots + sportSlotsForDay(day).length,
    };
  }, { activeDays: 0, courseSlots: 0, sportSlots: 0 });
}

function templateSummary(template) {
  const stats = templateStats(template);
  return `${stats.activeDays}/7 jours · ${stats.courseSlots} cours · ${stats.sportSlots} sport`;
}

function createCustomTemplateFromWeek(name, week) {
  const now = new Date().toISOString();
  return {
    id: `template-${Date.now()}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    week: clonePlanningWeek(week),
  };
}

function saveTemplateFromSelectedWeek() {
  const weekKey = state.selectedProgrammingWeek || "A";
  const week = displayPlanningWeek(weekKey);
  const defaultName = `${week.label || `Semaine ${weekKey}`} - ${weekRangeShortLabel(programmingWeekStart(weekKey))}`;
  const name = prompt("Nom du modèle", defaultName);
  if (!name || !name.trim()) return;
  state.customTemplates = normalizeCustomTemplates([
    createCustomTemplateFromWeek(name, week),
    ...state.customTemplates,
  ]);
  saveSettings();
  state.view = "templates";
  render();
}

function targetWeekHasLockedDays(weekKey, week) {
  return isCurrentProgrammingWeek(weekKey) && (week.days || []).some((day) => isProgrammingDayAssignmentLocked(weekKey, day));
}

function applyTemplateToSelectedWeek(templateId) {
  const template = state.customTemplates.find((entry) => entry.id === templateId);
  if (!template) return;
  const weekKey = state.selectedProgrammingWeek || "A";
  const displayWeek = displayPlanningWeek(weekKey);
  if (targetWeekHasLockedDays(weekKey, displayWeek)) {
    alert("Impossible d'appliquer un modèle sur une semaine actuelle qui contient déjà un jour ou un créneau commencé.");
    return;
  }
  const occurrence = selectedProgrammingOccurrence(weekKey);
  const label = `Semaine ${weekKey} · ${weekRangeShortLabel(occurrence.start)}`;
  if (!confirm(`Appliquer "${template.name}" à ${label} ?\n\nLes horaires actuels de cette semaine seront remplacés.`)) return;
  const week = editablePlanningWeek(weekKey);
  const nextWeek = clonePlanningWeek(template.week);
  week.days = nextWeek.days;
  week.summary = template.name;
  state.selectedSessionId = null;
  state.scheduleNotice = null;
  saveSettings();
  render();
}

function deleteCustomTemplate(templateId) {
  const template = state.customTemplates.find((entry) => entry.id === templateId);
  if (!template) return;
  if (!confirm(`Supprimer le modèle "${template.name}" ?`)) return;
  state.customTemplates = state.customTemplates.filter((entry) => entry.id !== templateId);
  saveSettings();
  renderTemplates();
  renderProgramming();
}

function normalizePlanningWeek(weekKey, savedWeek, baseWeek, legacySlots, validDomainIds, domainIds, fallbackDomain) {
  const savedDays = new Map((savedWeek?.days || []).map((day) => [day.id, day]));
  return {
    label: baseWeek.label,
    summary: savedWeek?.summary || baseWeek.summary,
    days: DAY_DEFS.map((dayDef) => {
      const savedDay = savedDays.get(dayDef.id);
      const baseDay = baseWeek.days.find((day) => day.id === dayDef.id) || {};
      const domainId = validDomainIds.has(savedDay?.domainId) ? savedDay.domainId : baseDay.domainId || fallbackDomain;
      const daySlots = normalizeSlots(savedDay?.slots, legacySlots.length ? legacySlots : baseDay.slots);
      const savedSlotsByDomain = savedDay?.slotsByDomain || {};
      const migratedSportSlots = [
        ...(Array.isArray(savedDay?.sportSlots) ? savedDay.sportSlots : []),
        ...(Array.isArray(savedDay?.slots) ? savedDay.slots.filter((slot) => slot?.type === "sport") : []),
        ...Object.values(savedSlotsByDomain)
          .filter(Array.isArray)
          .flatMap((slots) => slots.filter((slot) => slot?.type === "sport")),
      ];
      const slotsByDomain = Object.fromEntries(
        domainIds.map((currentDomainId) => {
          const fallbackSlots = currentDomainId === domainId ? daySlots : legacySlots.length ? legacySlots : baseDay.slots;
          return [currentDomainId, normalizeSlots(savedSlotsByDomain[currentDomainId], fallbackSlots)];
        })
      );
      return {
        ...dayDef,
        domainId,
        enabled: typeof savedDay?.enabled === "boolean" ? savedDay.enabled : Boolean(baseDay.enabled),
        slots: daySlots,
        slotsByDomain,
        sportSlots: normalizeSportSlots(migratedSportSlots),
      };
    }),
  };
}

function normalizePlanning(raw) {
  const base = defaultPlanning();
  if (!raw || typeof raw !== "object") return base;

  const validDomainIds = new Set(domains().map((domain) => domain.id));
  const domainIds = domains().map((domain) => domain.id);
  const fallbackDomain = domains()[0]?.id || "maths";
  const legacySlots = normalizeSlots(raw.slots, base.slots);
  const weeks = {};

  ["A", "B"].forEach((weekKey) => {
    const savedWeek = raw.weeks?.[weekKey] || {};
    weeks[weekKey] = normalizePlanningWeek(weekKey, savedWeek, base.weeks[weekKey], legacySlots, validDomainIds, domainIds, fallbackDomain);
  });

  const slots = legacySlots.length ? legacySlots : base.slots;
  const overrides = {};
  Object.entries(raw.overrides || {}).forEach(([weekStartKey, savedWeek]) => {
    const weekStart = parseLocalDate(weekStartKey);
    if (Number.isNaN(weekStart.getTime())) return;
    const weekKey = ["A", "B"].includes(savedWeek?.weekKey) ? savedWeek.weekKey : getCurrentWeekKey(weekStart);
    overrides[weekStartKey] = {
      ...normalizePlanningWeek(weekKey, savedWeek, weeks[weekKey], legacySlots, validDomainIds, domainIds, fallbackDomain),
      weekKey,
    };
  });

  return { weeks, slots, overrides };
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
  return mondayOfWeek(startOfDay(date));
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

function currentRealWeekKey() {
  return getCurrentWeekKey(getPlanningWeekStart());
}

function nextOccurrenceStartForWeek(weekKey, from = getPlanningWeekStart()) {
  let cursor = mondayOfWeek(from);
  for (let index = 0; index < 3; index += 1) {
    if (getCurrentWeekKey(cursor) === weekKey) return cursor;
    cursor = addDays(cursor, 7);
  }
  return cursor;
}

function programmingOccurrenceOptions(weekKey) {
  const firstStart = nextOccurrenceStartForWeek(weekKey);
  const firstIsCurrent = isSameDay(firstStart, getPlanningWeekStart());
  const options = [
    {
      id: "current",
      label: firstIsCurrent ? "Actuelle" : "Prochaine",
      start: firstStart,
    },
    {
      id: "next",
      label: firstIsCurrent ? "Prochaine" : "Suivante",
      start: addDays(firstStart, 14),
    },
  ];
  return options;
}

function weekEditorStatusLabel(weekKey) {
  if (weekKey === currentRealWeekKey()) return "actuelle";
  const nextWeekStart = addDays(getPlanningWeekStart(), 7);
  return isSameDay(nextOccurrenceStartForWeek(weekKey), nextWeekStart) ? "suivante" : "";
}

function selectedProgrammingOccurrence(weekKey = state.selectedProgrammingWeek || currentRealWeekKey()) {
  const options = programmingOccurrenceOptions(weekKey);
  return options.find((option) => option.id === state.selectedProgrammingOccurrence) || options[0];
}

function programmingWeekStart(weekKey = state.selectedProgrammingWeek || currentRealWeekKey()) {
  return selectedProgrammingOccurrence(weekKey).start;
}

function weekRangeShortLabel(weekStart) {
  return `${dayFormatter.format(weekStart)} - ${dayFormatter.format(addDays(weekStart, 6))}`;
}

function isCurrentProgrammingOccurrence(weekKey) {
  return isSameDay(programmingWeekStart(weekKey), getPlanningWeekStart());
}

function planningWeekForStart(weekStart) {
  state.planning = normalizePlanning(state.planning);
  const normalizedStart = mondayOfWeek(weekStart);
  const weekStartKey = dateId(normalizedStart);
  const weekKey = getCurrentWeekKey(normalizedStart);
  const overrideWeek = state.planning.overrides?.[weekStartKey];
  if (overrideWeek) return overrideWeek;

  const currentStart = getPlanningWeekStart();
  if (normalizedStart <= currentStart) {
    return state.planning.weeks[weekKey] || state.planning.weeks.A;
  }

  const previousWeek = planningWeekForStart(addDays(normalizedStart, -14));
  const weekMeta = state.planning.weeks[weekKey] || state.planning.weeks.A;
  return {
    ...clonePlanningWeek(previousWeek),
    label: weekMeta.label,
    summary: previousWeek.summary || weekMeta.summary || "",
    weekKey,
  };
}

function ensurePlanningOverride(weekKey, weekStartKey) {
  state.planning = normalizePlanning(state.planning);
  if (!state.planning.overrides) state.planning.overrides = {};
  if (!state.planning.overrides[weekStartKey]) {
    const weekStart = parseLocalDate(weekStartKey);
    const inheritedWeek = planningWeekForStart(weekStart);
    const weekMeta = state.planning.weeks[weekKey] || state.planning.weeks.A;
    state.planning.overrides[weekStartKey] = {
      ...clonePlanningWeek(inheritedWeek),
      label: weekMeta.label,
      summary: inheritedWeek.summary || weekMeta.summary || "",
      weekKey,
    };
  }
  return state.planning.overrides[weekStartKey];
}

function editablePlanningWeek(weekKey) {
  state.planning = normalizePlanning(state.planning);
  const weekStart = programmingWeekStart(weekKey);
  const weekStartKey = dateId(weekStart);
  const overrideWeek = state.planning.overrides?.[weekStartKey];
  if (overrideWeek) return overrideWeek;
  if (isSameDay(weekStart, getPlanningWeekStart())) {
    return state.planning.weeks[weekKey] || state.planning.weeks.A;
  }
  return ensurePlanningOverride(weekKey, weekStartKey);
}

function displayPlanningWeek(weekKey) {
  state.planning = normalizePlanning(state.planning);
  const weekStart = programmingWeekStart(weekKey);
  const weekStartKey = dateId(weekStart);
  const overrideWeek = state.planning.overrides?.[weekStartKey];
  if (overrideWeek) return overrideWeek;
  if (isSameDay(weekStart, getPlanningWeekStart())) {
    return state.planning.weeks[weekKey] || state.planning.weeks.A;
  }
  return planningWeekForStart(weekStart);
}

function getWeekRangeLabel(date = getViewedWeekStart()) {
  const monday = mondayOfWeek(date);
  const weekDays = getWeek().days.length ? getWeek().days : DAY_DEFS;
  const lastDay = weekDays[weekDays.length - 1];
  const lastDayIndex = Math.max(0, DAY_DEFS.findIndex((day) => day.id === lastDay?.id));
  const lastDate = addDays(monday, lastDayIndex);
  return `${rangeFormatter.format(monday)} au ${rangeFormatter.format(lastDate)} ${yearFormatter.format(lastDate)}`;
}

function viewedWeekStatusMeta(date = getViewedWeekStart()) {
  const viewedStart = mondayOfWeek(date);
  const currentStart = getPlanningWeekStart();
  if (isSameDay(viewedStart, currentStart)) {
    return { label: "Actuelle", className: "week-status-current" };
  }
  return viewedStart < currentStart
    ? { label: "Passée", className: "week-status-past" }
    : { label: "À venir", className: "week-status-future" };
}

function renderWeekLabel() {
  const status = viewedWeekStatusMeta();
  return `
    <strong class="week-label ${status.className}">
      <span>${escapeHtml(getWeek().label)}</span>
      <em>${escapeHtml(status.label)}</em>
    </strong>
  `;
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

function slotTimeRange(slot) {
  const start = minutesFromTime(slot.start || "00:00");
  let end = minutesFromTime(slot.end || "00:00");
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    end = 24 * 60;
  }
  return { start, end };
}

function formatTimelineHour(hour) {
  return hour === 24 ? "00h" : `${String(hour).padStart(2, "0")}h`;
}

function timelineHours() {
  const bounds = timelineBounds();
  return Array.from(
    { length: bounds.endHour - bounds.startHour + 1 },
    (_, index) => bounds.startHour + index
  );
}

function timelineBounds() {
  const slotMinutes = visibleWeekSlots()
    .flatMap((slot) => {
      const range = slotTimeRange(slot);
      return [range.start, range.end];
    })
    .filter(Number.isFinite);
  const startMinutes = slotMinutes.length ? Math.min(...slotMinutes) : TIMELINE_START_HOUR * 60;
  const endMinutes = slotMinutes.length ? Math.max(...slotMinutes) : TIMELINE_END_HOUR * 60;
  return {
    startHour: Math.max(0, Math.min(TIMELINE_START_HOUR, Math.floor(startMinutes / 60))),
    endHour: Math.min(24, Math.max(TIMELINE_END_HOUR, Math.ceil(endMinutes / 60))),
  };
}

function timelineStyle(session) {
  const bounds = timelineBounds();
  const { start, end } = slotTimeRange(session);
  const startMinute = bounds.startHour * 60;
  const endMinute = bounds.endHour * 60;
  const top = ((Math.max(start, startMinute) - startMinute) / 60) * TIMELINE_PX_PER_HOUR;
  const height = ((Math.min(end, endMinute) - Math.max(start, startMinute)) / 60) * TIMELINE_PX_PER_HOUR;
  return `--event-top:${Math.max(0, top)}px;--event-height:${Math.max(34, height)}px;`;
}

function sessionDateRange(day, session) {
  const range = slotTimeRange(session);
  const startsAt = new Date(day.date);
  startsAt.setHours(0, range.start, 0, 0);
  const endsAt = new Date(day.date);
  endsAt.setHours(0, range.end, 0, 0);
  return { startsAt, endsAt };
}

function calendarSessionTimeline(days, now = new Date()) {
  const sessions = days
    .flatMap((day) =>
      day.sessions.map((session) => {
        const range = sessionDateRange(day, session);
        return { day, session, ...range };
      })
    )
    .sort((a, b) => a.startsAt - b.startsAt);
  const current = sessions.find((entry) => entry.startsAt <= now && now < entry.endsAt) || null;
  const next = sessions.find((entry) => entry.startsAt > now) || null;
  return { current, next };
}

function calendarSessionTitle(entry) {
  if (!entry) return "";
  if (entry.session.type === "sport") return entry.session.label || "Sport";
  return entry.session.topic?.title || "Programme terminé";
}

function calendarSessionMeta(entry, mode) {
  if (!entry) return "";
  const time = `${entry.session.start}-${entry.session.end}`;
  const day = isSameDay(entry.day.date, new Date()) ? "Aujourd'hui" : entry.day.longLabel;
  if (mode === "current") return `${day} · jusqu'à ${entry.session.end}`;
  return `${day} · ${time}`;
}

function renderCalendarNowNextCard(entry, kind) {
  const accentClass = entry?.session.type === "sport" ? "sport-card" : `accent-${entry?.day.domain?.accent || "neutral"}`;
  if (!entry) {
    const emptyText = kind === "current" ? "Aucune séance en cours" : "Aucune séance à venir";
    const hint = kind === "current" ? "Maintenant" : "Cette semaine";
    return `
      <article class="calendar-now-card calendar-now-empty">
        <span>${kind === "current" ? "En cours" : "Prochain"}</span>
        <strong>${emptyText}</strong>
        <small>${hint}</small>
      </article>
    `;
  }

  const subject = entry.session.type === "sport" ? "Sport" : entry.day.domain?.shortTitle || "Cours";
  return `
    <article class="calendar-now-card ${accentClass}">
      <span>${kind === "current" ? "En cours" : "Prochain"}</span>
      <strong>${escapeHtml(calendarSessionTitle(entry))}</strong>
      <small>${escapeHtml(subject)} · ${escapeHtml(calendarSessionMeta(entry, kind))}</small>
    </article>
  `;
}

function renderCalendarNowNext(days) {
  const container = document.getElementById("calendarNowNext");
  if (!container) return;
  const { current, next } = calendarSessionTimeline(days);
  container.innerHTML = `
    ${renderCalendarNowNextCard(current, "current")}
    ${renderCalendarNowNextCard(next, "next")}
  `;
}

function getStatus(topicId) {
  return state.progress[topicId]?.status || "todo";
}

function normalizeMastery(value) {
  const raw = Number(value);
  return Number.isFinite(raw) && raw >= 0 && raw <= 4 ? Math.floor(raw) : 0;
}

function getMastery(topicId) {
  const raw = state.progress[topicId]?.mastery;
  return normalizeMastery(raw);
}

function getTopic(topicId) {
  return allTopics().find((topic) => topic.id === topicId) || null;
}

function sanitizeHistoryMeta(meta) {
  return Object.fromEntries(
    Object.entries(meta || {})
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .map(([key, value]) => [key, value])
  );
}

function recordHistory(type, payload = {}) {
  const topic = payload.topicId ? getTopic(payload.topicId) : null;
  const meta = sanitizeHistoryMeta(payload.meta);
  const event = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    createdAt: payload.createdAt || new Date().toISOString(),
    topicId: payload.topicId || topic?.id || "",
    domainId: payload.domainId || topic?.domainId || "",
    title: payload.title || topic?.title || "",
  };
  if (Object.keys(meta).length) event.meta = meta;
  state.history = [event, ...state.history.map(normalizeHistoryEvent).filter(Boolean)].slice(0, 80);
}

function setMastery(topicId, mastery) {
  const value = normalizeMastery(mastery);
  const previous = state.progress[topicId] || {};
  state.progress[topicId] = { ...previous, mastery: value };
  recordHistory("mastery", {
    topicId,
    meta: {
      label: MASTERY_LABELS[value],
      niveau: value,
    },
  });
  saveProgress();
  render();
}

function markReviewed(topicId) {
  const now = new Date().toISOString();
  const previous = state.progress[topicId] || {};
  const previousCount = Number(previous.reviewCount);
  state.progress[topicId] = {
    ...previous,
    lastReviewedAt: now,
    reviewCount: Number.isFinite(previousCount) ? previousCount + 1 : 1,
    updatedAt: now,
  };
  recordHistory("review", { topicId, createdAt: now });
  saveProgress();
  render();
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
  recordHistory("status", {
    topicId,
    createdAt: now,
    meta: {
      label: statusLabels[status] || status,
      status,
    },
  });
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

function globalProgressSnapshot() {
  const topics = allTopics();
  const stats = blockStats(topics);
  const remaining = Math.max(0, stats.total - stats.done);
  const byDomain = domains().map((domain) => {
    const domainTopics = topics.filter((topic) => topic.domainId === domain.id);
    return { domain, stats: blockStats(domainTopics) };
  });
  return { ...stats, remaining, byDomain };
}

function renderWeekProgressSummary() {
  const progress = globalProgressSnapshot();
  const chapterLabel = progress.remaining > 1 ? "chapitres restants" : "chapitre restant";
  return `
    <div class="week-progress-summary" aria-label="Progression globale">
      <div class="week-progress-main">
        <span>Progression globale</span>
        <strong>
          <em>${progress.remaining}</em>
          <span>${chapterLabel}</span>
          <small>${progress.pct}% terminé</small>
        </strong>
      </div>
      <div class="week-progress-track" aria-hidden="true">
        <i style="width:${progress.pct}%"></i>
      </div>
      <div class="week-progress-domains">
        ${progress.byDomain
          .map(({ domain, stats }) => `<span class="accent-${domain.accent}"><i aria-hidden="true"></i>${escapeHtml(domain.shortTitle)} ${stats.pct}%</span>`)
          .join("")}
      </div>
    </div>
  `;
}

function topicAiIndex(topic) {
  const match = /^ps-ai-(\d+)$/.exec(topic.id || "");
  return match ? Number(match[1]) : null;
}

function topicsInAiRange(topics, start, end) {
  return topics.filter((topic) => {
    const index = topicAiIndex(topic);
    return Number.isFinite(index) && index >= start && index <= end;
  });
}

function topicGroupsForBlock(entry, orderedTopics) {
  if (entry.domain.id !== "proba" || entry.block.title !== "B3 - ML, DL, RL et ML Engineering") {
    return null;
  }

  return [
    { id: "ml-general", title: "Machine Learning général", topics: topicsInAiRange(orderedTopics, 1, 11) },
    { id: "deep-learning", title: "Deep Learning", topics: topicsInAiRange(orderedTopics, 12, 21) },
    { id: "reinforcement-learning", title: "Reinforcement Learning", topics: topicsInAiRange(orderedTopics, 22, 27) },
    { id: "ml-engineering", title: "ML Engineering", topics: topicsInAiRange(orderedTopics, 28, 28) },
  ].filter((group) => group.topics.length);
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

function orderedTopicsForProgress(topics) {
  const rows = topics.map((topic) => ({
    topic,
    started: getStatus(topic.id) !== "todo",
  }));
  return [
    ...rows.filter((row) => row.started),
    ...rows.filter((row) => !row.started),
  ].map((row) => row.topic);
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
    const dayIndex = DAY_DEFS.findIndex((definition) => definition.id === day.id);
    const dayDate = addDays(monday, Math.max(dayIndex, 0));
    const enabled = day.enabled !== false;
    const domain = enabled ? getDomain(day.domainId) : null;
    const current = enabled ? currentBlockForDomain(day.domainId) : null;
    const topic = enabled ? currentTopicForDomain(day.domainId) : null;
    const courseSessions = enabled ? slotsForDay(day).map((slot) => {
      return {
        ...slot,
        id: `${dateId(dayDate)}-${day.id}-${slot.id}`,
        topic,
      };
    }) : [];
    const sportSessions = enabled ? sportSlotsForDay(day).map((slot) => ({
      ...slot,
      id: `${dateId(dayDate)}-${day.id}-${slot.id}`,
      type: "sport",
      topic: null,
    })) : [];
    const sessions = [...courseSessions, ...sportSessions].sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));
    return {
      ...day,
      enabled,
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
      state.activity = [];
      state.history = [];
      saveProgress();
      render();
    }
  });
}

function render() {
  const weekStatus = viewedWeekStatusMeta();
  document.getElementById("viewTitle").textContent = viewTitles[state.view];
  document.getElementById("weekEyebrow").textContent = `${getWeek().label} ${weekStatus.label.toLowerCase()} · automatique`;

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.getElementById(`${state.view}View`).classList.add("active-view");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  renderCalendar();
  renderProgress();
  renderProgramming();
  renderTemplates();
}

function renderCalendar() {
  const days = scheduleForWeek();
  const calendar = document.getElementById("weekCalendar");

  focusCurrentCalendarDay(days);

  const visibleSessionIds = new Set(days.flatMap((day) => day.sessions.map((session) => session.id)));
  if (!visibleSessionIds.has(state.selectedSessionId)) {
    state.selectedSessionId = days.flatMap((day) => day.sessions)[0]?.id || null;
    saveSettings();
  }

  document.getElementById("weekSummary").innerHTML = `
    <button class="week-arrow" type="button" data-week-shift="-1" aria-label="Semaine precedente">‹</button>
    ${renderWeekLabel()}
    ${renderWeekProgressSummary()}
    <span class="week-date">
      <b>Aujourd'hui ${escapeHtml(todayLabel())}</b>
      <small>${escapeHtml(getWeekRangeLabel())}</small>
    </span>
    <button class="week-arrow" type="button" data-week-shift="1" aria-label="Semaine suivante">›</button>
  `;
  renderCalendarNowNext(days);
  calendar.innerHTML = days.map((day) => renderDayCard(day)).join("");
  scrollCalendarToFocusedDay(calendar);

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

function focusCurrentCalendarDay(days) {
  if (state.calendarInitialFocusDone || !isSameDay(getViewedWeekStart(), getPlanningWeekStart())) return;
  state.calendarInitialFocusDone = true;
  state.calendarShouldScrollToToday = true;
  const today = days.find((day) => isSameDay(day.date, new Date()));
  const todaySession = today?.sessions[0];
  if (todaySession) {
    state.selectedSessionId = todaySession.id;
    saveSettings();
  }
}

function scrollCalendarToFocusedDay(calendar) {
  if (!state.calendarShouldScrollToToday || !isSameDay(getViewedWeekStart(), getPlanningWeekStart())) return;
  state.calendarShouldScrollToToday = false;
  requestAnimationFrame(() => {
    calendar.querySelector(".today-day")?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "start",
    });
  });
}

function renderDayCard(day) {
  const todayClass = isSameDay(day.date, new Date()) ? " today-day" : "";
  const todayBadge = todayClass ? `<span class="today-badge">Aujourd'hui</span>` : "";
  const bounds = timelineBounds();
  const hours = timelineHours();
  const dayAccent = day.domain?.accent || "neutral";
  const meta = day.domain ? `${day.dateLabel} · ${day.domain.title}` : day.dateLabel;
  return `
    <section class="day-card accent-${dayAccent}${day.enabled ? "" : " day-card-disabled"}${todayClass}">
      <div class="day-card-header">
        <span>${escapeHtml(day.label)}</span>
        <div>
          <strong>${escapeHtml(day.longLabel)}${todayBadge}</strong>
          <small>${escapeHtml(meta)}</small>
        </div>
      </div>
      <div class="day-timeline" style="--timeline-hours:${bounds.endHour - bounds.startHour};--hour-size:${TIMELINE_PX_PER_HOUR}px;">
        <div class="time-rail" aria-hidden="true">
          ${hours.map((hour) => `<span>${formatTimelineHour(hour)}</span>`).join("")}
        </div>
        <div class="timeline-area">
          ${hours.map((hour) => `<i style="--hour-index:${hour - bounds.startHour}"></i>`).join("")}
          ${day.sessions.length ? day.sessions.map((session) => renderCourseBlock(day, session)).join("") : '<p class="timeline-empty-note">Aucun cours</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderCourseBlock(day, session) {
  if (session?.type === "sport") {
    const selected = session?.id === state.selectedSessionId ? " selected" : "";
    return `
      <button class="course-block timeline-block sport-block${selected}" type="button" data-session-id="${session.id}" data-domain-id="${day.domain.id}" style="${timelineStyle(session)}">
        <time>${escapeHtml(session.start)}-${escapeHtml(session.end)}</time>
        <span>Sport · ${escapeHtml(sessionTimingLabel(day.date, session))}</span>
        <strong>${escapeHtml(session.label || "Sport")}</strong>
        <em>Sport</em>
      </button>
    `;
  }

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
  const selectedDay = days.find((day) => day.sessions.some((s) => s.id === state.selectedSessionId));
  const selectedSession = selectedDay?.sessions.find((s) => s.id === state.selectedSessionId);

  if (!selectedSession) {
    detail.innerHTML = `
      <section class="detail-card calendar-title-card">
        <div class="calendar-selector-head">
          <span>Domaine</span>
          ${renderDomainSelector("calendar")}
        </div>
        <div class="calendar-topic-strip">
          <span>Planning</span>
          <strong>Aucune séance sélectionnée</strong>
        </div>
        <p class="calendar-empty-note">Ajoute un cours dans Programme pour le faire apparaitre ici.</p>
      </section>
    `;
    attachDomainSelectorHandlers(detail);
    return;
  }

  if (selectedSession?.type === "sport") {
    detail.innerHTML = `
      <section class="detail-card calendar-title-card sport-detail-card">
        <div class="calendar-topic-strip">
          <span>Planning</span>
          <strong>${escapeHtml(selectedSession.label || "Sport")}</strong>
        </div>
        <div class="calendar-topic-strip">
          <span>Horaire</span>
          <strong>${escapeHtml(selectedDay.longLabel)} · ${escapeHtml(selectedSession.start)}-${escapeHtml(selectedSession.end)}</strong>
        </div>
        <div class="calendar-topic-strip">
          <span>Type</span>
          <strong>Sport</strong>
        </div>
      </section>
    `;
    return;
  }

  const selectedDomain = getDomain(state.selectedDomainId) || domains()[0];
  const current = currentBlockForDomain(selectedDomain.id);
  const topic = currentTopicForDomain(selectedDomain.id);
  const accent = selectedDomain.accent;
  const actEntry = selectedSession?.topic ? activityForSession(state.selectedSessionId) : null;
  const canToggleActivity = selectedSession?.topic && selectedDay ? canToggleActivityForSession(selectedDay, selectedSession, actEntry) : false;
  const activityTitle = canToggleActivity ? "" : " title=\"Disponible quand la séance est terminée\"";
  const activityBtnHtml = selectedSession?.topic
    ? `<div class="calendar-activity-strip">
        <button class="activity-toggle-btn${actEntry ? " activity-marked" : ""}" type="button" data-activity-toggle${canToggleActivity ? "" : " disabled"}${activityTitle}>
          ${actEntry ? "Séance validée" : "Séance travaillée"}
        </button>
      </div>`
    : "";

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
        ${activityBtnHtml}
      </section>
    `;
    attachDomainSelectorHandlers(detail);
    if (selectedSession && selectedDay) attachActivityHandlers(detail, selectedSession, selectedDay);
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
      ${activityBtnHtml}
    </section>
  `;
  attachStatusHandlers(detail);
  attachDomainSelectorHandlers(detail);
  if (selectedSession && selectedDay) attachActivityHandlers(detail, selectedSession, selectedDay);
}

function attachActivityHandlers(root, session, day) {
  const button = root.querySelector("[data-activity-toggle]");
  if (!button || button.disabled) return;
  button.addEventListener("click", () => toggleActivity(session, day));
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
    ${renderDashboard()}
    ${renderDomainSelector("progress")}
    ${selectedDomain ? renderDomainProgress(selectedDomain) : ""}
    ${renderBackupPanel()}
  `;
  attachStatusHandlers(container);
  attachMasteryHandlers(container);
  attachReviewHandlers(container);
  attachHeatmapHandlers(container);
  attachDomainSelectorHandlers(container);
  attachProgramSelectorHandlers(container);
  attachBlockSelectorHandlers(container);
  attachBackupHandlers(container);
}

function renderBackupPanel() {
  const backups = loadAutoBackups();
  const recent = backups.slice(0, 5);
  return `
    <section class="backup-card" aria-label="Sauvegardes">
      <div class="backup-head">
        <div>
          <span>Sauvegardes</span>
          <strong>${escapeHtml(String(backups.length))} locale${backups.length > 1 ? "s" : ""}</strong>
        </div>
        <div class="backup-actions">
          <button class="backup-button backup-export" type="button" data-backup-export>Exporter</button>
          <button class="backup-button backup-import" type="button" data-backup-import>Importer</button>
          <input class="backup-file-input" type="file" accept=".json,application/json" data-backup-file aria-label="Importer une sauvegarde">
        </div>
      </div>
      <div class="backup-list">
        ${recent.length
          ? recent.map((entry, index) => `
              <article class="backup-row">
                <div class="backup-row-main">
                  <strong>${escapeHtml(backupTitle(entry))}</strong>
                  <span>${escapeHtml(backupSummary(entry.meta || entry.payload?.meta || {}))}</span>
                </div>
                <button class="backup-restore" type="button" data-backup-restore="${index}">Restaurer</button>
              </article>
            `).join("")
          : `<p class="backup-empty">Les sauvegardes automatiques apparaitront ici apres tes prochaines modifications.</p>`}
      </div>
    </section>
  `;
}

function attachBackupHandlers(root) {
  const fileInput = root.querySelector("[data-backup-file]");
  root.querySelector("[data-backup-export]")?.addEventListener("click", exportCurrentBackup);
  root.querySelector("[data-backup-import]")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const payload = parseBackupPayload(String(reader.result || ""));
        confirmAndRestorePayload(payload, file.name || "cette sauvegarde");
      } catch (error) {
        alert(error.message || "Impossible d'importer cette sauvegarde.");
      } finally {
        fileInput.value = "";
      }
    });
    reader.addEventListener("error", () => {
      alert("Impossible de lire ce fichier.");
      fileInput.value = "";
    });
    reader.readAsText(file);
  });
  root.querySelectorAll("[data-backup-restore]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = loadAutoBackups()[Number(button.dataset.backupRestore)];
      if (!entry?.payload) return;
      confirmAndRestorePayload(entry.payload, backupTitle(entry));
    });
  });
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
  const selectedLabel = selectedEntry ? selectedEntry.block.title.replace(/^Bloc\s*/i, "B") : "Choisir un bloc";
  const selectedMarker = selectedEntry?.position === "current" ? "Courant" : selectedEntry?.position === "before" ? "Avant" : "Apres";
  const selectedCount = selectedEntry ? `${selectedEntry.stats.done}/${selectedEntry.stats.total}` : "";

  return `
    <details class="block-picker" data-block-selector="${domain.id}">
      <summary class="block-picker-trigger">
        <span>${escapeHtml(selectedMarker)}</span>
        <strong>${escapeHtml(selectedLabel)}</strong>
        <em>${escapeHtml(selectedCount)}</em>
      </summary>
      <div class="block-picker-menu" role="listbox" aria-label="Choisir un bloc">
        ${blocks
          .map((entry) => {
            const key = blockKey(entry);
            const active = selectedEntry && blockKey(selectedEntry) === key ? " active-block" : "";
            const label = entry.block.title.replace(/^Bloc\s*/i, "B");
            const marker = entry.position === "current" ? "Courant" : entry.position === "before" ? "Avant" : "Apres";
            return `
              <button class="block-option block-option-${entry.position}${active}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-block-domain="${domain.id}" data-block-key="${escapeHtml(key)}">
                <span>${escapeHtml(marker)}</span>
                <strong>${escapeHtml(label)}</strong>
                <em>${entry.stats.done}/${entry.stats.total}</em>
              </button>
            `;
          })
          .join("")}
      </div>
    </details>
  `;
}

function attachBlockSelectorHandlers(root = document) {
  root.querySelectorAll("[data-block-key]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".block-picker")?.removeAttribute("open");
      selectBlock(button.dataset.blockDomain, button.dataset.blockKey);
    });
  });
}

function selectProgrammingWeek(weekKey) {
  const changedWeek = state.selectedProgrammingWeek !== weekKey;
  state.selectedProgrammingWeek = weekKey;
  if (changedWeek) state.selectedProgrammingOccurrence = "current";
  state.scheduleNotice = null;
  saveSettings();
  renderProgramming();
}

function selectProgrammingOccurrence(occurrenceId) {
  state.selectedProgrammingOccurrence = occurrenceId;
  state.scheduleNotice = null;
  saveSettings();
  renderProgramming();
}

function selectScheduleDay(dayId) {
  state.selectedScheduleDay = dayId;
  state.scheduleNotice = null;
  saveSettings();
  renderProgramming();
}

function updatePlanningDay(weekKey, dayId, patch) {
  state.planning = normalizePlanning(state.planning);
  const week = editablePlanningWeek(weekKey);
  const day = week.days.find((entry) => entry.id === dayId);
  if (!day) return;
  if (isProgrammingDayAssignmentLocked(weekKey, day)) {
    blockPastPlanningEdit("Ce jour a deja commence : la matiere et l'activation sont verrouillees.");
    return;
  }
  Object.assign(day, patch);
  state.selectedSessionId = null;
  state.scheduleNotice = null;
  saveSettings();
  render();
}

function getPlanningDay(weekKey, dayId) {
  return editablePlanningWeek(weekKey).days.find((entry) => entry.id === dayId) || null;
}

function programmingDayDate(weekKey, dayId) {
  const dayIndex = DAY_DEFS.findIndex((definition) => definition.id === dayId);
  return addDays(programmingWeekStart(weekKey), Math.max(dayIndex, 0));
}

function isCurrentProgrammingWeek(weekKey) {
  return isCurrentProgrammingOccurrence(weekKey);
}

function programmingSlotDateRange(weekKey, dayId, slot) {
  return sessionDateRange({ date: programmingDayDate(weekKey, dayId) }, slot);
}

function isPastProgrammingDay(weekKey, dayId, now = new Date()) {
  if (!isCurrentProgrammingWeek(weekKey)) return false;
  return programmingDayDate(weekKey, dayId) < startOfDay(now);
}

function isFutureProgrammingSlot(weekKey, dayId, slot, now = new Date()) {
  if (!isCurrentProgrammingWeek(weekKey)) return true;
  const { startsAt } = programmingSlotDateRange(weekKey, dayId, slot);
  return startsAt > now;
}

function slotEndsInFuture(weekKey, dayId, slot, now = new Date()) {
  if (!isCurrentProgrammingWeek(weekKey)) return true;
  const { endsAt } = programmingSlotDateRange(weekKey, dayId, slot);
  return endsAt > now;
}

function programmingSlotLockInfo(weekKey, dayId, slot, now = new Date()) {
  if (!isCurrentProgrammingWeek(weekKey)) return { locked: false, canEditEnd: true, message: "" };
  if (isPastProgrammingDay(weekKey, dayId, now)) {
    return { locked: true, canEditEnd: false, message: "Jour passé : modification verrouillée." };
  }

  const { startsAt, endsAt } = programmingSlotDateRange(weekKey, dayId, slot);
  if (endsAt <= now) {
    return { locked: true, canEditEnd: false, message: "Créneau passé : modification verrouillée." };
  }
  if (startsAt <= now && now < endsAt) {
    return { locked: true, canEditEnd: true, message: "Séance en cours : seule l'heure de fin peut être prolongée." };
  }
  return { locked: false, canEditEnd: true, message: "" };
}

function isProgrammingDayAssignmentLocked(weekKey, day) {
  if (!isCurrentProgrammingWeek(weekKey)) return false;
  if (isPastProgrammingDay(weekKey, day.id)) return true;
  const domain = getDomain(day.domainId) || domains()[0];
  return [...slotsForDay(day, domain.id), ...sportSlotsForDay(day)].some((slot) => !isFutureProgrammingSlot(weekKey, day.id, slot));
}

function blockPastPlanningEdit(message, slotId = null) {
  state.scheduleNotice = { slotId, message };
  render();
}

function slotsForPlanningDay(day, domainId) {
  if (!day.slotsByDomain) day.slotsByDomain = {};
  if (!day.slotsByDomain[domainId]) {
    day.slotsByDomain[domainId] = normalizeSlots(day.slots, state.planning.slots || []);
  } else {
    day.slotsByDomain[domainId] = normalizeSlots(day.slotsByDomain[domainId], []);
  }
  return day.slotsByDomain[domainId];
}

function updatePlanningSlot(weekKey, dayId, domainId, slotId, patch) {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slots = slotsForPlanningDay(day, domainId);
  const slot = slots.find((entry) => entry.id === slotId);
  if (!slot) return;
  const lockInfo = programmingSlotLockInfo(weekKey, dayId, slot);
  const isOnlyEndEdit = Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, "end");
  if (lockInfo.locked && !(lockInfo.canEditEnd && isOnlyEndEdit)) {
    blockPastPlanningEdit(lockInfo.message, slotId);
    return;
  }
  const candidate = { ...slot, ...patch };
  if (lockInfo.locked && lockInfo.canEditEnd && isOnlyEndEdit && !slotEndsInFuture(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("L'heure de fin doit rester dans le futur.", slotId);
    return;
  }
  if (!lockInfo.locked && !isFutureProgrammingSlot(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("Impossible de placer un cours sur un horaire déjà commencé.", slotId);
    return;
  }
  const conflict = slotConflict(slots, candidate, slotId);
  if (conflict) {
    state.scheduleNotice = {
      slotId,
      message: `Conflit avec ${conflict.label || "un autre cours"} (${conflict.start}-${conflict.end}).`,
    };
    render();
    return;
  }
  Object.assign(slot, patch);
  state.selectedSessionId = null;
  state.scheduleNotice = null;
  saveSettings();
  render();
}

function getSlotPreset(presetId) {
  return SLOT_PRESETS.find((preset) => preset.id === presetId) || null;
}

function getSportPreset(presetId) {
  return SPORT_PRESETS.find((preset) => preset.id === presetId) || null;
}

function courseSlotDefaultLabel(slot) {
  return slotPeriodMeta(slot).label;
}

function slotConflict(slots, candidate, ignoredSlotId = null) {
  const candidateRange = slotTimeRange(candidate);
  return slots.find((slot) => {
    if (slot.id === ignoredSlotId) return false;
    const range = slotTimeRange(slot);
    return candidateRange.start < range.end && candidateRange.end > range.start;
  }) || null;
}

function canPlaceCourseSlot(slots, candidate, ignoredSlotId = null) {
  return !slotConflict(slots, candidate, ignoredSlotId);
}

function addPlanningSlot(weekKey, dayId, domainId, presetId = "evening") {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slots = slotsForPlanningDay(day, domainId);
  if (slots.length >= MAX_COURSE_SLOTS_PER_DAY) return;
  const preset = getSlotPreset(presetId) || getSlotPreset("evening") || SLOT_PRESETS[0];
  const start = preset?.start || "18:00";
  const end = preset?.end || "19:00";
  const candidate = { id: `custom-${Date.now()}`, label: courseSlotDefaultLabel({ ...preset, start, end }), start, end };
  if (!isFutureProgrammingSlot(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("Impossible d'ajouter un cours sur un horaire déjà commencé.");
    return;
  }
  const conflict = slotConflict(slots, candidate);
  if (conflict) {
    state.scheduleNotice = {
      slotId: null,
      message: `Impossible d'ajouter ce cours : conflit avec ${conflict.label || "un autre cours"} (${conflict.start}-${conflict.end}).`,
    };
    render();
    return;
  }
  slots.push({
    id: candidate.id,
    label: candidate.label,
    start,
    end,
  });
  state.selectedSessionId = null;
  state.scheduleNotice = null;
  saveSettings();
  render();
}

function applyPlanningSlotPreset(weekKey, dayId, domainId, slotId, presetId) {
  const preset = getSlotPreset(presetId);
  if (!preset) return;
  updatePlanningSlot(weekKey, dayId, domainId, slotId, {
    label: courseSlotDefaultLabel(preset),
    start: preset.start,
    end: preset.end,
  });
}

function removePlanningSlot(weekKey, dayId, domainId, slotId) {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slots = slotsForPlanningDay(day, domainId);
  const slot = slots.find((entry) => entry.id === slotId);
  if (slot) {
    const lockInfo = programmingSlotLockInfo(weekKey, dayId, slot);
    if (lockInfo.locked) {
      blockPastPlanningEdit(lockInfo.message, slotId);
      return;
    }
  }
  day.slotsByDomain[domainId] = slots.filter((slot) => slot.id !== slotId);
  state.selectedSessionId = null;
  state.scheduleNotice = null;
  saveSettings();
  render();
}

function sportSlotsForPlanningDay(day) {
  if (!day.sportSlots) day.sportSlots = [];
  day.sportSlots = normalizeSportSlots(day.sportSlots);
  return day.sportSlots;
}

function slotPeriodMeta(slot) {
  const label = String(slot?.label || "").toLowerCase();
  const start = minutesFromTime(slot?.start || "");
  if (label.includes("soir") || (Number.isFinite(start) && start >= 18 * 60)) {
    return { className: "slot-period-evening", label: "Soir" };
  }
  if (label.includes("apres") || label.includes("après") || (Number.isFinite(start) && start >= 12 * 60)) {
    return { className: "slot-period-afternoon", label: "Apres-midi" };
  }
  return { className: "slot-period-morning", label: "Matin" };
}

function addSportSlot(weekKey, dayId, presetId = "sport-evening") {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slots = sportSlotsForPlanningDay(day);
  if (slots.length >= 8) return;
  const preset = getSportPreset(presetId) || SPORT_PRESETS[0];
  const candidate = {
    id: `sport-${Date.now()}`,
    label: preset?.label || "Sport",
    start: preset?.start || "18:00",
    end: preset?.end || "19:00",
  };
  if (!isFutureProgrammingSlot(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("Impossible d'ajouter du sport sur un horaire déjà commencé.");
    return;
  }
  slots.push({
    id: candidate.id,
    label: candidate.label,
    start: candidate.start,
    end: candidate.end,
  });
  state.selectedSessionId = null;
  saveSettings();
  render();
}

function updateSportSlot(weekKey, dayId, slotId, patch) {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slot = sportSlotsForPlanningDay(day).find((entry) => entry.id === slotId);
  if (!slot) return;
  const lockInfo = programmingSlotLockInfo(weekKey, dayId, slot);
  const isOnlyEndEdit = Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, "end");
  if (lockInfo.locked && !(lockInfo.canEditEnd && isOnlyEndEdit)) {
    blockPastPlanningEdit(lockInfo.message, slotId);
    return;
  }
  const candidate = { ...slot, ...patch };
  if (lockInfo.locked && lockInfo.canEditEnd && isOnlyEndEdit && !slotEndsInFuture(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("L'heure de fin doit rester dans le futur.", slotId);
    return;
  }
  if (!lockInfo.locked && !isFutureProgrammingSlot(weekKey, dayId, candidate)) {
    blockPastPlanningEdit("Impossible de placer du sport sur un horaire déjà commencé.", slotId);
    return;
  }
  Object.assign(slot, patch);
  state.selectedSessionId = null;
  saveSettings();
  render();
}

function applySportSlotPreset(weekKey, dayId, slotId, presetId) {
  const preset = getSportPreset(presetId);
  if (!preset) return;
  updateSportSlot(weekKey, dayId, slotId, {
    label: preset.label,
    start: preset.start,
    end: preset.end,
  });
}

function removeSportSlot(weekKey, dayId, slotId) {
  const day = getPlanningDay(weekKey, dayId);
  if (!day) return;
  const slots = sportSlotsForPlanningDay(day);
  const slot = slots.find((entry) => entry.id === slotId);
  if (slot) {
    const lockInfo = programmingSlotLockInfo(weekKey, dayId, slot);
    if (lockInfo.locked) {
      blockPastPlanningEdit(lockInfo.message, slotId);
      return;
    }
  }
  day.sportSlots = slots.filter((slot) => slot.id !== slotId);
  state.selectedSessionId = null;
  saveSettings();
  render();
}

function resetPlanning() {
  if (!confirm("Revenir au planning par defaut ?")) return;
  state.planning = defaultPlanning();
  state.selectedSessionId = null;
  saveSettings();
  render();
}

function renderProgramming() {
  const container = document.getElementById("programmingContent");
  if (!container) return;

  const weekKey = state.selectedProgrammingWeek || "A";
  const realWeekKey = currentRealWeekKey();
  const occurrenceOptions = programmingOccurrenceOptions(weekKey);
  const occurrence = selectedProgrammingOccurrence(weekKey);
  const week = displayPlanningWeek(weekKey);
  const scheduleDay = week.days.find((day) => day.id === state.selectedScheduleDay) || week.days[0];
  const scheduleDayEnabled = scheduleDay.enabled !== false;
  const scheduleDomain = getDomain(scheduleDay.domainId) || domains()[0];
  const scheduleSlots = scheduleDayEnabled ? slotsForDay(scheduleDay, scheduleDomain.id) : [];
  const scheduleSportSlots = scheduleDayEnabled ? sportSlotsForDay(scheduleDay) : [];
  const slotsFull = !scheduleDayEnabled || scheduleSlots.length >= MAX_COURSE_SLOTS_PER_DAY;
  const sportSlotsFull = !scheduleDayEnabled || scheduleSportSlots.length >= 8;
  const scheduleDayAssignmentLocked = isProgrammingDayAssignmentLocked(weekKey, scheduleDay);
  const scheduleSummary = scheduleDayEnabled
    ? `${scheduleDay.longLabel} · ${scheduleDomain.shortTitle} · ${scheduleSlots.length} cours · ${scheduleSportSlots.length} sport`
    : `${scheduleDay.longLabel} · 0 cours · 0 sport`;
  const activeDayCount = week.days.filter((day) => day.enabled !== false).length;
  const courseSlotCount = week.days.reduce((count, day) => {
    if (day.enabled === false) return count;
    const domain = getDomain(day.domainId) || domains()[0];
    return count + slotsForDay(day, domain.id).length;
  }, 0);
  const subjectBadgeClass = scheduleDayEnabled ? `accent-${scheduleDomain.accent}` : "schedule-subject-empty";
  const domainOptions = domains()
    .map((domain) => `<option value="${domain.id}">${escapeHtml(domain.title)}</option>`)
    .join("");
  const templateOptions = state.customTemplates
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)} · ${escapeHtml(templateSummary(template))}</option>`)
    .join("");

  container.innerHTML = `
    <section class="programming-card">
      <div class="programming-head">
        <div>
          <span>Programmation</span>
          <h2>Semaine ${escapeHtml(weekKey)}</h2>
        </div>
        <div class="programming-head-badges">
          <strong class="current-week-badge">Aujourd'hui : semaine ${escapeHtml(realWeekKey)}</strong>
        </div>
      </div>
      <div class="week-editor-tabs">
        ${["A", "B"]
          .map((key) => {
            const statusLabel = weekEditorStatusLabel(key);
            return `<button class="week-editor-tab${key === weekKey ? " active-week-editor" : ""}${key === realWeekKey ? " current-week-editor" : ""}" type="button" data-programming-week="${key}">
              <span>Semaine ${key}</span>
              ${statusLabel ? `<small>${escapeHtml(statusLabel)}</small>` : ""}
            </button>`;
          })
          .join("")}
      </div>
      <div class="occurrence-editor-tabs" aria-label="Occurrence de semaine a modifier">
        ${occurrenceOptions
          .map((option) => `<button class="occurrence-editor-tab${option.id === occurrence.id ? " active-occurrence-editor" : ""}${isSameDay(option.start, getPlanningWeekStart()) ? " current-occurrence-editor" : ""}" type="button" data-programming-occurrence="${option.id}">
            <span>${escapeHtml(option.label)}</span>
            <small>Semaine ${escapeHtml(weekKey)} · ${escapeHtml(weekRangeShortLabel(option.start))}</small>
          </button>`)
          .join("")}
      </div>
      <div class="template-apply-panel">
        <button class="template-save-current" type="button" data-save-week-template>Enregistrer comme modele</button>
        <label class="template-select-field">
          <span>Appliquer un modele</span>
          <select data-apply-template-select ${state.customTemplates.length ? "" : "disabled"}>
            <option value="">Choisir un modele</option>
            ${templateOptions}
          </select>
        </label>
        <button class="template-apply-button" type="button" data-apply-template ${state.customTemplates.length ? "" : "disabled"}>Appliquer</button>
      </div>
    </section>

    <details class="programming-card programming-collapse-card" data-programming-subjects ${state.programmingSubjectsOpen ? "open" : ""}>
      <summary class="programming-section-head programming-collapse-summary">
        <div>
          <h3>Matieres</h3>
          <small>${activeDayCount}/7 jours actifs · ${courseSlotCount} cours</small>
        </div>
        <span>${escapeHtml(week.label)}</span>
      </summary>
      <div class="day-editor-list">
        ${week.days
          .map((day) => {
            const domain = getDomain(day.domainId) || domains()[0];
            const enabled = day.enabled !== false;
            const dayAssignmentLocked = isProgrammingDayAssignmentLocked(weekKey, day);
            const courseCount = enabled ? slotsForDay(day, domain.id).length : 0;
            const sportCount = enabled ? sportSlotsForDay(day).length : 0;
            const summary = enabled
              ? `${courseCount} cours${sportCount ? ` - ${sportCount} sport` : ""}`
              : "0 cours";
            return `
              <article class="day-editor-row accent-${domain?.accent || "maths"}${enabled ? "" : " day-disabled"}${dayAssignmentLocked ? " day-locked" : ""}">
                <label class="day-toggle">
                  <input type="checkbox" data-planning-day-enabled="${day.id}" ${enabled ? "checked" : ""} ${dayAssignmentLocked ? "disabled" : ""}>
                  <span class="day-switch" aria-hidden="true"></span>
                  <span class="day-toggle-text">${enabled ? "Avec cours" : "Sans cours"}</span>
                </label>
                <div class="day-editor-main">
                  <div class="day-editor-title">
                    <span class="day-dot" aria-hidden="true"></span>
                    <strong>${escapeHtml(day.longLabel)}</strong>
                    <small>${escapeHtml(summary)}</small>
                  </div>
                  <label class="day-subject-field">
                    <span>Matiere</span>
                  <select data-planning-day-domain="${day.id}" ${day.enabled === false || dayAssignmentLocked ? "disabled" : ""}>
                    ${domainOptions.replace(`value="${day.domainId}"`, `value="${day.domainId}" selected`)}
                  </select>
                  </label>
                  ${dayAssignmentLocked ? '<p class="day-disabled-note">Jour deja commence : attribution verrouillee.</p>' : enabled ? "" : '<p class="day-disabled-note">Reactive ce jour pour retrouver la matiere et les horaires.</p>'}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </details>

    <section class="programming-card">
      <div class="programming-section-head">
        <h3>Horaires</h3>
        <span>${escapeHtml(scheduleSummary)}</span>
      </div>
      <div class="schedule-day-tabs" aria-label="Jour a modifier">
        ${week.days
          .map((day) => {
            const dayDomain = getDomain(day.domainId) || domains()[0];
            const dayEnabled = day.enabled !== false;
            return `<button class="schedule-day-tab ${dayEnabled ? `accent-${dayDomain.accent}` : "schedule-day-tab-empty"}${day.id === scheduleDay.id ? " active-schedule-day" : ""}" type="button" data-schedule-day="${day.id}">
              <span>${escapeHtml(day.label)}</span>
              <small>${dayEnabled ? escapeHtml(dayDomain.shortTitle || "") : ""}</small>
            </button>`;
          })
          .join("")}
      </div>
      <div class="schedule-subject-badge ${subjectBadgeClass}" aria-label="Matiere attribuee au jour">
        <span>${scheduleDayEnabled ? "Matiere du jour" : "Jour sans cours"}</span>
        <strong>${scheduleDayEnabled ? escapeHtml(scheduleDomain.title) : escapeHtml(scheduleDay.longLabel)}</strong>
        <small>${scheduleDayAssignmentLocked ? "Ce jour contient deja un horaire commence : la matiere reste verrouillee." : scheduleDayEnabled ? `Pour modifier une autre matiere, change d'abord l'attribution de ${escapeHtml(scheduleDay.longLabel)}.` : "Reactive ce jour dans Matieres pour afficher des cours dans le planning."}</small>
      </div>
      <div class="slot-editor-list">
        ${scheduleSlots
          .map((slot) => {
            const period = slotPeriodMeta(slot);
            const existingConflict = slotConflict(scheduleSlots, slot, slot.id);
            const lockInfo = programmingSlotLockInfo(weekKey, scheduleDay.id, slot);
            const slotLocked = lockInfo.locked;
            const canEditEnd = !slotLocked || lockInfo.canEditEnd;
            const noticeForSlot = state.scheduleNotice?.slotId === slot.id ? state.scheduleNotice.message : "";
            const conflictMessage = noticeForSlot || (existingConflict ? `Conflit avec ${existingConflict.label || "un autre cours"} (${existingConflict.start}-${existingConflict.end}).` : "");
            return `
              <article class="slot-editor-row ${period.className}${conflictMessage ? " slot-conflict-row" : ""}${slotLocked ? " slot-locked-row" : ""}">
                <div class="slot-editor-header">
                  <span class="slot-period-badge">${escapeHtml(period.label)}</span>
                  <input type="text" value="${escapeHtml(slot.label)}" aria-label="Nom du creneau" data-slot-label="${slot.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" ${slotLocked ? "disabled" : ""}>
                  <button class="slot-delete-icon" type="button" data-slot-delete="${slot.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" aria-label="Supprimer ce creneau" ${slotLocked ? "disabled" : ""}>×</button>
                </div>
                <div class="slot-editor-body">
                  <div class="slot-times-row">
                    <label class="slot-field">
                      <span>Debut</span>
                      <input type="time" value="${escapeHtml(slot.start)}" aria-label="Debut" data-slot-start="${slot.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" ${slotLocked ? "disabled" : ""}>
                    </label>
                    <label class="slot-field">
                      <span>Fin</span>
                      <input type="time" value="${escapeHtml(slot.end)}" aria-label="Fin" data-slot-end="${slot.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" ${canEditEnd ? "" : "disabled"}>
                    </label>
                  </div>
                  <label class="slot-field">
                    <span>Mode rapide</span>
                    <select data-slot-preset="${slot.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" aria-label="Mode rapide pour ${escapeHtml(slot.label)}" ${slotLocked ? "disabled" : ""}>
                      <option value="">Choisir un horaire</option>
                      ${SLOT_PRESETS.map((preset) => {
                        const candidate = { ...slot, label: courseSlotDefaultLabel(preset), start: preset.start, end: preset.end };
                        const timeLocked = !isFutureProgrammingSlot(weekKey, scheduleDay.id, candidate);
                        const conflict = !canPlaceCourseSlot(scheduleSlots, candidate, slot.id);
                        const disabled = timeLocked || conflict;
                        const reason = timeLocked ? " · passé" : conflict ? " · conflit" : "";
                        return `<option value="${preset.id}" ${disabled ? "disabled" : ""}>${escapeHtml(preset.label)} · ${escapeHtml(preset.start)}-${escapeHtml(preset.end)}${reason}</option>`;
                      }).join("")}
                    </select>
                  </label>
                  ${lockInfo.message ? `<p class="slot-lock-note">${escapeHtml(lockInfo.message)}</p>` : ""}
                  ${conflictMessage ? `<p class="slot-conflict-note">${escapeHtml(conflictMessage)}</p>` : ""}
                </div>
              </article>
            `;
          })
          .join("") || `<p class="slot-empty-note">Aucun cours pour ${escapeHtml(scheduleDay.longLabel)}.</p>`}
        ${state.scheduleNotice?.slotId === null ? `<p class="slot-conflict-note">${escapeHtml(state.scheduleNotice.message)}</p>` : ""}
      </div>
      <div class="slot-add-grid">
        ${SLOT_PRESETS.map((preset) => {
          const conflict = slotConflict(scheduleSlots, preset);
          const timeLocked = !isFutureProgrammingSlot(weekKey, scheduleDay.id, preset);
          const disabled = slotsFull || Boolean(conflict) || timeLocked;
          const title = slotsFull
            ? scheduleDayEnabled ? "Maximum 4 cours" : "Jour sans cours"
            : timeLocked ? "Horaire deja commence"
            : conflict ? `Conflit avec ${conflict.label || "un autre cours"} (${conflict.start}-${conflict.end})` : "";
          return `<button class="slot-add-button" type="button" data-add-slot-preset="${preset.id}" data-slot-week="${weekKey}" data-slot-day="${scheduleDay.id}" data-slot-domain="${scheduleDomain.id}" ${disabled ? "disabled" : ""} ${title ? `title="${escapeHtml(title)}"` : ""}>+ ${escapeHtml(preset.label)}</button>`;
        }).join("")}
      </div>
      <div class="schedule-subject-badge sport-schedule-badge" aria-label="Sport du jour">
        <span>Sport du jour</span>
        <strong>${scheduleSportSlots.length ? `${scheduleSportSlots.length} creneau${scheduleSportSlots.length > 1 ? "x" : ""}` : "Aucun sport place"}</strong>
        <small>${scheduleDayEnabled ? `Ces horaires appartiennent au jour selectionne, pas a la matiere ${escapeHtml(scheduleDomain.shortTitle)}.` : "Reactive ce jour dans Matieres pour placer du sport."}</small>
      </div>
      <div class="slot-editor-list">
        ${scheduleSportSlots.length
          ? scheduleSportSlots
              .map((slot) => {
                const lockInfo = programmingSlotLockInfo(weekKey, scheduleDay.id, slot);
                const slotLocked = lockInfo.locked;
                const canEditEnd = !slotLocked || lockInfo.canEditEnd;
                return `
                  <article class="slot-editor-row sport-slot-editor-row slot-period-sport${slotLocked ? " slot-locked-row" : ""}">
                    <div class="slot-editor-header">
                      <span class="slot-period-badge">Sport</span>
                      <input type="text" value="${escapeHtml(slot.label)}" aria-label="Nom du sport" data-sport-label="${slot.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" ${slotLocked ? "disabled" : ""}>
                      <button class="slot-delete-icon" type="button" data-sport-delete="${slot.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" aria-label="Supprimer ce sport" ${slotLocked ? "disabled" : ""}>×</button>
                    </div>
                    <div class="slot-editor-body">
                      <div class="slot-times-row">
                        <label class="slot-field">
                          <span>Debut</span>
                          <input type="time" value="${escapeHtml(slot.start)}" aria-label="Debut sport" data-sport-start="${slot.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" ${slotLocked ? "disabled" : ""}>
                        </label>
                        <label class="slot-field">
                          <span>Fin</span>
                          <input type="time" value="${escapeHtml(slot.end)}" aria-label="Fin sport" data-sport-end="${slot.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" ${canEditEnd ? "" : "disabled"}>
                        </label>
                      </div>
                      <label class="slot-field">
                        <span>Mode rapide</span>
                        <select data-sport-preset="${slot.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" aria-label="Mode rapide pour ${escapeHtml(slot.label)}" ${slotLocked ? "disabled" : ""}>
                          <option value="">Choisir un horaire sport</option>
                          ${SPORT_PRESETS.map((preset) => {
                            const timeLocked = !isFutureProgrammingSlot(weekKey, scheduleDay.id, preset);
                            return `<option value="${preset.id}" ${timeLocked ? "disabled" : ""}>${escapeHtml(preset.label)} · ${escapeHtml(preset.start)}-${escapeHtml(preset.end)}${timeLocked ? " · passé" : ""}</option>`;
                          }).join("")}
                        </select>
                      </label>
                      ${lockInfo.message ? `<p class="slot-lock-note">${escapeHtml(lockInfo.message)}</p>` : ""}
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<p class="sport-empty-note">Aucun horaire de sport pour ${escapeHtml(scheduleDay.longLabel)}.</p>`}
      </div>
      <div class="slot-add-grid">
        ${SPORT_PRESETS.map((preset) => {
          const timeLocked = !isFutureProgrammingSlot(weekKey, scheduleDay.id, preset);
          const disabled = sportSlotsFull || timeLocked;
          const title = sportSlotsFull
            ? scheduleDayEnabled ? "Maximum 8 sports" : "Jour sans cours"
            : timeLocked ? "Horaire deja commence" : "";
          return `<button class="slot-add-button sport-add-button" type="button" data-add-sport-preset="${preset.id}" data-sport-week="${weekKey}" data-sport-day="${scheduleDay.id}" ${disabled ? "disabled" : ""} ${title ? `title="${escapeHtml(title)}"` : ""}>+ ${escapeHtml(preset.label)}</button>`;
        }).join("")}
      </div>
      <div class="programming-actions">
        <button class="programming-action-button secondary-action" type="button" data-reset-planning>Defaut</button>
      </div>
    </section>
  `;

  attachProgrammingHandlers(container);
}

function attachProgrammingHandlers(root) {
  root.querySelectorAll("[data-programming-week]").forEach((button) => {
    button.addEventListener("click", () => selectProgrammingWeek(button.dataset.programmingWeek));
  });

  root.querySelectorAll("[data-programming-occurrence]").forEach((button) => {
    button.addEventListener("click", () => selectProgrammingOccurrence(button.dataset.programmingOccurrence));
  });

  root.querySelectorAll("[data-schedule-day]").forEach((button) => {
    button.addEventListener("click", () => selectScheduleDay(button.dataset.scheduleDay));
  });

  root.querySelector("[data-save-week-template]")?.addEventListener("click", saveTemplateFromSelectedWeek);

  root.querySelector("[data-apply-template]")?.addEventListener("click", () => {
    const select = root.querySelector("[data-apply-template-select]");
    if (!select?.value) {
      alert("Choisis d'abord un modèle.");
      return;
    }
    applyTemplateToSelectedWeek(select.value);
  });

  const subjectsDetails = root.querySelector("[data-programming-subjects]");
  if (subjectsDetails) {
    subjectsDetails.addEventListener("toggle", () => {
      state.programmingSubjectsOpen = subjectsDetails.open;
      saveSettings();
    });
  }

  root.querySelectorAll("[data-planning-day-enabled]").forEach((input) => {
    input.addEventListener("change", () => {
      updatePlanningDay(state.selectedProgrammingWeek, input.dataset.planningDayEnabled, { enabled: input.checked });
    });
  });

  root.querySelectorAll("[data-planning-day-domain]").forEach((select) => {
    select.addEventListener("change", () => {
      updatePlanningDay(state.selectedProgrammingWeek, select.dataset.planningDayDomain, { domainId: select.value });
    });
  });

  root.querySelectorAll("[data-slot-label]").forEach((input) => {
    input.addEventListener("change", () => {
      updatePlanningSlot(input.dataset.slotWeek, input.dataset.slotDay, input.dataset.slotDomain, input.dataset.slotLabel, { label: input.value.trim() || "Creneau" });
    });
  });

  root.querySelectorAll("[data-slot-start]").forEach((input) => {
    input.addEventListener("change", () => {
      updatePlanningSlot(input.dataset.slotWeek, input.dataset.slotDay, input.dataset.slotDomain, input.dataset.slotStart, { start: input.value });
    });
  });

  root.querySelectorAll("[data-slot-end]").forEach((input) => {
    input.addEventListener("change", () => {
      updatePlanningSlot(input.dataset.slotWeek, input.dataset.slotDay, input.dataset.slotDomain, input.dataset.slotEnd, { end: input.value });
    });
  });

  root.querySelectorAll("[data-slot-delete]").forEach((button) => {
    button.addEventListener("click", () => removePlanningSlot(button.dataset.slotWeek, button.dataset.slotDay, button.dataset.slotDomain, button.dataset.slotDelete));
  });

  root.querySelectorAll("[data-slot-preset]").forEach((select) => {
    select.addEventListener("change", () => {
      applyPlanningSlotPreset(select.dataset.slotWeek, select.dataset.slotDay, select.dataset.slotDomain, select.dataset.slotPreset, select.value);
    });
  });

  root.querySelectorAll("[data-add-slot-preset]").forEach((button) => {
    button.addEventListener("click", () => addPlanningSlot(button.dataset.slotWeek, button.dataset.slotDay, button.dataset.slotDomain, button.dataset.addSlotPreset));
  });

  root.querySelectorAll("[data-sport-label]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSportSlot(input.dataset.sportWeek, input.dataset.sportDay, input.dataset.sportLabel, { label: input.value.trim() || "Sport" });
    });
  });

  root.querySelectorAll("[data-sport-start]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSportSlot(input.dataset.sportWeek, input.dataset.sportDay, input.dataset.sportStart, { start: input.value });
    });
  });

  root.querySelectorAll("[data-sport-end]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSportSlot(input.dataset.sportWeek, input.dataset.sportDay, input.dataset.sportEnd, { end: input.value });
    });
  });

  root.querySelectorAll("[data-sport-delete]").forEach((button) => {
    button.addEventListener("click", () => removeSportSlot(button.dataset.sportWeek, button.dataset.sportDay, button.dataset.sportDelete));
  });

  root.querySelectorAll("[data-sport-preset]").forEach((select) => {
    select.addEventListener("change", () => {
      applySportSlotPreset(select.dataset.sportWeek, select.dataset.sportDay, select.dataset.sportPreset, select.value);
    });
  });

  root.querySelectorAll("[data-add-sport-preset]").forEach((button) => {
    button.addEventListener("click", () => addSportSlot(button.dataset.sportWeek, button.dataset.sportDay, button.dataset.addSportPreset));
  });

  root.querySelector("[data-reset-planning]")?.addEventListener("click", resetPlanning);
}

function renderTemplates() {
  const container = document.getElementById("templatesContent");
  if (!container) return;
  const templates = normalizeCustomTemplates(state.customTemplates);
  state.customTemplates = templates;

  container.innerHTML = `
    <section class="templates-card">
      <div class="templates-head">
        <div>
          <span>Bibliotheque</span>
          <h2>${templates.length} modele${templates.length > 1 ? "s" : ""}</h2>
        </div>
        <button class="template-save-current" type="button" data-save-week-template>Depuis Programme</button>
      </div>
      ${templates.length
        ? `<div class="template-list">
            ${templates.map((template) => renderTemplateCard(template)).join("")}
          </div>`
        : `<div class="templates-empty">
            <strong>Aucun modele pour l'instant.</strong>
            <span>Va dans Programme, règle ta semaine, puis enregistre-la comme modele.</span>
          </div>`}
    </section>
  `;
  attachTemplateHandlers(container);
}

function renderTemplateCard(template) {
  const stats = templateStats(template);
  const activeDays = (template.week.days || []).filter((day) => day.enabled !== false);
  const domainCounts = domains().map((domain) => {
    const count = activeDays.filter((day) => day.domainId === domain.id).length;
    return { domain, count };
  }).filter((entry) => entry.count > 0);
  return `
    <article class="template-card">
      <div class="template-card-head">
        <div>
          <span>Modele</span>
          <strong>${escapeHtml(template.name)}</strong>
          <small>${escapeHtml(templateSummary(template))}</small>
        </div>
        <button class="template-delete-button" type="button" data-delete-template="${escapeHtml(template.id)}" aria-label="Supprimer ${escapeHtml(template.name)}">×</button>
      </div>
      <div class="template-domain-row">
        ${domainCounts.length
          ? domainCounts.map(({ domain, count }) => `<span class="accent-${domain.accent}">${escapeHtml(domain.shortTitle)} ${count}j</span>`).join("")
          : `<span>Aucun jour actif</span>`}
      </div>
      <div class="template-week-preview">
        ${(template.week.days || []).map((day) => {
          const domain = getDomain(day.domainId) || domains()[0];
          const enabled = day.enabled !== false;
          return `
            <span class="${enabled ? `accent-${domain.accent}` : "template-day-off"}">
              <strong>${escapeHtml(day.label)}</strong>
              <small>${enabled ? escapeHtml(domain.shortTitle) : "Off"}</small>
            </span>
          `;
        }).join("")}
      </div>
      <button class="template-apply-full" type="button" data-apply-template-id="${escapeHtml(template.id)}">
        Appliquer a la semaine selectionnee
      </button>
    </article>
  `;
}

function attachTemplateHandlers(root) {
  root.querySelector("[data-save-week-template]")?.addEventListener("click", saveTemplateFromSelectedWeek);
  root.querySelectorAll("[data-delete-template]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomTemplate(button.dataset.deleteTemplate));
  });
  root.querySelectorAll("[data-apply-template-id]").forEach((button) => {
    button.addEventListener("click", () => applyTemplateToSelectedWeek(button.dataset.applyTemplateId));
  });
}

// Activity helpers.

function activityForSession(sessionId) {
  return state.activity.find((e) => e.sessionId === sessionId) || null;
}

function canToggleActivityForSession(day, session, existing = null, now = new Date()) {
  if (!day?.date || !session) return false;
  if (existing) return true;
  return sessionDateRange(day, session).endsAt <= now;
}

function sessionMinutes(session) {
  const { start, end } = slotTimeRange(session);
  return Math.max(0, end - start);
}

function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}

function toggleActivity(session, day) {
  const existing = activityForSession(session.id);
  if (!canToggleActivityForSession(day, session, existing)) return;
  const topicId = session.topic?.id || "";
  const domainId = day.domain?.id || "";
  const title = session.topic?.title || "Séance travaillée";
  if (existing) {
    state.activity = state.activity.filter((e) => e.sessionId !== session.id);
    recordHistory("activity_removed", {
      topicId,
      domainId,
      title,
      meta: {
        minutes: existing.minutes || sessionMinutes(session),
      },
    });
  } else {
    const mins = sessionMinutes(session);
    const now = new Date().toISOString();
    state.activity.push({
      id: `act-${Date.now()}`,
      sessionId: session.id,
      dateKey: dateId(day.date),
      domainId,
      topicId,
      minutes: mins,
      start: session.start,
      end: session.end,
      createdAt: now,
    });
    recordHistory("activity", {
      topicId,
      domainId,
      title,
      createdAt: now,
      meta: {
        minutes: mins,
        start: session.start,
        end: session.end,
      },
    });
  }
  saveProgress();
  renderCalendar();
}

function weekActivityStats() {
  const weekStart = currentWeekStart();
  const weekEntries = state.activity.filter((e) => {
    if (!e.dateKey) return false;
    const d = parseLocalDate(e.dateKey);
    return !Number.isNaN(d.getTime()) && d >= weekStart;
  });
  const minutes = weekEntries.reduce((acc, e) => acc + (e.minutes || 0), 0);
  return { count: weekEntries.length, minutes };
}

function totalActivityMinutes() {
  return state.activity.reduce((acc, e) => acc + (e.minutes || 0), 0);
}

// Progress dashboard.

const MS_14D = 14 * MS_PER_DAY;
const MS_21D = 21 * MS_PER_DAY;

function currentWeekStart() {
  return mondayOfWeek(startOfDay(new Date()));
}

function completedInWindow(ms) {
  const cutoff = Date.now() - ms;
  return completedTopics().filter((t) => new Date(t.completedAt).getTime() >= cutoff);
}

function sumHours(topics) {
  return topics.reduce((acc, t) => acc + (t.hours || 0), 0);
}

function completedThisWeek() {
  const weekStart = currentWeekStart();
  return completedTopics().filter((t) => new Date(t.completedAt) >= weekStart);
}

function isDateInRange(date, start, end) {
  return date >= start && date < end;
}

function periodActivityStats(start, end) {
  const activeDays = new Set();
  const entries = state.activity.filter((entry) => {
    if (!entry.dateKey) return false;
    const date = parseLocalDate(entry.dateKey);
    if (Number.isNaN(date.getTime()) || !isDateInRange(date, start, end)) return false;
    activeDays.add(entry.dateKey);
    return true;
  });
  const minutes = entries.reduce((acc, entry) => acc + (entry.minutes || 0), 0);
  return { entries, minutes, activeDays: activeDays.size };
}

function periodCompletionStats(start, end) {
  const topics = completedTopics().filter((topic) => {
    const date = new Date(topic.completedAt);
    return !Number.isNaN(date.getTime()) && isDateInRange(date, start, end);
  });
  return { topics, count: topics.length, hours: sumHours(topics) };
}

function trendWindowStats() {
  const today = startOfDay(new Date());
  const currentStart = addDays(today, -29);
  const currentEnd = addDays(today, 1);
  const previousStart = addDays(currentStart, -30);
  const previousEnd = currentStart;
  const currentActivity = periodActivityStats(currentStart, currentEnd);
  const previousActivity = periodActivityStats(previousStart, previousEnd);
  const currentCompletion = periodCompletionStats(currentStart, currentEnd);
  const previousCompletion = periodCompletionStats(previousStart, previousEnd);

  return {
    current: {
      chapters: currentCompletion.count,
      minutes: currentActivity.minutes,
      activeDays: currentActivity.activeDays,
    },
    previous: {
      chapters: previousCompletion.count,
      minutes: previousActivity.minutes,
      activeDays: previousActivity.activeDays,
    },
  };
}

function recentDomainEffortStats() {
  const today = startOfDay(new Date());
  const start = addDays(today, -13);
  const end = addDays(today, 1);
  const recentActivity = state.activity.filter((entry) => {
    if (!entry.dateKey) return false;
    const date = parseLocalDate(entry.dateKey);
    return !Number.isNaN(date.getTime()) && isDateInRange(date, start, end);
  });
  const recentCompleted = completedTopics().filter((topic) => {
    const date = new Date(topic.completedAt);
    return !Number.isNaN(date.getTime()) && isDateInRange(date, start, end);
  });

  const rows = domains().map((domain) => {
    const activity = recentActivity.filter((entry) => entry.domainId === domain.id);
    const chapters = recentCompleted.filter((topic) => topic.domainId === domain.id);
    return {
      domain,
      sessions: activity.length,
      minutes: activity.reduce((acc, entry) => acc + (entry.minutes || 0), 0),
      chapters: chapters.length,
    };
  });
  const totalMinutes = rows.reduce((acc, row) => acc + row.minutes, 0);
  const totalChapters = rows.reduce((acc, row) => acc + row.chapters, 0);
  return { rows, totalMinutes, totalChapters };
}

function recentWeeklyPace() {
  const count = completedInWindow(MS_14D).length;
  return count / 2;
}

function paceLabel(pace) {
  if (pace <= 0) return "aucun chapitre ces 14 derniers jours";
  const n = pace.toFixed(1).replace(/\.0$/, "");
  return `${n} chapitre${pace >= 2 ? "s" : ""} / semaine`;
}

function blockForecast(domainId) {
  const current = currentBlockForDomain(domainId);
  if (!current || current.complete) return null;

  const remaining = current.topics.filter((t) => getStatus(t.id) !== "done");
  const remainingHours = sumHours(remaining);
  const pace = recentWeeklyPace();

  if (pace <= 0) {
    return { remaining: remaining.length, remainingHours, weeksLeft: null, estimatedEnd: null };
  }

  const weeksLeft = remaining.length / pace;
  const estimatedEnd = addDays(new Date(), Math.round(weeksLeft * 7));
  return { remaining: remaining.length, remainingHours, weeksLeft, estimatedEnd };
}

function heatmapData() {
  const today = startOfDay(new Date());
  const days = [];
  const dayMap = new Map();

  function dayEntry(key, date = parseLocalDate(key)) {
    if (!dayMap.has(key)) {
      dayMap.set(key, {
        dateKey: key,
        date,
        actions: [],
        minutes: 0,
        sessions: 0,
        domainMinutes: {},
        domainActions: {},
      });
    }
    return dayMap.get(key);
  }

  function addDomainSignal(entry, domainId, minutes = 0) {
    if (!domainId) return;
    entry.domainActions[domainId] = (entry.domainActions[domainId] || 0) + 1;
    entry.domainMinutes[domainId] = (entry.domainMinutes[domainId] || 0) + Math.max(0, minutes || 0);
  }

  function addAction(key, action) {
    const d = parseLocalDate(key);
    if (Number.isNaN(d.getTime())) return;
    if (Date.now() - d.getTime() > MS_21D) return;
    const entry = dayEntry(key, d);
    entry.actions.push(action);
    if (action.type === "activity") {
      entry.sessions += 1;
      entry.minutes += action.minutes || 0;
    }
    addDomainSignal(entry, action.domainId, action.type === "activity" ? action.minutes || 0 : 0);
  }

  state.activity.forEach((e) => {
    if (!e.dateKey) return;
    const topic = e.topicId ? getTopic(e.topicId) : null;
    const domainId = e.domainId || topic?.domainId || "";
    addAction(e.dateKey, {
      type: "activity",
      label: "Séance travaillée",
      title: topic?.title || "Séance travaillée",
      domainId,
      minutes: e.minutes || 0,
      meta: e.start && e.end ? `${e.start}-${e.end}` : formatMinutes(e.minutes || 0),
    });
  });

  completedTopics().forEach((t) => {
    const key = dateId(startOfDay(new Date(t.completedAt)));
    addAction(key, {
      type: "done",
      label: "Chapitre terminé",
      title: t.title,
      domainId: t.domainId,
      minutes: 0,
      meta: t.domainShortTitle || "Chapitre",
    });
  });

  Object.entries(state.progress).forEach(([topicId, entry]) => {
    if (!entry || entry.status === "done") return;
    const ts = entry.updatedAt;
    if (!ts) return;
    const d = startOfDay(new Date(ts));
    if (Date.now() - d.getTime() > MS_21D) return;
    const key = dateId(d);
    const topic = getTopic(topicId);
    addAction(key, {
      type: "status",
      label: statusLabels[entry.status] || "Statut modifié",
      title: topic?.title || "Action notée",
      domainId: topic?.domainId || "",
      minutes: 0,
      meta: topic?.domainShortTitle || "Progression",
    });
  });

  for (let i = 20; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = dateId(d);
    const entry = dayEntry(key, d);
    const count = entry.actions.length;
    const level = entry.minutes >= 120 ? 4 : entry.minutes >= 60 ? 3 : entry.minutes > 0 ? 2 : count > 0 ? 1 : 0;
    const dominantDomainId = Object.keys(entry.domainActions).sort((a, b) => {
      const minuteDiff = (entry.domainMinutes[b] || 0) - (entry.domainMinutes[a] || 0);
      if (minuteDiff) return minuteDiff;
      return (entry.domainActions[b] || 0) - (entry.domainActions[a] || 0);
    })[0] || "";
    const dominantDomain = dominantDomainId ? getDomain(dominantDomainId) : null;
    days.push({
      ...entry,
      count,
      level,
      dominantDomainId,
      accent: dominantDomain?.accent || "neutral",
    });
  }
  return days;
}

function regularityStats(days) {
  const activeFlags = days.map((day) => day.count > 0);
  const activeDays = activeFlags.filter(Boolean).length;
  let currentStreak = 0;
  for (let i = activeFlags.length - 1; i >= 0; i--) {
    if (!activeFlags[i]) break;
    currentStreak++;
  }

  let bestStreak = 0;
  let running = 0;
  activeFlags.forEach((isActive) => {
    running = isActive ? running + 1 : 0;
    bestStreak = Math.max(bestStreak, running);
  });

  const lastActive = [...days].reverse().find((day) => day.count > 0) || null;
  const totalActions = days.reduce((acc, day) => acc + day.count, 0);
  return { activeDays, currentStreak, bestStreak, lastActive, totalActions };
}

function parseSavedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reviewIntervalForMastery(mastery) {
  return REVIEW_INTERVAL_DAYS[normalizeMastery(mastery)] || REVIEW_INTERVAL_DAYS[0];
}

function reviewInfo(topic) {
  const entry = state.progress[topic.id] || {};
  const mastery = getMastery(topic.id);
  const lastReviewed = parseSavedDate(entry.lastReviewedAt);
  const baseDate =
    lastReviewed ||
    parseSavedDate(entry.updatedAt) ||
    parseSavedDate(entry.completedAt) ||
    startOfDay(new Date());
  const dueDate = addDays(startOfDay(baseDate), reviewIntervalForMastery(mastery));
  const today = startOfDay(new Date());
  const daysUntilDue = Math.round((dueDate - today) / MS_PER_DAY);
  const isOverdue = daysUntilDue < 0;
  const dueLabel = isOverdue
    ? "En retard"
    : daysUntilDue === 0
      ? "Aujourd'hui"
      : daysUntilDue === 1
        ? "Demain"
        : `Dans ${daysUntilDue} j`;
  const lastReviewedDays = lastReviewed ? Math.round((today - startOfDay(lastReviewed)) / MS_PER_DAY) : null;

  return {
    lastReviewed,
    lastReviewedDays,
    dueDate,
    daysUntilDue,
    dueLabel,
    isOverdue,
    reviewCount: Number.isFinite(Number(entry.reviewCount)) ? Number(entry.reviewCount) : 0,
  };
}

function reviewQueue() {
  return allTopics()
    .filter((t) => getStatus(t.id) === "review")
    .map((t) => {
      const info = reviewInfo(t);
      return {
        ...t,
        updatedAt: state.progress[t.id]?.updatedAt || "",
        mastery: getMastery(t.id),
        review: info,
      };
    })
    .sort((a, b) => {
      if (a.review.isOverdue !== b.review.isOverdue) return a.review.isOverdue ? -1 : 1;
      const pa = a.priority || 5;
      const pb = b.priority || 5;
      if (pa !== pb) return pa - pb;
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      return a.review.dueDate - b.review.dueDate;
    });
}

function reviewQueueSummary(reviewList) {
  const total = reviewList.length;
  const overdue = reviewList.filter((t) => t.review.isOverdue).length;
  const reviewedRecent = reviewList.filter((t) => {
    const days = t.review.lastReviewedDays;
    return days !== null && days >= 0 && days <= 7;
  }).length;
  return { total, overdue, reviewedRecent };
}

function dashboardStats() {
  const all = allTopics();
  const done = all.filter((t) => getStatus(t.id) === "done");

  const byDomain = domains().map((domain) => {
    const domainTopics = all.filter((t) => t.domainId === domain.id);
    const domainDone = domainTopics.filter((t) => getStatus(t.id) === "done");
    const total = domainTopics.length;
    const doneCount = domainDone.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const doneHours = sumHours(domainDone);
    return { domain, total, doneCount, pct, doneHours };
  });

  return {
    totalDone: done.length,
    totalHours: sumHours(done),
    byDomain,
  };
}

function nextPriorityTopicForGoal(domainId, excludedTopicIds = new Set()) {
  const current = currentBlockForDomain(domainId);
  if (!current || current.complete) return null;
  return (
    current.topics.find((topic) => {
      const status = getStatus(topic.id);
      return status !== "done" && status !== "review" && !excludedTopicIds.has(topic.id);
    }) ||
    current.topics.find((topic) => getStatus(topic.id) !== "done" && !excludedTopicIds.has(topic.id)) ||
    null
  );
}

function progressTodoItems() {
  return domains().map((domain) => {
    const current = currentBlockForDomain(domain.id);
    const topic = currentTopicForDomain(domain.id);

    if (!topic || current?.complete) {
      return {
        type: domain.title,
        title: "Programme terminé",
        meta: "Aucun chapitre à faire",
        accent: domain.accent,
      };
    }

    return {
      type: domain.title,
      title: topic.title,
      meta: current?.block?.title || "Chapitre à faire",
      accent: domain.accent,
    };
  });
}

function renderDashboard() {
  const completed = completedTopics();
  const thisWeek = completedThisWeek();
  const stats = dashboardStats();
  const pace = recentWeeklyPace();
  const selectedDomain = getDomain(state.selectedDomainId) || domains()[0];
  const forecast = selectedDomain ? blockForecast(selectedDomain.id) : null;
  const heatmap = heatmapData();
  const reviewList = reviewQueue();
  const todoItems = progressTodoItems();

  return `
    <section class="stats-card dashboard-card">
      ${renderDashboardSummary(thisWeek, stats, completed)}
      ${renderPrioritySection(todoItems)}
      ${renderTrendSection()}
      ${renderHeatmap(heatmap)}
      ${renderReviewQueue(reviewList)}
      ${renderDashboardDetails({ stats, pace, forecast, selectedDomain, completed })}
    </section>
  `;
}

function renderDashboardDetails({ stats, pace, forecast, selectedDomain, completed }) {
  return `
    <details class="db-details">
      <summary>Voir les details</summary>
      <div class="db-details-body">
        ${renderDomainComparison(stats)}
        ${renderRecentDomainEffort()}
        ${renderPaceAndForecast(pace, forecast, selectedDomain)}
        ${renderCompletionChart(completed)}
      </div>
    </details>
  `;
}

function renderRecentDomainEffort() {
  const stats = recentDomainEffortStats();
  const hasData = stats.totalMinutes > 0 || stats.totalChapters > 0;
  const denominator = stats.totalMinutes || stats.totalChapters || 1;
  return `
    <div class="db-section">
      <span class="db-section-label">Effort recent par domaine (14j)</span>
      ${
        hasData
          ? `<div class="db-effort-domain-list">
              ${stats.rows
                .map((row) => {
                  const pct = Math.round(((stats.totalMinutes ? row.minutes : row.chapters) / denominator) * 100);
                  const sessionLabel = `${row.sessions} seance${row.sessions !== 1 ? "s" : ""}`;
                  const chapterLabel = `${row.chapters} chap.`;
                  return `
                    <div class="db-effort-domain-row">
                      <span class="db-effort-domain-name accent-${row.domain.accent}">${escapeHtml(row.domain.shortTitle)}</span>
                      <div class="db-effort-domain-main">
                        <div class="db-effort-domain-bar-wrap">
                          <div class="db-effort-domain-bar accent-${row.domain.accent}" style="width:${pct}%"></div>
                        </div>
                        <span>${escapeHtml(sessionLabel)} - ${escapeHtml(formatMinutes(row.minutes))} - ${escapeHtml(chapterLabel)}</span>
                      </div>
                      <strong>${pct}%</strong>
                    </div>
                  `;
                })
                .join("")}
            </div>`
          : '<p class="db-effort-domain-empty">Aucune activite recente.</p>'
      }
    </div>
  `;
}

function trendDeltaLabel(current, previous, formatter = String) {
  const delta = current - previous;
  if (delta === 0) return "stable";
  const prefix = delta > 0 ? "+" : "-";
  return `${prefix}${formatter(Math.abs(delta))}`;
}

function trendStateClass(current, previous) {
  if (current > previous) return "trend-up";
  if (current < previous) return "trend-down";
  return "trend-flat";
}

function renderTrendMetric({ label, current, previous, valueLabel, deltaFormatter = String }) {
  const stateClass = trendStateClass(current, previous);
  const delta = trendDeltaLabel(current, previous, deltaFormatter);
  return `
    <div class="db-trend-metric ${stateClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(valueLabel)}</strong>
      <em>${escapeHtml(delta)}</em>
    </div>
  `;
}

function renderTrendSection() {
  const trend = trendWindowStats();
  const hasTrendData = [
    trend.current.chapters,
    trend.previous.chapters,
    trend.current.minutes,
    trend.previous.minutes,
    trend.current.activeDays,
    trend.previous.activeDays,
  ].some((value) => value > 0);
  return `
    <div class="db-section">
      <span class="db-section-label">30 derniers jours</span>
      ${
        hasTrendData
          ? `<div class="db-trend-grid">
              ${renderTrendMetric({
                label: "Chapitres",
                current: trend.current.chapters,
                previous: trend.previous.chapters,
                valueLabel: `${trend.current.chapters}`,
              })}
              ${renderTrendMetric({
                label: "Temps",
                current: trend.current.minutes,
                previous: trend.previous.minutes,
                valueLabel: formatMinutes(trend.current.minutes),
                deltaFormatter: formatMinutes,
              })}
              ${renderTrendMetric({
                label: "Jours actifs",
                current: trend.current.activeDays,
                previous: trend.previous.activeDays,
                valueLabel: `${trend.current.activeDays}/30`,
              })}
            </div>`
          : '<p class="db-empty-note">Aucune activite enregistree sur cette periode.</p>'
      }
    </div>
  `;
}

function renderPrioritySection(items) {
  return `
    <div class="db-section">
      <span class="db-section-label">À faire</span>
      <div class="db-priority-list">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <div class="db-priority-row${item.accent ? ` accent-${escapeHtml(item.accent)}` : ""}">
                      <span class="db-priority-type${item.accent ? ` accent-${escapeHtml(item.accent)}` : ""}">${escapeHtml(item.type)}</span>
                      <span class="db-priority-title">${escapeHtml(item.title)}</span>
                      <span class="db-priority-meta">${escapeHtml(item.meta || "")}</span>
                    </div>
                  `
                )
                .join("")
            : '<p class="db-priority-empty">Tout est stable.</p>'
        }
      </div>
    </div>
  `;
}

function renderDashboardSummary(thisWeek, stats, completed) {
  const weekHours = sumHours(thisWeek);
  const weekAct = weekActivityStats();
  const totalMins = totalActivityMinutes();
  const totalActLabel = formatMinutes(totalMins);
  const weekActLabel = formatMinutes(weekAct.minutes);
  return `
    <div class="db-summary-grid">
      <div class="db-summary-block">
        <span>Semaine</span>
        <strong>${thisWeek.length} chap.</strong>
        <small>${weekAct.count} seance${weekAct.count !== 1 ? "s" : ""} - ${weekActLabel}</small>
      </div>
      <div class="db-summary-block">
        <span>Chapitres finis</span>
        <strong>${stats.totalDone} chap.</strong>
        <small>${stats.totalHours}h validees</small>
      </div>
      <div class="db-summary-block db-summary-last">
        <span>Temps travaille</span>
        <strong>${totalActLabel}</strong>
        <small>${state.activity.length} seance${state.activity.length !== 1 ? "s" : ""}</small>
      </div>
    </div>
  `;
}

function renderDomainComparison(stats) {
  if (!stats.byDomain.length) return "";
  return `
    <div class="db-section">
      <span class="db-section-label">Par domaine</span>
      <div class="db-domain-rows">
        ${stats.byDomain
          .map(
            ({ domain, doneCount, total, pct, doneHours }) => `
              <div class="db-domain-row">
                <span class="db-domain-name accent-${domain.accent}">${escapeHtml(domain.shortTitle)}</span>
                <div class="db-domain-bar-wrap">
                  <div class="db-domain-bar accent-${domain.accent}" style="width:${pct}%"></div>
                </div>
                <span class="db-domain-pct">${pct}%</span>
                <span class="db-domain-meta">${doneCount}/${total} - ${doneHours}h</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderPaceAndForecast(pace, forecast, selectedDomain) {
  const paceStr = escapeHtml(paceLabel(pace));
  const recentAct = state.activity.filter((e) => {
    const d = e.dateKey ? parseLocalDate(e.dateKey) : null;
    return d && !Number.isNaN(d.getTime()) && Date.now() - d.getTime() <= 7 * MS_PER_DAY;
  });
  const recentMins = recentAct.reduce((acc, e) => acc + (e.minutes || 0), 0);
  const effortLabel = recentAct.length > 0
    ? `${recentAct.length} seance${recentAct.length !== 1 ? "s" : ""} ces 7 derniers jours (${formatMinutes(recentMins)})`
    : "";
  let forecastHtml = "";

  if (forecast && selectedDomain) {
    if (forecast.weeksLeft === null) {
      forecastHtml = `
        <div class="db-forecast">
          <span class="db-section-label">Prevision - ${escapeHtml(selectedDomain.shortTitle)}</span>
          <p class="db-forecast-msg">${forecast.remaining} chap. restants (${forecast.remainingHours}h) - rythme insuffisant pour estimer la fin.</p>
        </div>
      `;
    } else {
      const weeksStr = forecast.weeksLeft < 1
        ? "moins d'une semaine"
        : `env. ${Math.round(forecast.weeksLeft)} semaine${forecast.weeksLeft >= 1.5 ? "s" : ""}`;
      const endLabel = escapeHtml(
        new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(forecast.estimatedEnd)
      );
      forecastHtml = `
        <div class="db-forecast">
          <span class="db-section-label">Prevision - ${escapeHtml(selectedDomain.shortTitle)}</span>
          <div class="db-forecast-grid">
            <div><span>Restants</span><strong>${forecast.remaining} chap.</strong></div>
            <div><span>Heures</span><strong>${forecast.remainingHours}h</strong></div>
            <div><span>Duree</span><strong>${weeksStr}</strong></div>
            <div><span>Fin estimee</span><strong>${endLabel}</strong></div>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="db-section">
      <span class="db-section-label">Rythme recent (14j)</span>
      <p class="db-pace">${paceStr}</p>
      ${effortLabel ? `<p class="db-effort">${escapeHtml(effortLabel)}</p>` : ""}
    </div>
    ${forecastHtml}
  `;
}

function renderHeatmap(days) {
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", day: "numeric" });
  const stats = regularityStats(days);
  const lastLabel = stats.lastActive ? monthFmt.format(stats.lastActive.date) : "Aucune";
  const selectedDay = days.find((day) => day.dateKey === state.selectedHeatmapDate) || null;
  if (!selectedDay) state.selectedHeatmapDate = null;
  return `
    <div class="db-section">
      <span class="db-section-label">Regularite</span>
      <div class="db-regularity-stats">
        <div><span>Jours actifs</span><strong>${stats.activeDays}/21</strong></div>
        <div><span>Serie</span><strong>${stats.currentStreak} j</strong></div>
        <div><span>Derniere</span><strong>${escapeHtml(lastLabel)}</strong></div>
      </div>
      <div class="db-heatmap" aria-label="Heatmap des 21 derniers jours">
        ${days
          .map(
            (d) => `
              <button class="db-heatmap-cell level-${d.level} accent-${d.accent}${d.dateKey === selectedDay?.dateKey ? " active-heatmap-cell" : ""}" type="button" data-heatmap-date="${escapeHtml(d.dateKey)}" title="${escapeHtml(heatmapTitle(d))}" aria-label="${escapeHtml(heatmapTitle(d))}"></button>
            `
          )
          .join("")}
      </div>
      ${selectedDay ? renderHeatmapDetail(selectedDay) : ""}
      <div class="db-heatmap-legend">
        <span>0m</span>
        <div class="db-heatmap-cell level-0 accent-neutral"></div>
        <div class="db-heatmap-cell level-2 accent-maths"></div>
        <span>&lt;1h</span>
        <div class="db-heatmap-cell level-3 accent-maths"></div>
        <span>1-2h</span>
        <div class="db-heatmap-cell level-4 accent-maths"></div>
        <span>2h+</span>
      </div>
    </div>
  `;
}

function heatmapTitle(day) {
  const label = dayFormatter.format(day.date);
  if (!day.count) return `${label} : aucune activité`;
  const parts = [`${label} : ${day.count} action${day.count > 1 ? "s" : ""}`];
  if (day.sessions) parts.push(`${day.sessions} séance${day.sessions > 1 ? "s" : ""}`);
  if (day.minutes) parts.push(formatMinutes(day.minutes));
  return parts.join(" · ");
}

function heatmapDomainSummary(day) {
  const domainsTouched = Object.keys(day.domainActions || {})
    .map((domainId) => {
      const domain = getDomain(domainId);
      if (!domain) return null;
      const minutes = day.domainMinutes?.[domainId] || 0;
      const actions = day.domainActions?.[domainId] || 0;
      const value = minutes ? formatMinutes(minutes) : `${actions} action${actions > 1 ? "s" : ""}`;
      return `<span class="accent-${domain.accent}"><i aria-hidden="true"></i>${escapeHtml(domain.shortTitle)} ${escapeHtml(value)}</span>`;
    })
    .filter(Boolean);
  return domainsTouched.length ? domainsTouched.join("") : '<span class="accent-neutral"><i aria-hidden="true"></i>Aucune matière</span>';
}

function renderHeatmapDetail(day) {
  if (!day) return "";
  const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const empty = day.count === 0;
  const headline = empty
    ? "Aucune activité enregistrée"
    : `${day.sessions} séance${day.sessions > 1 ? "s" : ""} · ${day.minutes ? formatMinutes(day.minutes) : `${day.count} action${day.count > 1 ? "s" : ""}`}`;
  const actions = day.actions.slice(0, 5);
  return `
    <div class="db-heatmap-detail">
      <div class="db-heatmap-detail-head">
        <span>${escapeHtml(longFmt.format(day.date))}</span>
        <strong>${escapeHtml(headline)}</strong>
      </div>
      <div class="db-heatmap-domain-summary">
        ${heatmapDomainSummary(day)}
      </div>
      ${
        empty
          ? '<p class="db-heatmap-empty">Clique sur un autre carré pour voir les séances ou actions enregistrées ce jour-là.</p>'
          : `<div class="db-heatmap-actions">
              ${actions
                .map((action) => {
                  const domain = action.domainId ? getDomain(action.domainId) : null;
                  return `
                    <div class="db-heatmap-action accent-${domain?.accent || "neutral"}">
                      <span>${escapeHtml(action.label)}</span>
                      <strong>${escapeHtml(action.title)}</strong>
                      <small>${escapeHtml(action.meta || "")}</small>
                    </div>
                  `;
                })
                .join("")}
              ${day.actions.length > actions.length ? `<p class="db-heatmap-empty">+${day.actions.length - actions.length} autre${day.actions.length - actions.length > 1 ? "s" : ""} action${day.actions.length - actions.length > 1 ? "s" : ""}</p>` : ""}
            </div>`
      }
    </div>
  `;
}

function parseHistoryDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseLocalDate(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function historyTypeLabel(event) {
  if (event.type === "status") return event.meta?.label || "Statut";
  if (event.type === "mastery") return Number.isFinite(Number(event.meta?.niveau)) ? `Niv. ${event.meta.niveau}` : "Maitrise";
  if (event.type === "review") return "Revu";
  if (event.type === "activity") return "Seance";
  if (event.type === "activity_removed") return "Retrait";
  return "Action";
}

function historyTitle(event) {
  if (event.title) return event.title;
  const topic = event.topicId ? getTopic(event.topicId) : null;
  return topic?.title || "Action notee";
}

function historyDomainDate(event) {
  const topic = event.topicId ? getTopic(event.topicId) : null;
  const domain = event.domainId ? getDomain(event.domainId) : topic ? getDomain(topic.domainId) : null;
  const date = parseHistoryDate(event.createdAt);
  const dateLabel = date ? dayFormatter.format(date) : "Date inconnue";
  return `${domain?.shortTitle || "General"} - ${dateLabel}`;
}

function fallbackHistoryItems() {
  const activityItems = state.activity.map((entry) => {
    const topic = entry.topicId ? getTopic(entry.topicId) : null;
    return {
      id: `fallback-act-${entry.id || entry.sessionId || entry.createdAt || entry.dateKey}`,
      type: "activity",
      createdAt: entry.createdAt || entry.dateKey || "",
      topicId: entry.topicId || "",
      domainId: entry.domainId || topic?.domainId || "",
      title: topic?.title || "Seance travaillee",
      meta: sanitizeHistoryMeta({ minutes: entry.minutes || 0 }),
    };
  });

  const completedItems = completedTopics()
    .slice(-10)
    .map((topic) => ({
      id: `fallback-done-${topic.id}`,
      type: "status",
      createdAt: topic.completedAt,
      topicId: topic.id,
      domainId: topic.domainId,
      title: topic.title,
      meta: { label: statusLabels.done, status: "done" },
    }));

  return [...activityItems, ...completedItems]
    .map(normalizeHistoryEvent)
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseHistoryDate(a.createdAt);
      const db = parseHistoryDate(b.createdAt);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });
}

function recentHistoryItems() {
  const saved = state.history.map(normalizeHistoryEvent).filter(Boolean);
  return (saved.length ? saved : fallbackHistoryItems()).slice(0, 6);
}

function renderRecentHistory() {
  const items = recentHistoryItems();
  return `
    <div class="db-section">
      <span class="db-section-label">Fil recent</span>
      <div class="db-history-list">
        ${
          items.length
            ? items
                .map(
                  (event) => `
                    <div class="db-history-row">
                      <span class="db-history-type">${escapeHtml(historyTypeLabel(event))}</span>
                      <span class="db-history-title">${escapeHtml(historyTitle(event))}</span>
                      <span class="db-history-meta">${escapeHtml(historyDomainDate(event))}</span>
                    </div>
                  `
                )
                .join("")
            : '<p class="db-history-empty">Aucune action recente.</p>'
        }
      </div>
    </div>
  `;
}

function renderReviewQueue(reviewList) {
  if (!reviewList.length) return "";
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const summary = reviewQueueSummary(reviewList);
  return `
    <div class="db-section">
      <span class="db-section-label">A revoir (${summary.total})</span>
      <div class="db-review-summary">
        <span>${summary.overdue} retard</span>
        <span>${summary.reviewedRecent} revu${summary.reviewedRecent > 1 ? "s" : ""} 7j</span>
      </div>
      <div class="db-review-list">
        ${reviewList
          .slice(0, 10)
          .map((t) => {
            const dateStr = t.updatedAt ? escapeHtml(fmt.format(new Date(t.updatedAt))) : "";
            const lastReviewStr = t.review.lastReviewed
              ? `Revu ${escapeHtml(fmt.format(t.review.lastReviewed))}`
              : "Jamais revu";
            const dueClass = t.review.isOverdue ? " db-review-due-overdue" : "";
            const masteryLabel = escapeHtml(MASTERY_LABELS[t.mastery] || MASTERY_LABELS[0]);
            const masteryHtml = t.mastery > 0
              ? `<span class="db-review-mastery mastery-level-${t.mastery}">${masteryLabel}</span>`
              : "";
            return `
              <div class="db-review-row${t.review.isOverdue ? " review-overdue" : ""}">
                <span class="db-review-dot accent-${t.accent}"></span>
                <div class="db-review-main">
                  <span class="db-review-title">${escapeHtml(t.title)}</span>
                  <span class="db-review-meta">${escapeHtml(t.domainShortTitle)}${dateStr ? " - " + dateStr : ""}${masteryHtml ? " " : ""}${masteryHtml}</span>
                </div>
                <div class="db-review-side">
                  <span class="db-review-due${dueClass}">${escapeHtml(t.review.dueLabel)}</span>
                  <span class="db-review-last">${lastReviewStr}</span>
                </div>
                <button class="db-review-action" type="button" data-review-done="${escapeHtml(t.id)}">Revu</button>
              </div>
            `;
          })
          .join("")}
        ${reviewList.length > 10 ? `<p class="db-review-more">+${reviewList.length - 10} autres</p>` : ""}
      </div>
    </div>
  `;
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
  const topics = orderedTopicsForProgress(entry.topics);
  const topicGroups = topicGroupsForBlock(entry, topics);
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
      ${topicGroups ? renderBlockTopicGroups(topicGroups) : topics.map((topic) => renderChapterProgress(topic)).join("")}
    </section>
  `;
}

function renderBlockTopicGroups(groups) {
  const firstOpenIndex = groups.findIndex((group) => group.topics.some((topic) => getStatus(topic.id) !== "done"));
  return `
    <div class="block-subgroups">
      ${groups.map((group, index) => {
        const stats = blockStats(group.topics);
        const hasActiveTopic = group.topics.some((topic) => ["active", "review"].includes(getStatus(topic.id)));
        const open = hasActiveTopic || index === Math.max(0, firstOpenIndex);
        return `
          <details class="block-subgroup" ${open ? "open" : ""}>
            <summary>
              <div>
                <span>Sous-partie</span>
                <strong>${escapeHtml(group.title)}</strong>
                <small>${group.topics.length} chapitre${group.topics.length > 1 ? "s" : ""}</small>
              </div>
              <em>${stats.done}/${stats.total}</em>
            </summary>
            <div class="block-subgroup-body">
              ${group.topics.map((topic) => renderChapterProgress(topic)).join("")}
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

function renderMasteryButtons(topic) {
  const current = getMastery(topic.id);
  return `
    <details class="mastery-row" data-mastery-topic="${topic.id}">
      <summary>
        <span class="mastery-row-label">Maitrise</span>
        <span class="mastery-row-current">${escapeHtml(MASTERY_LABELS[current])}</span>
      </summary>
      <div class="mastery-buttons">
        ${MASTERY_LABELS.map((label, level) => {
          return `<button class="mastery-btn mastery-level-${level}${current === level ? " mastery-btn-active" : ""}" type="button" data-mastery="${level}" title="${escapeHtml(label)}">${level}</button>`;
        }).join("")}
      </div>
    </details>
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
      ${renderMasteryButtons(topic)}
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

function attachMasteryHandlers(root) {
  root.querySelectorAll(".mastery-row").forEach((row) => {
    const topicId = row.dataset.masteryTopic;
    row.querySelectorAll(".mastery-btn").forEach((button) => {
      button.addEventListener("click", () => setMastery(topicId, Number(button.dataset.mastery)));
    });
  });
}

function attachReviewHandlers(root) {
  root.querySelectorAll("[data-review-done]").forEach((button) => {
    button.addEventListener("click", () => markReviewed(button.dataset.reviewDone));
  });
}

function attachHeatmapHandlers(root) {
  root.querySelectorAll("[data-heatmap-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedHeatmapDate = state.selectedHeatmapDate === button.dataset.heatmapDate ? null : button.dataset.heatmapDate;
      renderProgress();
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
    navigator.serviceWorker.register("sw.js?v=20260623-3").catch(() => {});
  });
}

initControls();
render();
