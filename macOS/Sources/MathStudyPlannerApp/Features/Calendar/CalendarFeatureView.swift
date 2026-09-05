import AppKit
import SwiftUI

struct CalendarFeatureView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var commandRouter: AppCommandRouter
    @State private var selectedDate = Date()
    @State private var selectedSessionID: UUID?
    @State private var editorItem: SessionEditorItem?
    @State private var showsDeleteConfirmation = false
    @State private var showsRefreshConfirmation = false
    @State private var now = Date()
    @State private var handledCommandID: UUID?

    private let clock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    private var weekDays: [Date] {
        WeekCycle.days(inWeekContaining: selectedDate)
    }

    private var selectedSessions: [StudySession] {
        store.sessions
            .filter { WeekCycle.calendar.isDate($0.startAt, inSameDayAs: selectedDate) }
            .sorted { $0.startAt < $1.startAt }
    }

    private var selectedSession: StudySession? {
        guard let selectedSessionID else { return nil }
        return store.sessions.first { $0.id == selectedSessionID }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            dayStrip
            Divider()
            HStack(spacing: 0) {
                StudyTimeline(
                    day: selectedDate,
                    sessions: selectedSessions,
                    selectedSessionID: selectedSessionID,
                    chapterTitle: { chapterTitle(for: $0) },
                    canMarkWorked: { store.canMarkWorked($0, at: now) },
                    canEditDetails: { store.canEditSessionDetails($0, at: now) },
                    canResizeStart: { store.canResizeSessionStart($0, at: now) },
                    canResizeEnd: { store.canResizeSessionEnd($0, at: now) },
                    canDelete: { store.canDeleteSession($0, at: now) },
                    lockMessage: { store.calendarLockMessage(for: $0, at: now) },
                    onSelect: { selectedSessionID = $0.id },
                    onEdit: { session in
                        guard store.canEditSessionDetails(session, at: now) else { return }
                        selectedSessionID = session.id
                        editorItem = SessionEditorItem(session: session, mode: .edit)
                    },
                    onToggleWorked: { session in
                        store.setSessionWorked(id: session.id, worked: !session.isWorked)
                    },
                    onResize: { session in
                        selectedSessionID = session.id
                        store.updateSession(session)
                    },
                    onDelete: { session in
                        guard store.canDeleteSession(session, at: now) else { return }
                        selectedSessionID = session.id
                        showsDeleteConfirmation = true
                    }
                )

                if let selectedSession {
                    Divider()
                    sessionInspector(selectedSession)
                        .frame(width: 290)
                }
            }
        }
        .navigationTitle("Calendrier")
        .sheet(item: $editorItem) { item in
            SessionEditorSheet(
                session: item.session,
                mode: item.mode,
                chapters: store.chapters,
                onSaved: { savedSession in
                    selectedDate = savedSession.startAt
                    selectedSessionID = savedSession.id
                }
            )
            .environmentObject(store)
        }
        .alert(
            "Supprimer cette séance ?",
            isPresented: $showsDeleteConfirmation,
            presenting: selectedSession
        ) { session in
            Button("Supprimer", role: .destructive) {
                store.deleteSession(id: session.id)
                selectedSessionID = nil
            }
            Button("Annuler", role: .cancel) {}
        } message: { session in
            Text("« \(session.title) » sera supprimée définitivement du calendrier.")
        }
        .confirmationDialog(
            "Réparer cette semaine à partir du modèle ?",
            isPresented: $showsRefreshConfirmation
        ) {
            Button("Réparer la semaine") {
                store.refreshGeneratedSessions(forWeekContaining: selectedDate)
                selectedSessionID = nil
            }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Les changements effectués dans Programme sont déjà appliqués automatiquement. Utilisez cette réparation seulement si le calendrier paraît incohérent. Les séances ajoutées à la main et les séances déjà travaillées restent conservées.")
        }
        .onChange(of: selectedDate) {
            selectedSessionID = nil
            store.ensureSessions(forWeekContaining: selectedDate)
        }
        .onAppear {
            store.ensureSessions(forWeekContaining: selectedDate)
            handleCommand(commandRouter.request)
        }
        .onChange(of: commandRouter.request) { _, request in handleCommand(request) }
        .onReceive(clock) { now = $0 }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text(WeekCycle.kind(for: selectedDate).title)
                        .font(.title2.bold())
                    Text(WeekCycle.kind(for: selectedDate) == .a ? "Modèle A" : "Modèle B")
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.accentColor.opacity(0.15), in: Capsule())
                        .help("Les semaines alternent automatiquement entre le modèle A et le modèle B.")
                }
                Text("\(weekRangeLabel) · Alternance automatique A/B")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                moveWeek(by: -1)
            } label: {
                Image(systemName: "chevron.left")
            }
            .help("Semaine précédente")

            Button("Aujourd’hui") {
                selectedDate = Date()
            }

            Button {
                moveWeek(by: 1)
            } label: {
                Image(systemName: "chevron.right")
            }
            .help("Semaine suivante")

            Button {
                showsRefreshConfirmation = true
            } label: {
                Label("Réparer la semaine", systemImage: "arrow.clockwise")
            }
            .help("Reconstruit exceptionnellement cette semaine depuis le modèle \(WeekCycle.kind(for: selectedDate) == .a ? "A" : "B"). Les changements ordinaires de Programme sont synchronisés automatiquement.")

            Button {
                editorItem = SessionEditorItem(session: makeNewSession(), mode: .add)
            } label: {
                Label("Ajouter", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .disabled(!store.canAddSession(makeNewSession(), at: now))
            .help(
                store.canAddSession(makeNewSession(), at: now)
                    ? "Ajouter une séance"
                    : "Impossible d’ajouter un créneau déjà commencé."
            )
        }
        .buttonStyle(.bordered)
        .padding(20)
    }

    private var dayStrip: some View {
        HStack(spacing: 10) {
            ForEach(weekDays, id: \.self) { day in
                let isSelected = WeekCycle.calendar.isDate(day, inSameDayAs: selectedDate)
                let sessionCount = store.sessions.filter {
                    WeekCycle.calendar.isDate($0.startAt, inSameDayAs: day)
                }.count
                let plannedDomain = store.plannedDomain(for: day)

                Button {
                    selectedDate = day
                } label: {
                    VStack(spacing: 6) {
                        Text(day.formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "fr_FR"))))
                            .font(.callout.weight(.semibold))
                        Text(day.formatted(.dateTime.day()))
                            .font(.title2.bold())
                        if let plannedDomain {
                            Text(plannedDomain.title)
                                .font(.caption.bold())
                                .lineLimit(1)
                                .foregroundStyle(isSelected ? Color.white : AppTheme.color(for: plannedDomain))
                        }
                        Text(sessionCount == 0 ? "Libre" : "\(sessionCount) séance\(sessionCount > 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundStyle(isSelected ? Color.white.opacity(0.85) : Color.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .comfortableHitTarget(minHeight: 72)
                    .background(isSelected ? Color.accentColor : Color.clear, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(isSelected ? Color.white : Color.primary)
                    .contentShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(dayAccessibilityLabel(day: day, plannedDomain: plannedDomain, sessionCount: sessionCount))
                .accessibilityAddTraits(.isButton)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    private func dayAccessibilityLabel(day: Date, plannedDomain: StudyDomainKind?, sessionCount: Int) -> String {
        var parts = [day.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "fr_FR")))]
        if let plannedDomain {
            parts.append("domaine prévu : \(plannedDomain.title)")
        }
        parts.append(sessionCount == 0 ? "aucune séance" : "\(sessionCount) séance\(sessionCount > 1 ? "s" : "")")
        return parts.joined(separator: ", ")
    }

    private func chapterTitle(for session: StudySession) -> String? {
        guard let chapterID = session.chapterID else { return nil }
        return store.chapters.first { $0.id == chapterID }?.title
    }

    private func sessionInspector(_ session: StudySession) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    SessionBadge(session: session)
                    Text(session.title)
                        .font(.title3.bold())
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Button {
                    selectedSessionID = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.body.weight(.semibold))
                        .comfortableHitTarget(minHeight: AppTheme.minimumHitTarget)
                        .frame(minWidth: AppTheme.minimumHitTarget)
                }
                .buttonStyle(.plain)
                .help("Fermer")
                .accessibilityLabel("Fermer l’inspecteur")
            }

            VStack(alignment: .leading, spacing: 8) {
                Label(session.kind.title, systemImage: session.kind.systemImage)
                    .foregroundStyle(session.kind == .course ? Color.primary : AppTheme.color(for: session))
                Label(
                    "\(session.startAt.formatted(.dateTime.hour().minute())) – \(session.endAt.formatted(.dateTime.hour().minute()))",
                    systemImage: "clock"
                )
                Label("\(session.durationMinutes) min", systemImage: "hourglass")
                if let chapter = store.chapters.first(where: { $0.id == session.chapterID }) {
                    Label(chapter.title, systemImage: "book.closed")
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let notes = session.notes, !notes.isEmpty {
                    Label(notes, systemImage: "note.text")
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .font(.body)

            if let lockMessage = store.calendarLockMessage(for: session, at: now) {
                Label(lockMessage, systemImage: "lock.fill")
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                if session.startAt <= now && now < session.endAt {
                    Text("Faites glisser uniquement la poignée inférieure pour ajuster l’heure de fin.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            let markable = store.canMarkWorked(session, at: now)
            Button {
                store.setSessionWorked(id: session.id, worked: !session.isWorked)
            } label: {
                Label(
                    session.isWorked ? "Marquée travaillée" : "Marquer travaillée",
                    systemImage: session.isWorked ? "checkmark.circle.fill" : "checkmark.circle"
                )
                .fullWidthHitTarget(alignment: .center)
            }
            .buttonStyle(.borderedProminent)
            .tint(session.isWorked ? .green : AppTheme.color(for: session))
            .disabled(!session.isWorked && !markable)
            .help(
                !session.isWorked && !markable
                    ? "Disponible après la fin de la séance (\(session.endAt.formatted(.dateTime.hour().minute())))."
                    : ""
            )

            if !session.isWorked && !markable {
                Text("Une séance ne peut être marquée travaillée qu’après son heure de fin.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Button {
                    editorItem = SessionEditorItem(session: session, mode: .edit)
                } label: {
                    Label("Modifier", systemImage: "pencil")
                        .comfortableHitTarget()
                }
                .buttonStyle(.bordered)
                .disabled(!store.canEditSessionDetails(session, at: now))
                .help(
                    store.canEditSessionDetails(session, at: now)
                        ? "Modifier la séance"
                        : (store.calendarLockMessage(for: session, at: now) ?? "Modification verrouillée")
                )

                Spacer()

                Button(role: .destructive) {
                    showsDeleteConfirmation = true
                } label: {
                    Label("Supprimer", systemImage: "trash")
                        .comfortableHitTarget()
                }
                .buttonStyle(.bordered)
                .disabled(!store.canDeleteSession(session, at: now))
                .help(
                    store.canDeleteSession(session, at: now)
                        ? "Supprimer la séance"
                        : "Une séance commencée ne peut plus être supprimée."
                )
            }

            Spacer()
        }
        .padding(20)
        .background(AppTheme.windowBackground)
    }

    private var weekRangeLabel: String {
        guard let first = weekDays.first, let last = weekDays.last else { return "" }
        return "\(first.formatted(.dateTime.day().month(.abbreviated))) – \(last.formatted(.dateTime.day().month(.abbreviated).year()))"
    }

    private func moveWeek(by value: Int) {
        selectedDate = WeekCycle.calendar.date(byAdding: .weekOfYear, value: value, to: selectedDate) ?? selectedDate
    }

    private func makeNewSession() -> StudySession {
        let calendar = WeekCycle.calendar
        let dayStart = calendar.startOfDay(for: selectedDate)
        let domain = defaultDomain(for: selectedDate)
        let existingSessions = selectedSessions

        let availableStart = (7..<24).compactMap { hour -> Date? in
            guard let start = calendar.date(byAdding: .hour, value: hour, to: dayStart),
                  let end = calendar.date(byAdding: .hour, value: 1, to: start) else { return nil }
            let overlaps = existingSessions.contains { $0.startAt < end && start < $0.endAt }
            return overlaps || start <= now ? nil : start
        }.first ?? calendar.date(byAdding: .hour, value: 9, to: dayStart) ?? dayStart

        let end = calendar.date(byAdding: .hour, value: 1, to: availableStart) ?? availableStart.addingTimeInterval(3_600)
        var session = StudySession(domain: domain, title: domain.title, startAt: availableStart, endAt: end)
        session.chapterID = store.chapters.first {
            $0.domain == domain && $0.status != .done
        }?.id
        return session
    }

    private func defaultDomain(for date: Date) -> StudyDomainKind {
        store.plannedDomain(for: date) ?? .maths
    }

    private func handleCommand(_ request: AppNavigationRequest) {
        guard request.destination == .calendar,
              request.opensNewSession,
              handledCommandID != request.id else { return }
        handledCommandID = request.id
        let session = makeNewSession()
        guard store.canAddSession(session, at: now) else { return }
        editorItem = SessionEditorItem(session: session, mode: .add)
    }
}

private struct StudyTimeline: View {
    private enum ResizeEdge {
        case start
        case end
    }

    private struct ResizePreview {
        let session: StudySession
        let hasConflict: Bool
    }

    let day: Date
    let sessions: [StudySession]
    let selectedSessionID: UUID?
    let chapterTitle: (StudySession) -> String?
    let canMarkWorked: (StudySession) -> Bool
    let canEditDetails: (StudySession) -> Bool
    let canResizeStart: (StudySession) -> Bool
    let canResizeEnd: (StudySession) -> Bool
    let canDelete: (StudySession) -> Bool
    let lockMessage: (StudySession) -> String?
    let onSelect: (StudySession) -> Void
    let onEdit: (StudySession) -> Void
    let onToggleWorked: (StudySession) -> Void
    let onResize: (StudySession) -> Void
    let onDelete: (StudySession) -> Void

    private let hourHeight: CGFloat = 52
    @State private var resizePreview: ResizePreview?
    private static let timelineCoordinateSpace = "StudyTimelineSpace"

    private var dayStart: Date {
        WeekCycle.calendar.startOfDay(for: day)
    }

    private var startHour: Int {
        let earliestHour = sessions.map { session in
            Int(floor(session.startAt.timeIntervalSince(dayStart) / 3_600))
        }.min() ?? 7
        return min(7, earliestHour)
    }

    private var endHour: Int {
        let latestHour = sessions.map { session in
            Int(ceil(session.endAt.timeIntervalSince(dayStart) / 3_600))
        }.max() ?? 24
        return max(24, latestHour)
    }

    var body: some View {
        ScrollView {
            ZStack(alignment: .topLeading) {
                hourGrid

                if sessions.isEmpty {
                    ContentUnavailableView(
                        "Aucune séance",
                        systemImage: "calendar.badge.plus",
                        description: Text("Utilisez Ajouter pour créer un créneau ce jour-là.")
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.leading, 70)
                    .padding(.top, 70)
                }

                ForEach(sessions) { session in
                    sessionBlock(session)
                }
            }
            .frame(maxWidth: .infinity, minHeight: CGFloat(endHour - startHour) * hourHeight, alignment: .topLeading)
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .coordinateSpace(name: Self.timelineCoordinateSpace)
        }
    }

    private var hourGrid: some View {
        ZStack(alignment: .topLeading) {
            ForEach(startHour...endHour, id: \.self) { hour in
                HStack(spacing: 12) {
                    Text(String(format: "%02d h", hour))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 44, alignment: .trailing)
                    Rectangle()
                        .fill(Color.secondary.opacity(hour == 24 ? 0.35 : 0.18))
                        .frame(height: 1)
                }
                .frame(maxWidth: .infinity)
                .offset(y: CGFloat(hour - startHour) * hourHeight - 7)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func sessionBlock(_ session: StudySession) -> some View {
        let displayedSession = resizePreview?.session.id == session.id
            ? resizePreview?.session ?? session
            : session
        let startMinutes = displayedSession.startAt.timeIntervalSince(dayStart) / 60
        let endMinutes = displayedSession.endAt.timeIntervalSince(dayStart) / 60
        let y = CGFloat(startMinutes - Double(startHour * 60)) / 60 * hourHeight
        let height = max(44, CGFloat(endMinutes - startMinutes) / 60 * hourHeight)
        let isSelected = selectedSessionID == session.id
        let hasConflict = resizePreview?.session.id == session.id && resizePreview?.hasConflict == true
        let chapter = chapterTitle(session)

        return Button {
            onSelect(session)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text(session.title)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    if session.isWorked {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.body.weight(.semibold))
                            .accessibilityHidden(true)
                    }
                    if lockMessage(session) != nil {
                        Image(systemName: "lock.fill")
                            .font(.caption.weight(.semibold))
                            .accessibilityHidden(true)
                    }
                }
                Text("\(displayedSession.startAt.formatted(.dateTime.hour().minute())) – \(displayedSession.endAt.formatted(.dateTime.hour().minute()))")
                    .font(.subheadline.monospacedDigit())
                if let chapter, height >= 62 {
                    Text(chapter)
                        .font(.subheadline)
                        .lineLimit(1)
                        .opacity(0.9)
                }
                Spacer(minLength: 0)
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .topLeading)
            .contentShape(RoundedRectangle(cornerRadius: 10))
            .background(AppTheme.color(for: session).gradient, in: RoundedRectangle(cornerRadius: 10))
            .foregroundStyle(AppTheme.sessionForeground(for: session))
            .opacity(session.isWorked ? 0.78 : 1)
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(
                        hasConflict ? Color.orange : (isSelected ? AppTheme.sessionForeground(for: session) : Color.clear),
                        lineWidth: 3
                    )
                    .shadow(color: isSelected ? Color.black.opacity(0.4) : .clear, radius: 2)
            }
            .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .top) {
            resizeHandle(edge: .start, session: session, isSelected: isSelected)
        }
        .overlay(alignment: .bottom) {
            resizeHandle(edge: .end, session: session, isSelected: isSelected)
        }
        .padding(.leading, 70)
        .offset(y: y)
        .simultaneousGesture(
            TapGesture(count: 2).onEnded {
                if canEditDetails(session) { onEdit(session) }
            }
        )
        .contextMenu {
            Button(session.isWorked ? "Retirer « travaillée »" : "Marquer travaillée") {
                onToggleWorked(session)
            }
            .disabled(!session.isWorked && !canMarkWorked(session))

            Button("Modifier…") {
                onEdit(session)
            }
            .disabled(!canEditDetails(session))

            Divider()

            Button("Supprimer…", role: .destructive) {
                onDelete(session)
            }
            .disabled(!canDelete(session))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel(for: session, chapter: chapter))
        .accessibilityHint(accessibilityHint(for: session))
        .accessibilityAddTraits(.isButton)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder
    private func resizeHandle(edge: ResizeEdge, session: StudySession, isSelected: Bool) -> some View {
        let isEnabled = edge == .start ? canResizeStart(session) : canResizeEnd(session)
        if isEnabled {
            resizeHandleVisual(edge: edge, session: session, isSelected: isSelected)
                .help(edge == .start ? "Faire glisser pour changer l’heure de début" : "Faire glisser pour changer l’heure de fin")
                .onHover { hovering in
                    if hovering {
                        NSCursor.resizeUpDown.set()
                    } else {
                        NSCursor.arrow.set()
                    }
                }
                .gesture(resizeGesture(edge: edge, session: session))
        } else {
            resizeHandleVisual(edge: edge, session: session, isSelected: isSelected)
                .opacity(0.18)
                .help(lockMessage(session) ?? "Horaire verrouillé")
        }
    }

    private func resizeHandleVisual(edge: ResizeEdge, session: StudySession, isSelected: Bool) -> some View {
        ZStack {
            Color.clear
            Capsule()
                .fill(AppTheme.sessionForeground(for: session).opacity(isSelected ? 0.95 : 0.65))
                .frame(width: isSelected ? 54 : 40, height: 4)
        }
        .frame(height: 14)
        .contentShape(Rectangle())
        .accessibilityLabel(edge == .start ? "Redimensionner le début" : "Redimensionner la fin")
    }

    private func resizeGesture(edge: ResizeEdge, session: StudySession) -> some Gesture {
        DragGesture(minimumDistance: 1, coordinateSpace: .named(Self.timelineCoordinateSpace))
            .onChanged { value in
                onSelect(session)
                let resized = resizedSession(
                    session,
                    edge: edge,
                    translation: value.location.y - value.startLocation.y
                )
                resizePreview = ResizePreview(
                    session: resized,
                    hasConflict: overlapsAnotherSession(resized)
                )
            }
            .onEnded { value in
                let resized = resizedSession(
                    session,
                    edge: edge,
                    translation: value.location.y - value.startLocation.y
                )
                resizePreview = nil
                onResize(resized)
                NSCursor.arrow.set()
            }
    }

    private func resizedSession(
        _ session: StudySession,
        edge: ResizeEdge,
        translation: CGFloat
    ) -> StudySession {
        var resized = session
        let quarterHours = Int((translation / hourHeight * 4).rounded())
        let delta = TimeInterval(quarterHours * 15 * 60)
        let minimumDuration: TimeInterval = 15 * 60
        let calendar = WeekCycle.calendar
        let startOfDay = calendar.startOfDay(for: session.startAt)
        let lastMinute = calendar.date(byAdding: .minute, value: 1_439, to: startOfDay)
            ?? startOfDay.addingTimeInterval(86_340)

        switch edge {
        case .start:
            let proposed = session.startAt.addingTimeInterval(delta)
            resized.startAt = min(max(proposed, startOfDay), session.endAt.addingTimeInterval(-minimumDuration))
        case .end:
            let proposed = session.endAt.addingTimeInterval(delta)
            resized.endAt = max(min(proposed, lastMinute), session.startAt.addingTimeInterval(minimumDuration))
        }
        return resized
    }

    private func overlapsAnotherSession(_ candidate: StudySession) -> Bool {
        sessions.contains {
            $0.id != candidate.id
                && $0.startAt < candidate.endAt
                && candidate.startAt < $0.endAt
        }
    }

    private func accessibilityLabel(for session: StudySession, chapter: String?) -> String {
        var parts = [
            session.title,
            session.kind == .course ? session.domain.title : session.kind.title,
            "de \(session.startAt.formatted(.dateTime.hour().minute())) à \(session.endAt.formatted(.dateTime.hour().minute()))"
        ]
        if let chapter {
            parts.append("chapitre : \(chapter)")
        }
        parts.append(session.isWorked ? "travaillée" : "non travaillée")
        return parts.joined(separator: ", ")
    }

    private func accessibilityHint(for session: StudySession) -> String {
        if let message = lockMessage(session) {
            return "Sélectionne la séance. \(message)"
        }
        return "Sélectionne la séance. Faites glisser le bord supérieur ou inférieur pour modifier l’horaire par pas de 15 minutes."
    }
}

private struct SessionEditorItem: Identifiable {
    let id = UUID()
    let session: StudySession
    let mode: SessionEditorMode
}

private enum SessionEditorMode {
    case add
    case edit
}

private struct SessionEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: AppStore
    @State private var draft: StudySession
    @State private var validationMessage: String?

    let mode: SessionEditorMode
    let chapters: [StudyChapter]
    let onSaved: (StudySession) -> Void

    init(
        session: StudySession,
        mode: SessionEditorMode,
        chapters: [StudyChapter],
        onSaved: @escaping (StudySession) -> Void
    ) {
        _draft = State(initialValue: session)
        self.mode = mode
        self.chapters = chapters
        self.onSaved = onSaved
    }

    private var matchingChapters: [StudyChapter] {
        chapters.filter { $0.domain == draft.domain }
    }

    private var domainBinding: Binding<StudyDomainKind> {
        Binding(
            get: { draft.domain },
            set: { newDomain in
                let titleWasAutomatic = draft.title.isEmpty
                    || StudyDomainKind.allCases.map(\.title).contains(draft.title)
                draft.domainRawValue = newDomain.rawValue
                if draft.kind == .course && titleWasAutomatic {
                    draft.title = newDomain.title
                }
                if !chapters.contains(where: { $0.id == draft.chapterID && $0.domain == newDomain }) {
                    draft.chapterID = nil
                }
            }
        )
    }

    private var kindBinding: Binding<SessionKind> {
        Binding(
            get: { draft.kind },
            set: { kind in
                draft.kind = kind
                if kind != .course {
                    draft.chapterID = nil
                    if draft.title.isEmpty
                        || StudyDomainKind.allCases.map(\.title).contains(draft.title)
                        || [SessionKind.sport.title, SessionKind.bike.title].contains(draft.title) {
                        draft.title = kind.title
                    }
                } else if draft.title.isEmpty || [SessionKind.sport.title, SessionKind.bike.title].contains(draft.title) {
                    draft.title = draft.domain.title
                }
            }
        )
    }

    private var notesBinding: Binding<String> {
        Binding(
            get: { draft.notes ?? "" },
            set: { draft.notes = $0.isEmpty ? nil : $0 }
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Séance") {
                    LabeledContent("Aperçu") {
                        SessionBadge(session: draft)
                    }
                    TextField("Titre", text: $draft.title)
                    Picker("Type", selection: kindBinding) {
                        ForEach(SessionKind.allCases) { kind in
                            Text(kind.title).tag(kind)
                        }
                    }
                    .tint(AppTheme.color(for: draft))
                    .contentShape(Rectangle())
                    if draft.kind == .course {
                        Picker("Domaine", selection: domainBinding) {
                            ForEach(StudyDomainKind.allCases) { domain in
                                Text(domain.title).tag(domain)
                            }
                        }
                        .tint(AppTheme.color(for: draft.domain))
                        .contentShape(Rectangle())
                        Picker("Chapitre", selection: $draft.chapterID) {
                            Text("Aucun chapitre").tag(String?.none)
                            ForEach(matchingChapters) { chapter in
                                Text(chapter.title).tag(Optional(chapter.id))
                            }
                        }
                        .contentShape(Rectangle())
                    }
                }

                Section("Horaire") {
                    DatePicker(
                        "Début",
                        selection: $draft.startAt,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    DatePicker(
                        "Fin",
                        selection: $draft.endAt,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    LabeledContent("Durée") {
                        Text("\(draft.durationMinutes) min")
                            .monospacedDigit()
                    }
                }

                Section("Notes") {
                    TextField("Notes facultatives", text: notesBinding, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let validationMessage {
                    Section {
                        Label(validationMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle(mode == .add ? "Nouvelle séance" : "Modifier la séance")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(mode == .add ? "Ajouter" : "Enregistrer") {
                        save()
                    }
                    .keyboardShortcut(.defaultAction)
                }
            }
        }
        .frame(minWidth: 540, idealWidth: 580, minHeight: 500, idealHeight: 560)
        .onAppear {
            store.clearOperationError()
        }
    }

    private func save() {
        draft.title = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        if let notes = draft.notes?.trimmingCharacters(in: .whitespacesAndNewlines) {
            draft.notes = notes.isEmpty ? nil : notes
        }

        guard !draft.title.isEmpty else {
            validationMessage = "Le titre de la séance est obligatoire."
            return
        }
        guard draft.endAt > draft.startAt else {
            validationMessage = "L’heure de fin doit être postérieure à l’heure de début."
            return
        }

        let saved: Bool
        switch mode {
        case .add:
            saved = store.addSession(draft)
        case .edit:
            saved = store.updateSession(draft)
        }

        guard saved, let storedSession = store.sessions.first(where: { $0.id == draft.id }) else {
            validationMessage = store.operationError ?? "La séance n’a pas pu être enregistrée."
            return
        }

        validationMessage = nil
        onSaved(storedSession)
        dismiss()
    }
}
