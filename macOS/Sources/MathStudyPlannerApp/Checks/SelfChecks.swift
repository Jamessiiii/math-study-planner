import Foundation

@MainActor
enum SelfChecks {
    private struct PersistenceResults {
        var roundTrip = false
        var quarantine = false
        var duplicateIDs = false
        var rollback = false
        var planningHorizon = false
    }

    private struct IntegrityResults {
        var futureGuard = false
        var workedReconciliation = false
        var deleteCascade = false
        var sameDayGuard = false
        var combinedOverlap = false
        var customSportHours = false
        var customBikeHours = false
        var calendarResize = false
        var completionHistory = false
        var explicitWeekRefresh = false
        var autoPropagation = false
        var autoPropagationRollback = false
        var pastCalendarLock = false
        var ongoingEndOnly = false
    }

    static func run() -> Bool {
        let calendar = WeekCycle.calendar
        let anchorIsA = WeekCycle.kind(for: WeekCycle.anchor) == .a
        let nextWeek = calendar.date(byAdding: .day, value: 7, to: WeekCycle.anchor)
        let nextWeekIsB = nextWeek.map { WeekCycle.kind(for: $0) == .b } ?? false
        let july20 = calendar.date(from: DateComponents(year: 2026, month: 7, day: 20))
        let july22IsB = july20.map { WeekCycle.kind(for: $0) == .b } ?? false
        let assignmentsMatch = WeekAssignment.assignments(for: .a).map(\.domain) == [
            .maths, .maths, .proba, .proba, .info
        ]
        let catalog = ProgrammeCatalogLoader.load()
        let catalogCountsMatch = catalog?.programmes.count == 5
            && catalog?.programmes.flatMap(\.blocks).count == 25
            && catalog?.chapters.count == 139
        let catalogIDsAreUnique = catalog.map { Set($0.chapters.map(\.id)).count == 139 } ?? false
        let catalogueMatchesNotion = catalog.map { catalogue in
            let programmes = Dictionary(uniqueKeysWithValues: catalogue.programmes.map { ($0.id, $0) })
            return programmes["l1"]?.blocks.count == 6
                && programmes["l1"]?.blocks.last?.items.map(\.id) == ["l1-24"]
                && programmes["l2"]?.blocks.count == 5
                && programmes["l2"]?.blocks.last?.items.map(\.id) == ["l2-27", "l2-28"]
                && programmes["proba"]?.blocks.count == 5
                && programmes["proba"]?.title == "Programme Probabilité-Statistique"
                && programmes["proba"]?.blocks[1].items.first(where: { $0.id == "ps-03" })?.resources.first?.contains("Dalang-Conus") == true
                && programmes["proba"]?.blocks.last?.title == "Chapitre 5 - Programme IA"
                && programmes["proba"]?.blocks.last?.items.count == 22
                && programmes["proba"]?.blocks.last?.items.map(\.id) == [
                    "ps-ai-01", "ps-ai-02", "ps-ai-03", "ps-ai-04", "ps-ai-05", "ps-ai-06", "ps-ai-07", "ps-ai-08",
                    "ps-ai-10", "ps-ai-11", "ps-ai-13", "ps-ai-15", "ps-ai-16", "ps-ai-17", "ps-ai-18", "ps-ai-20",
                    "ps-ai-21", "ps-ai-24", "ps-ai-22", "ps-ai-26", "ps-ai-27", "ps-ai-28"
                ]
                && programmes["info"]?.blocks.count == 6
                && programmes["info"]?.blocks[2].items.map(\.id) == ["info-08", "info-15", "info-09", "info-10", "info-11"]
                && programmes["info"]?.blocks.last?.items.map(\.id) == ["info-14"]
                && programmes["info"]?.sourceUrl?.contains("2ec8117500218030b709fa683fdd72ac") == true
                && programmes["info"]?.blocks[2].items.first(where: { $0.id == "info-15" })?.resources.contains(where: { $0.contains("Programmer en langage C") }) == true
                && programmes["l1"]?.sourceUrl?.contains("2ef811750021803dbe63f120bca7d103") == true
                && programmes["l2"]?.sourceUrl?.contains("2f0811750021805d9604d7a5ff45b48e") == true
                && programmes["l3"]?.sourceUrl?.contains("2f081175002180d3a653f82a8bfe97b1") == true
                && programmes["proba"]?.sourceUrl?.contains("2f081175002180ffa63edbf111bebd68") == true
        } ?? false
        let plansAreComplete = catalog?.plans.allSatisfy { plan in
            plan.days.count == 7 && plan.days.filter(\.isEnabled).allSatisfy { $0.courseSlots.count == 2 }
        } ?? false
        let persistence = checkPersistence()
        let integrity = checkIntegrity()
        let upcoming = checkUpcomingCourseAndReminders()
        let sessionMode = checkSessionMode()

        let checks = [
            ("ancre 2026-06-15 = semaine A", anchorIsA),
            ("semaine suivante = semaine B", nextWeekIsB),
            ("20 et 22 juillet 2026 = semaine B en Guadeloupe", july22IsB),
            ("répartition de la semaine A", assignmentsMatch),
            ("catalogue 5 programmes / 25 blocs / 139 chapitres", catalogCountsMatch),
            ("identifiants de chapitre uniques", catalogIDsAreUnique),
            ("structure et sources Notion à jour", catalogueMatchesNotion),
            ("programmations A/B complètes", plansAreComplete),
            ("round-trip JSON et génération hebdomadaire", persistence.roundTrip),
            ("quarantaine d’une sauvegarde illisible", persistence.quarantine),
            ("identifiants persistés dupliqués mis en quarantaine", persistence.duplicateIDs),
            ("échec disque = restauration de l’état en mémoire", persistence.rollback),
            ("horizon courant + deux semaines matérialisé atomiquement", persistence.planningHorizon),
            ("cours en cours puis prochain cours partagés, Sport exclu", upcoming.selection),
            ("rappels déterministes et bornés à l’horizon", upcoming.reminders),
            ("minuteur séance exclut les pauses et enregistre le temps réel", sessionMode.timing),
            ("séance active restaurée après relance", sessionMode.persistence),
            ("une seule séance active et rollback disque cohérent", sessionMode.guardrails),
            ("impossible de valider une séance avant sa fin", integrity.futureGuard),
            ("édition d’une séance travaillée réconcilie minutes et activité", integrity.workedReconciliation),
            ("suppression d’une séance supprime son activité", integrity.deleteCascade),
            ("séance à cheval sur deux jours refusée", integrity.sameDayGuard),
            ("chevauchement cours / sport refusé", integrity.combinedOverlap),
            ("horaire Sport libre 19 h 30–20 h 30 accepté et généré", integrity.customSportHours),
            ("horaire Vélo bleu clair 18 h–19 h persisté et généré", integrity.customBikeHours),
            ("redimensionnement Calendrier accepté puis chevauchement annulé", integrity.calendarResize),
            ("historique de complétion préservé", integrity.completionHistory),
            ("application explicite du modèle préserve manuel et travaillé", integrity.explicitWeekRefresh),
            ("modification du Programme propagée aux semaines matérialisées", integrity.autoPropagation),
            ("échec disque pendant la propagation = restauration complète", integrity.autoPropagationRollback)
            ,("créneau passé consultable mais édition et suppression verrouillées", integrity.pastCalendarLock)
            ,("séance en cours : seule l’heure de fin reste ajustable", integrity.ongoingEndOnly)
        ]

        checks.forEach { label, success in
            print("\(success ? "OK" : "ECHEC") — \(label)")
        }
        return checks.allSatisfy(\.1)
    }

    private static func checkSessionMode() -> (timing: Bool, persistence: Bool, guardrails: Bool) {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("MathStudyPlanner-SessionMode-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let fileURL = directory.appendingPathComponent("planner.json")
            let store = AppStore(fileURL: fileURL)
            let calendar = WeekCycle.calendar
            guard let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date()),
                  let start = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: tomorrow) else {
                return (false, false, false)
            }
            let first = StudySession(
                domain: .maths,
                title: "Séance chronométrée",
                startAt: start,
                endAt: start.addingTimeInterval(5_400)
            )
            let second = StudySession(
                domain: .proba,
                title: "Deuxième séance",
                startAt: start.addingTimeInterval(7_200),
                endAt: start.addingTimeInterval(10_800)
            )
            guard store.addSession(first), store.addSession(second) else { return (false, false, false) }

            let started = store.startStudySession(sessionID: first.id, at: start)
            let secondStartRejected = !store.startStudySession(
                sessionID: second.id,
                at: start.addingTimeInterval(60)
            )
            let activeDeleteRejected = !store.deleteSession(id: first.id)
            let paused = store.pauseActiveStudySession(at: start.addingTimeInterval(600))

            let reloaded = AppStore(fileURL: fileURL)
            let persistence = reloaded.activeStudySession?.sessionID == first.id
                && reloaded.activeStudySession?.isPaused == true
                && reloaded.activeStudySession?.activeSeconds(at: start.addingTimeInterval(900)) == 600

            let resumed = reloaded.resumeActiveStudySession(at: start.addingTimeInterval(900))
            let completed = reloaded.completeActiveStudySession(
                note: "  Exercices 1 à 4  ",
                at: start.addingTimeInterval(1_500)
            )
            guard var edited = reloaded.sessions.first(where: { $0.id == first.id }) else {
                return (false, persistence, false)
            }
            edited.endAt = edited.startAt.addingTimeInterval(7_200)
            let preservedAfterEdit = reloaded.updateSession(edited)
            let execution = reloaded.studyExecutions.first(where: { $0.sessionID == first.id })
            let activity = reloaded.activities.first(where: {
                $0.sessionID == first.id && $0.kind == .sessionWorked
            })
            let timing = started && paused && resumed && completed && preservedAfterEdit
                && reloaded.activeStudySession == nil
                && execution?.activeSeconds == 1_200
                && execution?.note == "Exercices 1 à 4"
                && reloaded.sessions.first(where: { $0.id == first.id })?.workedMinutes == 20
                && activity?.minutes == 20
            let measuredUndo = reloaded.setSessionWorked(
                id: first.id,
                worked: false,
                at: start.addingTimeInterval(1_600)
            ) && reloaded.studyExecutions.contains { $0.sessionID == first.id }
                && reloaded.activities.allSatisfy { $0.sessionID != first.id }

            let failingURL = directory.appendingPathComponent("session-mode-rollback.json")
            let failing = AppStore(fileURL: failingURL)
            let failingCourse = StudySession(
                domain: .info,
                title: "Rollback",
                startAt: start,
                endAt: start.addingTimeInterval(3_600)
            )
            guard failing.addSession(failingCourse) else { return (timing, persistence, false) }
            try FileManager.default.removeItem(at: failingURL)
            try FileManager.default.createDirectory(at: failingURL, withIntermediateDirectories: false)
            let failedStart = !failing.startStudySession(sessionID: failingCourse.id, at: start)
            let guardrails = secondStartRejected && activeDeleteRejected && measuredUndo
                && failedStart && failing.activeStudySession == nil
            return (timing, persistence, guardrails)
        } catch {
            return (false, false, false)
        }
    }

    private static func checkPersistence() -> PersistenceResults {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("MathStudyPlanner-SelfChecks-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        var results = PersistenceResults()

        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let validURL = directory.appendingPathComponent("planner.json")
            let firstStore = AppStore(fileURL: validURL)
            var plan = firstStore.weekPlan(for: .a)
            plan.days[0].sportSlots = [
                PlanningSlot(id: "sport", label: "Sport", startMinutes: 1_140, endMinutes: 1_200)
            ]
            _ = firstStore.updateWeekPlan(plan)
            _ = firstStore.ensureSessions(forWeekContaining: WeekCycle.anchor)
            if let movedChapter = firstStore.chapters.first(where: { $0.id == "l1-24" }) {
                _ = firstStore.updateStatus(of: movedChapter.id, to: .done)
                _ = firstStore.updateMastery(of: movedChapter.id, to: .mastered)
            }
            let secondStore = AppStore(fileURL: validURL)
            let migratedChapter = secondStore.chapters.first(where: { $0.id == "l1-24" })
            results.roundTrip = secondStore.chapters.count == 139
                && secondStore.sessions.count == 11
                && secondStore.sessions.allSatisfy(\.isGeneratedFromWeekPlan)
                && migratedChapter?.status == .done
                && migratedChapter?.masteryLevel == .mastered
                && migratedChapter?.blockTitle == "Bloc 5 - Geometrie et approfondissement"
                && secondStore.activities.count == 1

            let corruptURL = directory.appendingPathComponent("corrupt.json")
            try Data("{incomplet".utf8).write(to: corruptURL)
            let recoveredStore = AppStore(fileURL: corruptURL)
            var directoryEntries = try FileManager.default.contentsOfDirectory(atPath: directory.path)
            results.quarantine = recoveredStore.persistenceError != nil
                && recoveredStore.chapters.count == 139
                && directoryEntries.contains(where: { $0.hasPrefix("corrupt.corrupt-") })

            let duplicateURL = directory.appendingPathComponent("duplicate.json")
            _ = AppStore(fileURL: duplicateURL)
            let data = try Data(contentsOf: duplicateURL)
            guard var object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  var chapters = object["chapters"] as? [[String: Any]],
                  let first = chapters.first else { return results }
            chapters.append(first)
            object["chapters"] = chapters
            try JSONSerialization.data(withJSONObject: object).write(to: duplicateURL, options: .atomic)
            let duplicateStore = AppStore(fileURL: duplicateURL)
            directoryEntries = try FileManager.default.contentsOfDirectory(atPath: directory.path)
            results.duplicateIDs = duplicateStore.persistenceError != nil
                && duplicateStore.chapters.count == 139
                && directoryEntries.contains(where: { $0.hasPrefix("duplicate.corrupt-") })

            let failingStore = AppStore(fileURL: URL(fileURLWithPath: "/dev/null/planner.json"))
            guard let firstID = failingStore.chapters.first?.id,
                  let before = failingStore.chapters.first?.mastery else { return results }
            let persisted = failingStore.updateMastery(of: firstID, to: .mastered)
            results.rollback = !persisted
                && failingStore.chapters.first?.mastery == before
                && failingStore.persistenceError != nil

            let horizonStore = AppStore(fileURL: directory.appendingPathComponent("horizon.json"))
            let horizonSaved = horizonStore.ensurePlanningHorizon(from: WeekCycle.anchor, weeksAhead: 2)
            results.planningHorizon = horizonSaved
                && Set(horizonStore.sessions.compactMap(\.generatedWeekKey)).count == 3
                && horizonStore.sessions.allSatisfy(\.isGeneratedFromWeekPlan)
        } catch {
            return results
        }
        return results
    }

    private static func checkUpcomingCourseAndReminders() -> (selection: Bool, reminders: Bool) {
        let calendar = WeekCycle.calendar
        guard let now = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: WeekCycle.anchor),
              let runningStart = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: WeekCycle.anchor),
              let runningEnd = calendar.date(bySettingHour: 11, minute: 0, second: 0, of: WeekCycle.anchor),
              let sportStart = calendar.date(bySettingHour: 11, minute: 30, second: 0, of: WeekCycle.anchor),
              let courseStart = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: WeekCycle.anchor) else {
            return (false, false)
        }
        let running = StudySession(
            domain: .maths,
            title: "Maths",
            startAt: runningStart,
            endAt: runningEnd
        )
        let sport = StudySession(
            domain: .maths,
            title: "Sport",
            startAt: sportStart,
            endAt: sportStart.addingTimeInterval(3_600),
            kind: .sport
        )
        let next = StudySession(
            domain: .proba,
            title: "Probabilités",
            startAt: courseStart,
            endAt: courseStart.addingTimeInterval(3_600)
        )
        let sessions = [sport, next, running]
        let current = UpcomingCourseService.currentOrNextCourse(
            sessions: sessions,
            chapters: [],
            now: now,
            horizonEnd: courseStart.addingTimeInterval(7_200)
        )
        let later = UpcomingCourseService.currentOrNextCourse(
            sessions: sessions,
            chapters: [],
            now: runningEnd.addingTimeInterval(60),
            horizonEnd: courseStart.addingTimeInterval(7_200)
        )
        let bounded = UpcomingCourseService.currentOrNextCourse(
            sessions: sessions,
            chapters: [],
            now: runningEnd.addingTimeInterval(60),
            horizonEnd: courseStart.addingTimeInterval(-60)
        )
        let selection = current?.session.id == running.id
            && current?.state == .inProgress
            && later?.session.id == next.id
            && later?.state == .upcoming
            && bounded == nil

        let plans = CourseReminderPlanner.reminders(
            sessions: sessions,
            chapters: [],
            now: now,
            horizonEnd: courseStart.addingTimeInterval(7_200),
            leadMinutes: 15
        )
        var completedNext = next
        completedNext.isWorked = true
        let completedIsExcluded = UpcomingCourseService.currentOrNextCourse(
            sessions: [completedNext],
            chapters: [],
            now: now,
            horizonEnd: courseStart.addingTimeInterval(7_200)
        ) == nil && CourseReminderPlanner.reminders(
            sessions: [completedNext],
            chapters: [],
            now: now,
            horizonEnd: courseStart.addingTimeInterval(7_200),
            leadMinutes: 15
        ).isEmpty
        let reminders = plans.count == 1
            && plans.first?.sessionID == next.id
            && plans.first?.identifier == CourseReminderPlanner.identifierPrefix + next.id.uuidString
            && plans.first?.fireDate == courseStart.addingTimeInterval(-900)
            && completedIsExcluded
        return (selection, reminders)
    }

    private static func checkIntegrity() -> IntegrityResults {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("MathStudyPlanner-Integrity-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        var results = IntegrityResults()

        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let calendar = WeekCycle.calendar
            let store = AppStore(fileURL: directory.appendingPathComponent("integrity.json"))

            let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date())!
            let futureStart = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: tomorrow)!
            let futureEnd = calendar.date(byAdding: .hour, value: 1, to: futureStart)!
            let future = StudySession(domain: .maths, title: "Future", startAt: futureStart, endAt: futureEnd)
            _ = store.addSession(future)
            results.futureGuard = !store.setSessionWorked(id: future.id, worked: true, at: Date())
                && store.sessions.first(where: { $0.id == future.id })?.isWorked == false
                && store.activities.allSatisfy { $0.sessionID != future.id }

            let pastStart = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: WeekCycle.anchor)!
            let pastEnd = calendar.date(byAdding: .hour, value: 1, to: pastStart)!
            var past = StudySession(domain: .proba, title: "Passée", startAt: pastStart, endAt: pastEnd)
            _ = store.addSession(past, at: pastStart.addingTimeInterval(-60))
            let firstMark = store.setSessionWorked(id: past.id, worked: true, at: pastEnd)
            let secondMark = store.setSessionWorked(id: past.id, worked: true, at: pastEnd.addingTimeInterval(60))
            past.isWorked = true
            past.endAt = pastStart.addingTimeInterval(5_400)
            let edited = store.updateSession(past, at: pastStart.addingTimeInterval(-60))
            let activity = store.activities.filter { $0.sessionID == past.id }
            results.workedReconciliation = firstMark && secondMark && edited
                && activity.count == 1
                && activity.first?.minutes == 90
                && store.sessions.first(where: { $0.id == past.id })?.workedMinutes == 90
            _ = store.deleteSession(id: past.id, at: pastStart.addingTimeInterval(-60))
            results.deleteCascade = store.sessions.allSatisfy { $0.id != past.id }
                && store.activities.allSatisfy { $0.sessionID != past.id }

            let lateStart = calendar.date(bySettingHour: 23, minute: 30, second: 0, of: WeekCycle.anchor)!
            let nextDayEnd = lateStart.addingTimeInterval(3_600)
            results.sameDayGuard = !store.addSession(
                StudySession(domain: .info, title: "Nuit", startAt: lateStart, endAt: nextDayEnd),
                at: lateStart.addingTimeInterval(-60)
            )

            var overlapPlan = store.weekPlan(for: .a)
            let course = overlapPlan.days[0].courseSlots[0]
            overlapPlan.days[0].sportSlots = [
                PlanningSlot(id: "overlap", label: "Sport", startMinutes: course.startMinutes, endMinutes: course.endMinutes)
            ]
            results.combinedOverlap = !store.updateWeekPlan(overlapPlan)

            let sportStore = AppStore(fileURL: directory.appendingPathComponent("custom-sport-hours.json"))
            var customPlan = sportStore.weekPlan(for: .a)
            customPlan.days[0].courseSlots = [
                PlanningSlot(id: "evening-course", label: "Cours", startMinutes: 1_080, endMinutes: 1_170)
            ]
            customPlan.days[0].sportSlots = [
                PlanningSlot(id: "custom-sport", label: "Sport", startMinutes: 1_170, endMinutes: 1_230)
            ]
            let customPlanSaved = sportStore.updateWeekPlan(customPlan)
            let customWeekGenerated = sportStore.ensureSessions(forWeekContaining: WeekCycle.anchor)
            results.customSportHours = customPlanSaved && customWeekGenerated
                && sportStore.sessions.contains {
                    $0.kind == .sport
                        && calendar.component(.hour, from: $0.startAt) == 19
                        && calendar.component(.minute, from: $0.startAt) == 30
                        && calendar.component(.hour, from: $0.endAt) == 20
                        && calendar.component(.minute, from: $0.endAt) == 30
                }

            let bikeURL = directory.appendingPathComponent("custom-bike-hours.json")
            let bikeStore = AppStore(fileURL: bikeURL)
            var bikePlan = bikeStore.weekPlan(for: .a)
            bikePlan.days[0].courseSlots = [
                PlanningSlot(id: "morning-course", label: "Cours", startMinutes: 540, endMinutes: 630)
            ]
            var bikeSlot = PlanningSlot(
                id: "custom-bike",
                label: "Vélo",
                startMinutes: 1_080,
                endMinutes: 1_140
            )
            bikeSlot.activityKind = .bike
            bikePlan.days[0].sportSlots = [bikeSlot]
            let bikePlanSaved = bikeStore.updateWeekPlan(bikePlan)
            let bikeWeekGenerated = bikeStore.ensureSessions(forWeekContaining: WeekCycle.anchor)
            let reloadedBikeStore = AppStore(fileURL: bikeURL)
            results.customBikeHours = bikePlanSaved && bikeWeekGenerated
                && reloadedBikeStore.weekPlan(for: .a).days[0].sportSlots.first?.activityKind == .bike
                && reloadedBikeStore.sessions.contains {
                    $0.kind == .bike
                        && $0.title == "Vélo"
                        && calendar.component(.hour, from: $0.startAt) == 18
                        && calendar.component(.minute, from: $0.startAt) == 0
                        && calendar.component(.hour, from: $0.endAt) == 19
                        && calendar.component(.minute, from: $0.endAt) == 0
                }

            let resizeStore = AppStore(fileURL: directory.appendingPathComponent("calendar-resize.json"))
            let resizeDay = WeekCycle.anchor
            let firstStart = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: resizeDay)!
            let firstEnd = calendar.date(bySettingHour: 19, minute: 30, second: 0, of: resizeDay)!
            let secondStart = calendar.date(bySettingHour: 20, minute: 0, second: 0, of: resizeDay)!
            let secondEnd = calendar.date(bySettingHour: 20, minute: 30, second: 0, of: resizeDay)!
            let firstResizeSession = StudySession(
                domain: .maths,
                title: "Cours du soir",
                startAt: firstStart,
                endAt: firstEnd
            )
            var resizedSport = StudySession(
                domain: .maths,
                title: "Sport redimensionné",
                startAt: secondStart,
                endAt: secondEnd,
                kind: .sport
            )
            let resizeReference = firstStart.addingTimeInterval(-60)
            let resizeSeedsSaved = resizeStore.addSession(firstResizeSession, at: resizeReference)
                && resizeStore.addSession(resizedSport, at: resizeReference)
            resizedSport.startAt = firstEnd
            let adjacentResizeSaved = resizeStore.updateSession(resizedSport, at: resizeReference)
            resizedSport.startAt = calendar.date(bySettingHour: 19, minute: 15, second: 0, of: resizeDay)!
            let overlapResizeRejected = !resizeStore.updateSession(resizedSport, at: resizeReference)
            let storedResize = resizeStore.sessions.first { $0.id == resizedSport.id }
            results.calendarResize = resizeSeedsSaved
                && adjacentResizeSaved
                && overlapResizeRejected
                && storedResize?.startAt == firstEnd

            if let chapterID = store.chapters.first?.id {
                let completed = Date(timeIntervalSince1970: 1_700_000_000)
                _ = store.updateStatus(of: chapterID, to: .done, at: completed)
                _ = store.updateStatus(of: chapterID, to: .review, at: completed.addingTimeInterval(86_400))
                results.completionHistory = store.chapters.first?.completedAt == completed
            }

            let refreshStore = AppStore(fileURL: directory.appendingPathComponent("refresh.json"))
            let currentMonday = WeekCycle.monday(containing: Date())
            let refreshWeek = calendar.date(byAdding: .day, value: 7, to: currentMonday)!
            _ = refreshStore.ensureSessions(forWeekContaining: refreshWeek)
            guard let workedGenerated = refreshStore.sessions.first else { return results }
            _ = refreshStore.setSessionWorked(
                id: workedGenerated.id,
                worked: true,
                at: workedGenerated.endAt.addingTimeInterval(1)
            )
            let saturday = calendar.date(byAdding: .day, value: 5, to: refreshWeek)!
            let manualStart = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: saturday)!
            let manual = StudySession(
                domain: refreshStore.plannedDomain(for: WeekCycle.anchor) ?? .maths,
                title: "Séance manuelle",
                startAt: manualStart,
                endAt: manualStart.addingTimeInterval(3_600)
            )
            _ = refreshStore.addSession(manual)
            var reducedPlan = refreshStore.weekPlan(for: WeekCycle.kind(for: refreshWeek))
            reducedPlan.days[0].courseSlots.removeLast()
            _ = refreshStore.updateWeekPlan(reducedPlan)
            let refreshed = refreshStore.refreshGeneratedSessions(forWeekContaining: refreshWeek)
            let generated = refreshStore.sessions.filter(\.isGeneratedFromWeekPlan)
            results.explicitWeekRefresh = refreshed
                && generated.count == 9
                && refreshStore.sessions.contains(where: { $0.id == manual.id && !$0.isGeneratedFromWeekPlan })
                && refreshStore.sessions.contains(where: { $0.id == workedGenerated.id && $0.isWorked })

            results.autoPropagation = checkAutoPropagation(directory: directory)
            results.autoPropagationRollback = checkAutoPropagationRollback(directory: directory)
            let temporalPolicy = checkCalendarTemporalPolicy(directory: directory)
            results.pastCalendarLock = temporalPolicy.pastLocked
            results.ongoingEndOnly = temporalPolicy.ongoingEndOnly
        } catch {
            return results
        }
        return results
    }

    private static func checkCalendarTemporalPolicy(directory: URL) -> (pastLocked: Bool, ongoingEndOnly: Bool) {
        let calendar = WeekCycle.calendar
        let store = AppStore(fileURL: directory.appendingPathComponent("calendar-temporal-policy.json"))
        guard let day = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: Date())),
              let policyNow = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: day),
              let pastStart = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: day),
              let pastEnd = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: day),
              let ongoingStart = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: day),
              let ongoingEnd = calendar.date(bySettingHour: 14, minute: 0, second: 0, of: day),
              let futureStart = calendar.date(bySettingHour: 16, minute: 0, second: 0, of: day),
              let futureEnd = calendar.date(bySettingHour: 17, minute: 0, second: 0, of: day) else {
            return (false, false)
        }

        let insertionDate = day
        let past = StudySession(domain: .maths, title: "Passé", startAt: pastStart, endAt: pastEnd)
        let ongoing = StudySession(domain: .proba, title: "En cours", startAt: ongoingStart, endAt: ongoingEnd)
        let future = StudySession(domain: .info, title: "Futur", startAt: futureStart, endAt: futureEnd)
        guard store.addSession(past, at: insertionDate),
              store.addSession(ongoing, at: insertionDate),
              store.addSession(future, at: insertionDate) else { return (false, false) }

        var editedPast = past
        editedPast.title = "Passé modifié"
        let pastDetailsRejected = !store.updateSession(editedPast, at: policyNow)
        editedPast = past
        editedPast.endAt = pastEnd.addingTimeInterval(900)
        let pastEndRejected = !store.updateSession(editedPast, at: policyNow)
        let pastDeleteRejected = !store.deleteSession(id: past.id, at: policyNow)
        let pastLocked = pastDetailsRejected && pastEndRejected && pastDeleteRejected
            && !store.canEditSessionDetails(past, at: policyNow)
            && !store.canResizeSessionStart(past, at: policyNow)
            && !store.canResizeSessionEnd(past, at: policyNow)
            && store.sessions.contains { $0.id == past.id }

        var editedOngoing = ongoing
        editedOngoing.title = "Titre interdit"
        let ongoingDetailsRejected = !store.updateSession(editedOngoing, at: policyNow)
        editedOngoing = ongoing
        editedOngoing.startAt = ongoingStart.addingTimeInterval(900)
        let ongoingStartRejected = !store.updateSession(editedOngoing, at: policyNow)
        editedOngoing = ongoing
        editedOngoing.endAt = ongoingEnd.addingTimeInterval(1_800)
        let ongoingEndAccepted = store.updateSession(editedOngoing, at: policyNow)
        let ongoingDeleteRejected = !store.deleteSession(id: ongoing.id, at: policyNow)

        var editedFuture = future
        editedFuture.title = "Futur modifiable"
        let futureEditAccepted = store.updateSession(editedFuture, at: policyNow)
        let futureDeleteAccepted = store.deleteSession(id: future.id, at: policyNow)
        let ongoingEndOnly = ongoingDetailsRejected && ongoingStartRejected
            && ongoingEndAccepted && ongoingDeleteRejected
            && !store.canEditSessionDetails(ongoing, at: policyNow)
            && !store.canResizeSessionStart(ongoing, at: policyNow)
            && store.canResizeSessionEnd(ongoing, at: policyNow)
            && futureEditAccepted && futureDeleteAccepted
        return (pastLocked, ongoingEndOnly)
    }

    /// A Programme edit must update every already-materialized week of the
    /// same kind (here two weeks A, 14 days apart) without any Calendar
    /// action, while manual and worked sessions survive untouched.
    private static func checkAutoPropagation(directory: URL) -> Bool {
        let calendar = WeekCycle.calendar
        let store = AppStore(fileURL: directory.appendingPathComponent("propagation.json"))
        let currentMonday = WeekCycle.monday(containing: Date())
        guard let weekOne = calendar.date(byAdding: .day, value: 7, to: currentMonday) else { return false }
        guard let weekTwo = calendar.date(byAdding: .day, value: 14, to: weekOne),
              WeekCycle.kind(for: weekTwo) == WeekCycle.kind(for: weekOne) else { return false }
        guard store.ensureSessions(forWeekContaining: weekOne),
              store.ensureSessions(forWeekContaining: weekTwo) else { return false }

        // Reference: one worked generated session + one manual session.
        guard let workedGenerated = store.sessions.first(where: {
            $0.isGeneratedFromWeekPlan && calendar.isDate($0.startAt, inSameDayAs: weekOne)
        }) else { return false }
        guard store.setSessionWorked(
            id: workedGenerated.id,
            worked: true,
            at: workedGenerated.endAt.addingTimeInterval(1)
        ) else { return false }
        guard let saturday = calendar.date(byAdding: .day, value: 5, to: weekTwo),
              let manualStart = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: saturday) else { return false }
        let manual = StudySession(
            domain: .maths,
            title: "Séance manuelle",
            startAt: manualStart,
            endAt: manualStart.addingTimeInterval(3_600)
        )
        guard store.addSession(manual) else { return false }

        // Programme edit: remove the last course slot of the first enabled day
        // and add a sport slot. No Calendar refresh is called afterwards.
        var plan = store.weekPlan(for: WeekCycle.kind(for: weekOne))
        guard let dayIndex = plan.days.firstIndex(where: { $0.isEnabled && $0.courseSlots.count >= 2 }) else { return false }
        let removedSlot = plan.days[dayIndex].courseSlots.removeLast()
        let removedDayID = plan.days[dayIndex].id
        plan.days[dayIndex].sportSlots = [
            PlanningSlot(id: "sport-check", label: "Sport", startMinutes: 1_260, endMinutes: 1_320)
        ]
        guard store.updateWeekPlan(plan) else { return false }

        let generatedWeekTwo = store.sessions.filter {
            $0.isGeneratedFromWeekPlan && $0.startAt >= weekTwo
        }
        let obsoleteRemoved = !store.sessions.contains {
            $0.isGeneratedFromWeekPlan && !$0.isWorked
                && $0.generatedDayID == removedDayID && $0.generatedSlotID == removedSlot.id
        }
        let sportPropagated = [weekOne, weekTwo].allSatisfy { monday in
            store.sessions.contains {
                $0.kind == .sport && $0.isGeneratedFromWeekPlan
                    && $0.startAt >= monday
                    && $0.startAt < calendar.date(byAdding: .day, value: 7, to: monday)!
            }
        }
        // Reload from disk to prove the propagation was persisted.
        let reloaded = AppStore(fileURL: directory.appendingPathComponent("propagation.json"))
        return obsoleteRemoved
            && sportPropagated
            && !generatedWeekTwo.isEmpty
            && store.sessions.contains { $0.id == manual.id && !$0.isGeneratedFromWeekPlan }
            && store.sessions.contains { $0.id == workedGenerated.id && $0.isWorked }
            && reloaded.sessions.contains { $0.id == manual.id }
            && reloaded.sessions.contains { $0.id == workedGenerated.id && $0.isWorked }
    }

    /// If saving fails during a Programme edit, plan, sessions, activities and
    /// materialized weeks must all come back to their previous state.
    private static func checkAutoPropagationRollback(directory: URL) -> Bool {
        let fileURL = directory.appendingPathComponent("propagation-rollback.json")
        let store = AppStore(fileURL: fileURL)
        guard store.ensureSessions(forWeekContaining: WeekCycle.anchor),
              let workedSession = store.sessions.first,
              store.setSessionWorked(
                  id: workedSession.id,
                  worked: true,
                  at: workedSession.endAt.addingTimeInterval(1)
              ) else { return false }

        let sessionIDsBefore = store.sessions.map(\.id)
        let workedStateBefore = Dictionary(uniqueKeysWithValues: store.sessions.map { ($0.id, $0.isWorked) })
        let activityIDsBefore = store.activities.map(\.id)
        let planBefore = store.weekPlan(for: .a)
        var plan = planBefore
        guard let dayIndex = plan.days.firstIndex(where: { $0.isEnabled && !$0.courseSlots.isEmpty }) else { return false }
        plan.days[dayIndex].courseSlots.removeLast()

        // Replace the persistence file with a directory so the atomic write
        // fails after the in-memory reconciliation has started.
        do {
            try FileManager.default.removeItem(at: fileURL)
            try FileManager.default.createDirectory(at: fileURL, withIntermediateDirectories: false)
        } catch {
            return false
        }

        let persisted = store.updateWeekPlan(plan)
        let materializedWeekRestored = store.ensureSessions(forWeekContaining: WeekCycle.anchor)
        return !persisted
            && store.weekPlan(for: .a).days[dayIndex].courseSlots.count == planBefore.days[dayIndex].courseSlots.count
            && store.sessions.map(\.id) == sessionIDsBefore
            && Dictionary(uniqueKeysWithValues: store.sessions.map { ($0.id, $0.isWorked) }) == workedStateBefore
            && store.activities.map(\.id) == activityIDsBefore
            && materializedWeekRestored
            && store.persistenceError != nil
    }
}
