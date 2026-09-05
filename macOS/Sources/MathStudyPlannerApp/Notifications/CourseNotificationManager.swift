@preconcurrency import UserNotifications
import AppKit
import Combine
import Foundation

struct PlannedCourseReminder: Equatable {
    let identifier: String
    let sessionID: UUID
    let fireDate: Date
    let title: String
    let body: String
}

enum CourseReminderPlanner {
    static let identifierPrefix = "course-reminder-"

    static func reminders(
        sessions: [StudySession],
        chapters: [StudyChapter],
        now: Date,
        horizonEnd: Date,
        leadMinutes: Int
    ) -> [PlannedCourseReminder] {
        sessions
            .filter {
                $0.kind == .course
                    && !$0.isWorked
                    && $0.startAt > now
                    && $0.startAt < horizonEnd
                    && $0.startAt.addingTimeInterval(TimeInterval(-leadMinutes * 60)) > now
            }
            .sorted { $0.startAt < $1.startAt }
            .prefix(32)
            .map { session in
                let chapter = UpcomingCourseService.chapter(for: session, in: chapters)
                let body = chapter.map { "\($0.blockTitle) — \($0.title)" }
                    ?? "Votre cours commence bientôt."
                return PlannedCourseReminder(
                    identifier: identifierPrefix + session.id.uuidString,
                    sessionID: session.id,
                    fireDate: session.startAt.addingTimeInterval(TimeInterval(-leadMinutes * 60)),
                    title: "\(session.domain.title) dans \(leadMinutes) min",
                    body: body
                )
            }
    }
}

@MainActor
final class CourseNotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    enum AuthorizationState: Equatable {
        case unknown
        case notRequested
        case authorized
        case denied
        case unavailable

        var label: String {
            switch self {
            case .unknown: "Vérification…"
            case .notRequested: "Non demandée"
            case .authorized: "Autorisées"
            case .denied: "Refusées dans Réglages système"
            case .unavailable: "Disponible dans l’application installée"
            }
        }
    }

    @Published private(set) var isEnabled: Bool
    @Published private(set) var leadMinutes: Int
    @Published private(set) var authorizationState: AuthorizationState = .unknown
    @Published private(set) var pendingReminderCount = 0
    @Published private(set) var lastError: String?

    private let store: AppStore
    private let router: AppCommandRouter
    private let center: UNUserNotificationCenter?
    private let defaults: UserDefaults
    private var sessionsObservation: AnyCancellable?
    private var systemObservation: AnyCancellable?
    private var resynchronizationTask: Task<Void, Never>?

    private static let enabledKey = "courseNotificationsEnabled"
    private static let leadMinutesKey = "courseNotificationLeadMinutes"
    private static let supportedLeadMinutes = [5, 15, 30, 60]

    init(store: AppStore, router: AppCommandRouter, defaults: UserDefaults = .standard) {
        self.store = store
        self.router = router
        self.defaults = defaults
        center = Bundle.main.bundleURL.pathExtension.lowercased() == "app"
            ? UNUserNotificationCenter.current()
            : nil
        isEnabled = defaults.bool(forKey: Self.enabledKey)
        let persistedLead = defaults.integer(forKey: Self.leadMinutesKey)
        leadMinutes = Self.supportedLeadMinutes.contains(persistedLead) ? persistedLead : 15
        super.init()
        center?.delegate = self
        sessionsObservation = store.$revision
            .dropFirst()
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in self?.scheduleResynchronization() }
            }
        let wake = NSWorkspace.shared.notificationCenter
            .publisher(for: NSWorkspace.didWakeNotification)
            .map { _ in () }
            .eraseToAnyPublisher()
        let dayChange = NotificationCenter.default
            .publisher(for: .NSCalendarDayChanged)
            .map { _ in () }
            .eraseToAnyPublisher()
        let clockChange = NotificationCenter.default
            .publisher(for: Notification.Name("NSSystemClockDidChangeNotification"))
            .map { _ in () }
            .eraseToAnyPublisher()
        systemObservation = Publishers.Merge3(wake, dayChange, clockChange)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    _ = self.store.ensurePlanningHorizon(
                        from: Date(),
                        weeksAhead: UpcomingCourseService.defaultWeeksAhead
                    )
                    self.scheduleResynchronization()
                }
            }
        if center == nil {
            authorizationState = .unavailable
        } else {
            Task { await refreshAuthorizationAndSynchronize() }
        }
    }

    deinit {
        resynchronizationTask?.cancel()
    }

    func setEnabled(_ enabled: Bool) {
        guard enabled != isEnabled else { return }
        guard center != nil else {
            lastError = "Les notifications sont disponibles depuis l’application empaquetée."
            return
        }
        if enabled {
            Task { await requestAuthorizationAndEnable() }
        } else {
            isEnabled = false
            defaults.set(false, forKey: Self.enabledKey)
            Task { await removeCourseReminders() }
        }
    }

    func setLeadMinutes(_ minutes: Int) {
        guard Self.supportedLeadMinutes.contains(minutes), minutes != leadMinutes else { return }
        leadMinutes = minutes
        defaults.set(minutes, forKey: Self.leadMinutesKey)
        scheduleResynchronization()
    }

    func openSystemNotificationSettings() {
        guard let url = URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension") else { return }
        NSWorkspace.shared.open(url)
    }

    func synchronize() async {
        guard let center else { return }
        guard isEnabled else {
            await removeCourseReminders()
            return
        }
        let settings = await center.notificationSettings()
        updateAuthorizationState(settings.authorizationStatus)
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
            pendingReminderCount = 0
            return
        }

        _ = store.ensurePlanningHorizon(from: Date(), weeksAhead: UpcomingCourseService.defaultWeeksAhead)
        let now = Date()
        let plans = CourseReminderPlanner.reminders(
            sessions: store.sessions.filter { $0.id != store.activeStudySession?.sessionID },
            chapters: store.chapters,
            now: now,
            horizonEnd: UpcomingCourseService.horizonEnd(from: now),
            leadMinutes: leadMinutes
        )
        await removeCourseReminders()
        do {
            for plan in plans {
                let content = UNMutableNotificationContent()
                content.title = plan.title
                content.body = plan.body
                content.sound = .default
                content.userInfo = ["sessionID": plan.sessionID.uuidString]
                let trigger = UNTimeIntervalNotificationTrigger(
                    timeInterval: max(1, plan.fireDate.timeIntervalSinceNow),
                    repeats: false
                )
                try await center.add(UNNotificationRequest(
                    identifier: plan.identifier,
                    content: content,
                    trigger: trigger
                ))
            }
            pendingReminderCount = plans.count
            lastError = nil
        } catch {
            pendingReminderCount = 0
            lastError = "Rappels non programmés : \(error.localizedDescription)"
        }
    }

    private func requestAuthorizationAndEnable() async {
        guard let center else { return }
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound])
            isEnabled = granted
            defaults.set(granted, forKey: Self.enabledKey)
            authorizationState = granted ? .authorized : .denied
            if granted { await synchronize() }
        } catch {
            isEnabled = false
            defaults.set(false, forKey: Self.enabledKey)
            lastError = "Autorisation impossible : \(error.localizedDescription)"
            await refreshAuthorizationAndSynchronize()
        }
    }

    private func refreshAuthorizationAndSynchronize() async {
        guard let center else {
            authorizationState = .unavailable
            return
        }
        let settings = await center.notificationSettings()
        updateAuthorizationState(settings.authorizationStatus)
        if isEnabled && (settings.authorizationStatus == .denied) {
            isEnabled = false
            defaults.set(false, forKey: Self.enabledKey)
        }
        if isEnabled { await synchronize() }
    }

    private func updateAuthorizationState(_ status: UNAuthorizationStatus) {
        switch status {
        case .notDetermined: authorizationState = .notRequested
        case .authorized, .provisional, .ephemeral: authorizationState = .authorized
        case .denied: authorizationState = .denied
        @unknown default: authorizationState = .unknown
        }
    }

    private func scheduleResynchronization() {
        guard isEnabled else { return }
        resynchronizationTask?.cancel()
        resynchronizationTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await self?.synchronize()
        }
    }

    private func removeCourseReminders() async {
        guard let center else { return }
        let pending = await center.pendingNotificationRequests()
        let identifiers = pending.map(\.identifier).filter { $0.hasPrefix(CourseReminderPlanner.identifierPrefix) }
        if !identifiers.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: identifiers)
        }
        pendingReminderCount = 0
    }

    @objc nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping @Sendable (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    @objc nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping @Sendable () -> Void
    ) {
        Task { @MainActor [weak self] in
            self?.router.navigate(to: .today)
            NSApp.activate(ignoringOtherApps: true)
            NSApp.windows.first(where: { $0.canBecomeKey })?.makeKeyAndOrderFront(nil)
        }
        completionHandler()
    }
}
