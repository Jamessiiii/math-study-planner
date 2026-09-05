import Combine
import Foundation

@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var chapters: [StudyChapter]
    @Published private(set) var sessions: [StudySession]
    @Published private(set) var weekPlans: [WeekPlan]
    @Published private(set) var activities: [StudyActivity]
    @Published private(set) var activeStudySession: ActiveStudySession?
    @Published private(set) var studyExecutions: [StudyExecution]
    @Published private(set) var persistenceError: String?
    @Published private(set) var operationError: String?
    @Published private(set) var revision: UInt64 = 0
    private var materializedWeeks: Set<String>

    private struct Snapshot: Codable {
        var schemaVersion: Int?
        var chapters: [StudyChapter]
        var sessions: [StudySession]
        var weekPlans: [WeekPlan]?
        var activities: [StudyActivity]?
        var materializedWeeks: [String]?
        var activeStudySession: ActiveStudySession?
        var studyExecutions: [StudyExecution]?
    }

    private let fileURL: URL
    private static let currentSchemaVersion = 6

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? Self.defaultFileURL
        let catalogue = ProgrammeCatalogLoader.load()
        let catalogueChapters = catalogue?.chapters ?? SeedData.chapters()
        let cataloguePlans = catalogue?.plans ?? SeedData.weekPlans()
        persistenceError = nil
        operationError = nil
        materializedWeeks = []
        activeStudySession = nil
        studyExecutions = []

        if FileManager.default.fileExists(atPath: self.fileURL.path) {
            do {
                let data = try Data(contentsOf: self.fileURL)
                let snapshot = try JSONDecoder().decode(Snapshot.self, from: data)
                guard (snapshot.schemaVersion ?? 1) <= Self.currentSchemaVersion else {
                    throw PersistenceIssue.unsupportedSchema(snapshot.schemaVersion ?? 0)
                }
                try Self.validateUniqueIdentifiers(in: snapshot)
                chapters = try Self.merge(catalogue: catalogueChapters, persisted: snapshot.chapters)
                sessions = snapshot.sessions
                weekPlans = snapshot.weekPlans ?? cataloguePlans
                activities = snapshot.activities ?? []
                materializedWeeks = Set(snapshot.materializedWeeks ?? [])
                activeStudySession = snapshot.activeStudySession
                studyExecutions = snapshot.studyExecutions ?? []
                migrateGeneratedSessionProvenance()
                _ = save()
            } catch {
                chapters = catalogueChapters
                sessions = []
                weekPlans = cataloguePlans
                activities = []
                activeStudySession = nil
                studyExecutions = []
                let message = Self.quarantine(self.fileURL, because: error)
                if !FileManager.default.fileExists(atPath: self.fileURL.path) { _ = save() }
                persistenceError = message
            }
        } else {
            chapters = catalogueChapters
            sessions = []
            weekPlans = cataloguePlans
            activities = []
            activeStudySession = nil
            studyExecutions = []
            _ = save()
        }
    }

    @discardableResult
    func updateStatus(of chapterID: String, to status: ChapterStatus, at date: Date = Date()) -> Bool {
        guard let index = chapters.firstIndex(where: { $0.id == chapterID }) else { return false }
        guard chapters[index].status != status else { return true }
        return performMutation {
            operationError = nil
            chapters[index].statusRawValue = status.rawValue
            // completedAt is historical: leaving "Fait" must not erase the completion date.
            if status == .done { chapters[index].completedAt = chapters[index].completedAt ?? date }
            chapters[index].updatedAt = date
            activities.append(StudyActivity(
                kind: .chapterStatus,
                domainRawValue: chapters[index].domainRawValue,
                chapterID: chapterID,
                occurredAt: date,
                minutes: 0
            ))
        }
    }

    @discardableResult
    func updateMastery(of chapterID: String, to level: MasteryLevel) -> Bool {
        guard let index = chapters.firstIndex(where: { $0.id == chapterID }) else { return false }
        return performMutation {
            operationError = nil
            chapters[index].mastery = level.rawValue
            chapters[index].updatedAt = Date()
        }
    }

    @discardableResult
    func markReviewed(chapterID: String, at date: Date = Date()) -> Bool {
        guard let index = chapters.firstIndex(where: { $0.id == chapterID }) else { return false }
        return performMutation {
            operationError = nil
            chapters[index].lastReviewedAt = date
            chapters[index].updatedAt = date
            activities.append(StudyActivity(
                kind: .review,
                domainRawValue: chapters[index].domainRawValue,
                chapterID: chapterID,
                occurredAt: date,
                minutes: 0
            ))
        }
    }

    @discardableResult
    func addSession(_ session: StudySession, at date: Date = Date()) -> Bool {
        guard canAddSession(session, at: date) else {
            operationError = "Un créneau déjà commencé ne peut pas être ajouté au calendrier."
            return false
        }
        guard validate(session) else { return false }
        return performMutation {
            operationError = nil
            var normalized = session
            reconcileWorkedState(of: &normalized)
            sessions.append(normalized)
            sessions.sort { $0.startAt < $1.startAt }
            reconcileActivity(for: normalized)
        }
    }

    @discardableResult
    func updateSession(_ session: StudySession, at date: Date = Date()) -> Bool {
        guard let index = sessions.firstIndex(where: { $0.id == session.id }) else { return false }
        let existing = sessions[index]
        if existing.startAt <= date {
            guard existing.endAt > date else {
                operationError = "Créneau passé : modification verrouillée."
                return false
            }
            var candidateWithoutEnd = session
            candidateWithoutEnd.endAt = existing.endAt
            guard candidateWithoutEnd == existing, session.endAt > date else {
                operationError = "Séance en cours : seule l’heure de fin peut être ajustée."
                return false
            }
        }
        guard validate(session, excluding: session.id) else { return false }
        return performMutation {
            operationError = nil
            var normalized = session
            reconcileWorkedState(of: &normalized)
            sessions[index] = normalized
            sessions.sort { $0.startAt < $1.startAt }
            reconcileActivity(for: normalized)
        }
    }

    @discardableResult
    func deleteSession(id: UUID, at date: Date = Date()) -> Bool {
        guard let session = sessions.first(where: { $0.id == id }) else { return false }
        guard canDeleteSession(session, at: date) else {
            operationError = session.endAt <= date
                ? "Créneau passé : suppression verrouillée."
                : "Séance en cours : suppression verrouillée."
            return false
        }
        guard activeStudySession?.sessionID != id else {
            operationError = "Terminez ou abandonnez la séance active avant de supprimer ce créneau."
            return false
        }
        return performMutation {
            sessions.removeAll { $0.id == id }
            activities.removeAll { $0.sessionID == id }
            studyExecutions.removeAll { $0.sessionID == id }
            operationError = nil
        }
    }

    func canAddSession(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.startAt > date
    }

    func canEditSessionDetails(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.startAt > date
    }

    func canResizeSessionStart(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.startAt > date
    }

    func canResizeSessionEnd(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.endAt > date
    }

    func canDeleteSession(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.startAt > date
    }

    func calendarLockMessage(for session: StudySession, at date: Date = Date()) -> String? {
        if session.endAt <= date { return "Créneau passé : modification verrouillée." }
        if session.startAt <= date { return "Séance en cours : seule l’heure de fin peut être ajustée." }
        return nil
    }

    @discardableResult
    func startStudySession(sessionID: UUID, at date: Date = Date()) -> Bool {
        guard activeStudySession == nil else {
            operationError = "Une séance est déjà active. Terminez-la ou abandonnez-la avant d’en commencer une autre."
            return false
        }
        guard let session = sessions.first(where: { $0.id == sessionID }), session.kind == .course else {
            operationError = "Ce cours est introuvable."
            return false
        }
        guard !session.isWorked else {
            operationError = "Cette séance est déjà terminée."
            return false
        }
        guard canStartStudySession(session, at: date) else {
            operationError = "Cette séance pourra commencer quinze minutes avant son horaire."
            return false
        }
        return performMutation {
            activeStudySession = ActiveStudySession(
                sessionID: session.id,
                domainRawValue: session.domainRawValue,
                chapterID: session.chapterID,
                startedAt: date,
                runningSince: date
            )
            operationError = nil
        }
    }

    func canStartStudySession(_ session: StudySession, at date: Date = Date()) -> Bool {
        session.kind == .course && !session.isWorked
            && session.startAt <= date.addingTimeInterval(15 * 60)
    }

    @discardableResult
    func pauseActiveStudySession(at date: Date = Date()) -> Bool {
        guard var active = activeStudySession, let runningSince = active.runningSince else { return false }
        return performMutation {
            active.accumulatedActiveSeconds += max(0, date.timeIntervalSince(runningSince))
            active.runningSince = nil
            activeStudySession = active
            operationError = nil
        }
    }

    @discardableResult
    func resumeActiveStudySession(at date: Date = Date()) -> Bool {
        guard var active = activeStudySession, active.runningSince == nil else { return false }
        return performMutation {
            active.runningSince = date
            activeStudySession = active
            operationError = nil
        }
    }

    @discardableResult
    func completeActiveStudySession(
        note: String = "",
        activeSecondsOverride: Int? = nil,
        at date: Date = Date()
    ) -> Bool {
        guard let active = activeStudySession,
              let index = sessions.firstIndex(where: { $0.id == active.sessionID }) else {
            operationError = "La séance active ne correspond plus à un cours existant."
            return false
        }
        let measuredSeconds = max(0, Int(active.activeSeconds(at: date).rounded(.down)))
        let activeSeconds = max(0, activeSecondsOverride ?? measuredSeconds)
        let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return performMutation {
            sessions[index].isWorked = true
            sessions[index].workedMinutes = activeSeconds / 60
            studyExecutions.append(StudyExecution(
                sessionID: active.sessionID,
                domainRawValue: active.domainRawValue,
                chapterID: active.chapterID,
                startedAt: active.startedAt,
                endedAt: date,
                activeSeconds: activeSeconds,
                note: trimmedNote.isEmpty ? nil : trimmedNote
            ))
            reconcileActivity(for: sessions[index], occurredAt: date)
            activeStudySession = nil
            operationError = nil
        }
    }

    @discardableResult
    func abandonActiveStudySession() -> Bool {
        guard activeStudySession != nil else { return false }
        return performMutation {
            activeStudySession = nil
            operationError = nil
        }
    }

    func canMarkWorked(_ session: StudySession, at date: Date = Date()) -> Bool {
        date >= session.endAt
    }

    @discardableResult
    func setSessionWorked(id: UUID, worked: Bool, at date: Date = Date()) -> Bool {
        guard let index = sessions.firstIndex(where: { $0.id == id }) else { return false }
        if worked && !canMarkWorked(sessions[index], at: date) {
            operationError = "Une séance ne peut être marquée comme faite qu’après son heure de fin."
            return false
        }
        if sessions[index].isWorked == worked {
            // Also repairs old duplicate/missing activities without creating a new event.
            return performMutation {
                operationError = nil
                reconcileActivity(for: sessions[index], occurredAt: date)
            }
        }
        return performMutation {
            sessions[index].isWorked = worked
            let measuredMinutes = studyExecutions.last(where: { $0.sessionID == id })?.activeMinutes
            sessions[index].workedMinutes = worked ? (measuredMinutes ?? sessions[index].durationMinutes) : 0
            reconcileActivity(for: sessions[index], occurredAt: date)
            operationError = nil
        }
    }

    @discardableResult
    func updateWeekPlan(_ plan: WeekPlan) -> Bool {
        guard let index = weekPlans.firstIndex(where: { $0.id == plan.id }) else { return false }
        guard validate(plan) else { return false }
        return performMutation {
            weekPlans[index] = plan
            operationError = nil
            // Toute modification du modèle est propagée immédiatement aux
            // semaines déjà matérialisées du même type (A ou B), dans la même
            // transaction : en cas d'échec de sauvegarde, tout est restauré.
            reconcileMaterializedWeeks(forPlanID: plan.id)
        }
    }

    func weekPlan(for kind: WeekKind) -> WeekPlan {
        weekPlans.first(where: { $0.id == kind.rawValue })
            ?? SeedData.weekPlans().first(where: { $0.id == kind.rawValue })!
    }

    func plannedDomain(for date: Date) -> StudyDomainKind? {
        let monday = WeekCycle.monday(containing: date)
        let start = WeekCycle.calendar.startOfDay(for: date)
        guard let offset = WeekCycle.calendar.dateComponents([.day], from: monday, to: start).day,
              (0..<7).contains(offset) else { return nil }
        let day = weekPlan(for: WeekCycle.kind(for: date)).days[offset]
        return day.isEnabled ? day.domain : nil
    }

    func sessions(on date: Date) -> [StudySession] {
        sessions.filter { WeekCycle.calendar.isDate($0.startAt, inSameDayAs: date) }
            .sorted { $0.startAt < $1.startAt }
    }

    @discardableResult
    func ensureSessions(forWeekContaining date: Date) -> Bool {
        let key = Self.weekKey(date)
        guard !materializedWeeks.contains(key) else { return true }
        return performMutation {
            operationError = nil
            reportSkipped(materializeWeek(containing: date, key: key))
        }
    }

    /// Materializes the current week and the requested number of following
    /// weeks in one transaction, so system surfaces never infer the future
    /// from a partially generated calendar.
    @discardableResult
    func ensurePlanningHorizon(from date: Date, weeksAhead: Int = 2) -> Bool {
        let monday = WeekCycle.monday(containing: date)
        let weeks = (0...max(0, weeksAhead)).compactMap {
            WeekCycle.calendar.date(byAdding: .day, value: $0 * 7, to: monday)
        }
        let missing = weeks.filter { !materializedWeeks.contains(Self.weekKey($0)) }
        guard !missing.isEmpty else { return true }
        return performMutation {
            operationError = nil
            let skipped = missing.reduce(into: 0) { count, week in
                count += materializeWeek(containing: week, key: Self.weekKey(week))
            }
            reportSkipped(skipped)
        }
    }

    /// Explicitly applies the current recurring model to one concrete week.
    /// Manual occurrences and already-worked generated occurrences are preserved.
    @discardableResult
    func refreshGeneratedSessions(forWeekContaining date: Date) -> Bool {
        let key = Self.weekKey(date)
        return performMutation {
            operationError = nil
            reportSkipped(rematerialize(weekContaining: date, key: key))
        }
    }

    func clearOperationError() {
        operationError = nil
    }

    @discardableResult
    func save() -> Bool {
        persist(snapshot())
    }

    private func snapshot() -> Snapshot {
        Snapshot(
            schemaVersion: Self.currentSchemaVersion,
            chapters: chapters,
            sessions: sessions,
            weekPlans: weekPlans,
            activities: activities,
            materializedWeeks: materializedWeeks.sorted(),
            activeStudySession: activeStudySession,
            studyExecutions: studyExecutions
        )
    }

    @discardableResult
    private func performMutation(_ mutation: () -> Void) -> Bool {
        let backup = snapshot()
        mutation()
        guard persist(snapshot()) else {
            restore(backup)
            return false
        }
        revision &+= 1
        return true
    }

    private func restore(_ snapshot: Snapshot) {
        chapters = snapshot.chapters
        sessions = snapshot.sessions
        weekPlans = snapshot.weekPlans ?? []
        activities = snapshot.activities ?? []
        materializedWeeks = Set(snapshot.materializedWeeks ?? [])
        activeStudySession = snapshot.activeStudySession
        studyExecutions = snapshot.studyExecutions ?? []
    }

    private func persist(_ snapshot: Snapshot) -> Bool {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        do {
            let data = try encoder.encode(snapshot)
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try data.write(to: fileURL, options: .atomic)
            persistenceError = nil
            return true
        } catch {
            persistenceError = "Sauvegarde impossible : \(error.localizedDescription)"
            return false
        }
    }

    private func reconcileWorkedState(of session: inout StudySession) {
        if !session.isWorked {
            session.workedMinutes = 0
        } else if let execution = studyExecutions.last(where: { $0.sessionID == session.id }) {
            session.workedMinutes = execution.activeMinutes
        } else if session.workedMinutes <= 0 {
            session.workedMinutes = session.durationMinutes
        }
    }

    private func reconcileActivity(for session: StudySession, occurredAt: Date = Date()) {
        let existingDate = activities.first(where: {
            ($0.kind == .sessionWorked || $0.kind == .sportWorked) && $0.sessionID == session.id
        })?.occurredAt
        activities.removeAll {
            ($0.kind == .sessionWorked || $0.kind == .sportWorked) && $0.sessionID == session.id
        }
        guard session.isWorked else { return }
        activities.append(StudyActivity(
            kind: session.kind == .course ? .sessionWorked : .sportWorked,
            domainRawValue: session.domainRawValue,
            chapterID: session.chapterID,
            sessionID: session.id,
            occurredAt: existingDate ?? occurredAt,
            minutes: session.workedMinutes
        ))
    }

    /// Removes obsolete generated (non-worked) sessions of one materialized
    /// week and regenerates it from the current model. Returns the number of
    /// slots skipped because of an overlapping existing session.
    private func rematerialize(weekContaining date: Date, key: String) -> Int {
        let now = Date()
        sessions.removeAll {
            $0.isGeneratedFromWeekPlan && $0.generatedWeekKey == key && !$0.isWorked
                && $0.id != activeStudySession?.sessionID
                && $0.startAt > now
        }
        materializedWeeks.remove(key)
        return materializeWeek(containing: date, key: key)
    }

    /// Applies the current model of `planID` (semaine A ou B) to every week
    /// already materialized in the calendar. Manual sessions and worked
    /// generated sessions are strictly preserved.
    private func reconcileMaterializedWeeks(forPlanID planID: String) {
        var skipped = 0
        for key in materializedWeeks.sorted() {
            guard let monday = Self.mondayDate(fromWeekKey: key),
                  WeekCycle.kind(for: monday).rawValue == planID else { continue }
            skipped += rematerialize(weekContaining: monday, key: key)
        }
        reportSkipped(skipped)
    }

    private func reportSkipped(_ skipped: Int) {
        guard skipped > 0 else { return }
        operationError = "\(skipped) créneau\(skipped > 1 ? "x" : "") du modèle n’a pas été ajouté car une séance existe déjà."
    }

    @discardableResult
    private func materializeWeek(containing date: Date, key: String) -> Int {
        let calendar = WeekCycle.calendar
        let monday = WeekCycle.monday(containing: date)
        let plan = weekPlan(for: WeekCycle.kind(for: date))
        let currentByDomain = Dictionary(uniqueKeysWithValues: StudyDomainKind.allCases.map { domain in
            (domain, chapters.first { $0.domain == domain && $0.status != .done }?.id)
        })
        var skipped = 0

        for (offset, day) in plan.days.enumerated() where day.isEnabled {
            guard let domain = day.domain,
                  let dayDate = calendar.date(byAdding: .day, value: offset, to: monday) else { continue }
            for slot in day.courseSlots {
                guard let start = self.date(on: dayDate, minutes: slot.startMinutes),
                      let end = self.date(on: dayDate, minutes: slot.endMinutes) else { continue }
                var session = StudySession(domain: domain, title: domain.title, startAt: start, endAt: end)
                session.chapterID = currentByDomain[domain] ?? nil
                session.markGenerated(weekKey: key, planID: plan.id, dayID: day.id, slotID: slot.id)
                if isLockedGeneratedSlot(weekKey: key, dayID: day.id, slotID: slot.id) { continue }
                if canInsertGenerated(session) { sessions.append(session) } else { skipped += 1 }
            }
            for slot in day.sportSlots {
                guard let start = self.date(on: dayDate, minutes: slot.startMinutes),
                      let end = self.date(on: dayDate, minutes: slot.endMinutes) else { continue }
                var session = StudySession(
                    domain: domain,
                    title: slot.label,
                    startAt: start,
                    endAt: end,
                    kind: slot.activityKind
                )
                session.markGenerated(weekKey: key, planID: plan.id, dayID: day.id, slotID: slot.id)
                if isLockedGeneratedSlot(weekKey: key, dayID: day.id, slotID: slot.id) { continue }
                if canInsertGenerated(session) { sessions.append(session) } else { skipped += 1 }
            }
        }
        sessions.sort { $0.startAt < $1.startAt }
        materializedWeeks.insert(key)
        return skipped
    }

    private func canInsertGenerated(_ candidate: StudySession) -> Bool {
        !sessions.contains {
            $0.startAt < candidate.endAt && candidate.startAt < $0.endAt
        }
    }

    private func isLockedGeneratedSlot(weekKey: String, dayID: String, slotID: String) -> Bool {
        sessions.contains {
            $0.generatedWeekKey == weekKey
                && $0.generatedDayID == dayID
                && $0.generatedSlotID == slotID
                && ($0.startAt <= Date() || $0.id == activeStudySession?.sessionID)
        }
    }

    private func date(on day: Date, minutes: Int) -> Date? {
        WeekCycle.calendar.date(
            bySettingHour: minutes / 60,
            minute: minutes % 60,
            second: 0,
            of: day
        )
    }

    private func migrateGeneratedSessionProvenance() {
        for index in sessions.indices where sessions[index].sourceRawValue == nil {
            let key = Self.weekKey(sessions[index].startAt)
            guard materializedWeeks.contains(key) else { continue }
            let monday = WeekCycle.monday(containing: sessions[index].startAt)
            let dayStart = WeekCycle.calendar.startOfDay(for: sessions[index].startAt)
            guard let offset = WeekCycle.calendar.dateComponents([.day], from: monday, to: dayStart).day,
                  (0..<7).contains(offset) else { continue }
            let plan = weekPlan(for: WeekCycle.kind(for: sessions[index].startAt))
            let day = plan.days[offset]
            let startMinutes = WeekCycle.calendar.component(.hour, from: sessions[index].startAt) * 60
                + WeekCycle.calendar.component(.minute, from: sessions[index].startAt)
            let endMinutes = WeekCycle.calendar.component(.hour, from: sessions[index].endAt) * 60
                + WeekCycle.calendar.component(.minute, from: sessions[index].endAt)
            let matchingSlot: PlanningSlot?
            if sessions[index].kind == .course,
               sessions[index].domain == day.domain,
               sessions[index].title == day.domain?.title {
                matchingSlot = day.courseSlots.first {
                    $0.startMinutes == startMinutes && $0.endMinutes == endMinutes
                }
            } else if sessions[index].kind != .course {
                matchingSlot = day.sportSlots.first {
                    $0.startMinutes == startMinutes
                        && $0.endMinutes == endMinutes
                        && $0.label == sessions[index].title
                        && $0.activityKind == sessions[index].kind
                }
            } else {
                matchingSlot = nil
            }
            if let matchingSlot {
                sessions[index].markGenerated(
                    weekKey: key,
                    planID: plan.id,
                    dayID: day.id,
                    slotID: matchingSlot.id
                )
            }
        }
    }

    private static var defaultFileURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        return base
            .appendingPathComponent("MathStudyPlanner", isDirectory: true)
            .appendingPathComponent("planner.json")
    }

    private static func validateUniqueIdentifiers(in snapshot: Snapshot) throws {
        try ensureUnique(snapshot.chapters.map(\.id), kind: "chapitre")
        try ensureUnique(snapshot.sessions.map(\.id), kind: "séance")
        try ensureUnique((snapshot.activities ?? []).map(\.id), kind: "activité")
        try ensureUnique((snapshot.studyExecutions ?? []).map(\.id), kind: "exécution")
        try ensureUnique((snapshot.weekPlans ?? []).map(\.id), kind: "programmation")
    }

    private static func ensureUnique<ID: Hashable>(_ ids: [ID], kind: String) throws {
        guard Set(ids).count == ids.count else { throw PersistenceIssue.duplicateIdentifier(kind) }
    }

    private static func merge(catalogue: [StudyChapter], persisted: [StudyChapter]) throws -> [StudyChapter] {
        try ensureUnique(persisted.map(\.id), kind: "chapitre")
        let persistedByID = Dictionary(uniqueKeysWithValues: persisted.map { ($0.id, $0) })
        var merged = catalogue.map { definition in
            guard let saved = persistedByID[definition.id] else { return definition }
            var chapter = definition
            chapter.statusRawValue = saved.statusRawValue
            chapter.mastery = saved.mastery
            chapter.completedAt = saved.completedAt
            chapter.lastReviewedAt = saved.lastReviewedAt
            chapter.updatedAt = saved.updatedAt
            return chapter
        }
        let catalogueIDs = Set(catalogue.map(\.id))
        merged.append(contentsOf: persisted.filter { !catalogueIDs.contains($0.id) })
        return merged.sorted { $0.sequence < $1.sequence }
    }

    private func validate(_ session: StudySession, excluding excludedID: UUID? = nil) -> Bool {
        guard !session.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            operationError = "Le titre de la séance est obligatoire."
            return false
        }
        guard session.endAt > session.startAt else {
            operationError = "L’heure de fin doit être postérieure à l’heure de début."
            return false
        }
        guard WeekCycle.calendar.isDate(session.startAt, inSameDayAs: session.endAt) else {
            operationError = "Une séance doit commencer et finir le même jour."
            return false
        }
        let hasMeasuredExecution = studyExecutions.contains { $0.sessionID == session.id }
        guard !session.isWorked || session.endAt <= Date() || hasMeasuredExecution else {
            operationError = "Une séance future ne peut pas être enregistrée comme faite."
            return false
        }
        let sameDay = sessions.filter {
            $0.id != excludedID && WeekCycle.calendar.isDate($0.startAt, inSameDayAs: session.startAt)
        }
        let sameKindCount = sameDay.filter { $0.kind == session.kind }.count
        let limit = session.kind == .course ? 4 : 8
        guard sameKindCount < limit else {
            operationError = session.kind == .course
                ? "La limite est de quatre cours par jour."
                : "La limite est de huit séances de \(session.kind.title.lowercased()) par jour."
            return false
        }
        guard !sessions.contains(where: {
            $0.id != excludedID && $0.startAt < session.endAt && session.startAt < $0.endAt
        }) else {
            operationError = "Ce créneau chevauche une autre séance."
            return false
        }
        operationError = nil
        return true
    }

    private func validate(_ plan: WeekPlan) -> Bool {
        for day in plan.days {
            guard day.courseSlots.count <= 4, day.sportSlots.count <= 8 else {
                operationError = "Trop de créneaux sont programmés pour \(day.longLabel)."
                return false
            }
            let allSlots = day.courseSlots + day.sportSlots
            guard allSlots.allSatisfy({
                $0.startMinutes >= 0 && $0.endMinutes <= 1_440 && $0.endMinutes > $0.startMinutes
            }) else {
                operationError = "Un horaire de \(day.longLabel) est invalide."
                return false
            }
            let sorted = allSlots.sorted { $0.startMinutes < $1.startMinutes }
            for pair in zip(sorted, sorted.dropFirst()) where pair.0.endMinutes > pair.1.startMinutes {
                operationError = "Deux créneaux de \(day.longLabel) se chevauchent."
                return false
            }
        }
        operationError = nil
        return true
    }

    private static func weekKey(_ date: Date) -> String {
        "planner-v2-\(weekKeyFormatter.string(from: WeekCycle.monday(containing: date)))"
    }

    private static func mondayDate(fromWeekKey key: String) -> Date? {
        guard key.hasPrefix("planner-v2-") else { return nil }
        return weekKeyFormatter.date(from: String(key.dropFirst("planner-v2-".count)))
    }

    private static let weekKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = WeekCycle.calendar
        formatter.timeZone = WeekCycle.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func quarantine(_ source: URL, because error: Error) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        let quarantine = source
            .deletingPathExtension()
            .appendingPathExtension("corrupt-\(formatter.string(from: Date())).json")
        do {
            try FileManager.default.moveItem(at: source, to: quarantine)
            return "La sauvegarde était illisible et a été conservée sous \(quarantine.lastPathComponent). Une base saine a été créée."
        } catch {
            return "La sauvegarde est illisible et n’a pas été remplacée : \(error.localizedDescription)"
        }
    }
}

private enum PersistenceIssue: LocalizedError {
    case unsupportedSchema(Int)
    case duplicateIdentifier(String)

    var errorDescription: String? {
        switch self {
        case let .unsupportedSchema(version):
            "Cette sauvegarde utilise un format plus récent (version \(version))."
        case let .duplicateIdentifier(kind):
            "La sauvegarde contient un identifiant de \(kind) en double."
        }
    }
}
