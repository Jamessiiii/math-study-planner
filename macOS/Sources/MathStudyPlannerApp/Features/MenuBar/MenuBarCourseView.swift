import AppKit
import Combine
import SwiftUI

struct MenuBarCourseLabel: View {
    @ObservedObject var store: AppStore
    @State private var now = Date()
    private let minuteClock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    private let activeClock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Label(labelText, systemImage: "graduationcap.fill")
            .onReceive(minuteClock) { if store.activeStudySession == nil { now = $0 } }
            .onReceive(activeClock) { if store.activeStudySession != nil { now = $0 } }
    }

    private var labelText: String {
        if let active = store.activeStudySession {
            return "\(active.domain.title) · \(StudyTimerFormatting.duration(seconds: active.activeSeconds(at: now)))"
        }
        guard let context = UpcomingCourseService.currentOrNextCourse(
            sessions: store.sessions,
            chapters: store.chapters,
            now: now,
            horizonEnd: UpcomingCourseService.horizonEnd(from: now)
        ) else { return "Aucun cours" }
        if context.state == .inProgress { return "\(context.session.domain.title) · en cours" }
        let start = context.session.startAt
        if WeekCycle.calendar.isDateInToday(start) {
            return "\(context.session.domain.title) · \(time(start))"
        }
        if WeekCycle.calendar.isDateInTomorrow(start) {
            return "\(context.session.domain.title) · demain \(time(start))"
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "EEE"
        return "\(context.session.domain.title) · \(formatter.string(from: start)) \(time(start))"
    }

    private func time(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

struct MenuBarCourseView: View {
    @ObservedObject var store: AppStore
    @ObservedObject var router: AppCommandRouter
    @Environment(\.openWindow) private var openWindow
    @State private var now = Date()
    private let minuteClock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    private let activeClock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var context: UpcomingCourseContext? {
        UpcomingCourseService.currentOrNextCourse(
            sessions: store.sessions,
            chapters: store.chapters,
            now: now,
            horizonEnd: UpcomingCourseService.horizonEnd(from: now)
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let active = store.activeStudySession {
                activeSessionContent(active)
            } else if let context {
                HStack {
                    SessionBadge(session: context.session)
                    Spacer()
                    Text(context.state == .inProgress ? "En cours" : relativeDate(context.session.startAt))
                        .foregroundStyle(.secondary)
                }
                Text(context.session.title)
                    .font(.headline)
                Text(dateAndTime(context.session.startAt, context.session.endAt))
                    .font(.callout.monospacedDigit())
                    .foregroundStyle(.secondary)
                if let chapter = context.chapter {
                    Divider()
                    Text(chapter.blockTitle)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(chapter.title)
                        .font(.callout.weight(.medium))
                    if !chapter.summary.isEmpty {
                        Text(chapter.summary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                }
                Button {
                    store.startStudySession(sessionID: context.session.id)
                } label: {
                    Label("Commencer la séance", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!store.canStartStudySession(context.session, at: now))
                if !store.canStartStudySession(context.session, at: now) {
                    Text("Disponible 15 min avant le cours")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Label("Aucun cours à venir", systemImage: "checkmark.circle")
                    .font(.headline)
                Text("Aucun cours n’est prévu dans les trois semaines affichées.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            Divider()
            if let error = store.operationError {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
            Button {
                openToday()
            } label: {
                Label("Ouvrir Aujourd’hui", systemImage: "arrow.up.forward.app")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(16)
        .frame(width: 330)
        .onAppear {
            now = Date()
            _ = store.ensurePlanningHorizon(from: now, weeksAhead: UpcomingCourseService.defaultWeeksAhead)
        }
        .onReceive(minuteClock) { if store.activeStudySession == nil { now = $0 } }
        .onReceive(activeClock) { if store.activeStudySession != nil { now = $0 } }
    }

    @ViewBuilder
    private func activeSessionContent(_ active: ActiveStudySession) -> some View {
        HStack {
            DomainBadge(domain: active.domain)
            Spacer()
            Text(active.isPaused ? "En pause" : "En cours")
                .foregroundStyle(.secondary)
        }
        Text(StudyTimerFormatting.duration(seconds: active.activeSeconds(at: now)))
            .font(.system(size: 34, weight: .bold, design: .rounded))
            .monospacedDigit()
        if let chapter = active.chapterID.flatMap({ id in store.chapters.first { $0.id == id } }) {
            Text(chapter.title)
                .font(.callout.weight(.medium))
                .lineLimit(2)
        }
        HStack {
            Button {
                if active.isPaused {
                    store.resumeActiveStudySession()
                } else {
                    store.pauseActiveStudySession()
                }
            } label: {
                Label(active.isPaused ? "Reprendre" : "Pause", systemImage: active.isPaused ? "play.fill" : "pause.fill")
            }
            .buttonStyle(.borderedProminent)

            Button("Terminer…") { openToday(completesSession: true) }
                .buttonStyle(.bordered)
        }
    }

    private func openToday(completesSession: Bool = false) {
        if completesSession {
            router.requestSessionCompletion()
        } else {
            router.navigate(to: .today)
        }
        MainWindowPresentation.bringToFront {
            openWindow(id: "main")
        }
    }

    private func relativeDate(_ date: Date) -> String {
        if WeekCycle.calendar.isDateInToday(date) { return "Aujourd’hui" }
        if WeekCycle.calendar.isDateInTomorrow(date) { return "Demain" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "EEEE d MMM"
        return formatter.string(from: date).capitalized(with: formatter.locale)
    }

    private func dateAndTime(_ start: Date, _ end: Date) -> String {
        let day = relativeDate(start)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "HH:mm"
        let startTime = formatter.string(from: start)
        let endTime = formatter.string(from: end)
        return "\(day) · \(startTime)–\(endTime)"
    }
}

@MainActor
private enum MainWindowPresentation {
    private static let windowTitle = "Math Study Planner"

    static func bringToFront(openWindow: () -> Void) {
        NSApp.activate(ignoringOtherApps: true)

        if presentExistingWindow() {
            return
        }

        openWindow()
        DispatchQueue.main.async {
            NSApp.activate(ignoringOtherApps: true)
            _ = presentExistingWindow()
        }
    }

    @discardableResult
    private static func presentExistingWindow() -> Bool {
        guard let window = NSApp.windows.first(where: {
            $0.title == windowTitle && $0.canBecomeKey
        }) else {
            return false
        }

        if window.isMiniaturized {
            window.deminiaturize(nil)
        }
        window.makeKeyAndOrderFront(nil)
        return true
    }
}
