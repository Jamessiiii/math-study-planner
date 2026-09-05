import SwiftUI

struct ProgrammeFeatureView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedWeek: WeekKind = WeekCycle.kind(for: Date())
    @State private var activityEditorItem: ActivityEditorItem?

    private var selectedPlan: WeekPlan {
        store.weekPlan(for: selectedWeek)
    }

    private var enabledDays: [PlanningDay] {
        selectedPlan.days.filter(\.isEnabled)
    }

    private var scheduledHours: Double {
        enabledDays.flatMap(\.courseSlots).reduce(0) { total, slot in
            total + Double(max(0, slot.endMinutes - slot.startMinutes)) / 60
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                weekSummary
                modelScopeCard

                VStack(spacing: 12) {
                    ForEach(selectedPlan.days) { day in
                        dayEditor(day)
                    }
                }

                if let error = store.operationError {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }

                Label(
                    "Chaque modification est enregistrée automatiquement dans le planning local.",
                    systemImage: "externaldrive.fill.badge.checkmark"
                )
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(maxWidth: 1100, alignment: .leading)
        }
        .navigationTitle("Programme")
        .sheet(item: $activityEditorItem) { item in
            ActivityTimeEditor(item: item) { slot in
                updateActivitySlot(slot, kind: item.kind, dayID: item.dayID, week: item.week)
            }
        }
    }

    private var modelScopeCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Ce que modifie cet écran", systemImage: "info.circle")
                .font(.subheadline.weight(.semibold))
            Text(
                "Le Programme définit le modèle récurrent des semaines \(WeekKind.a.title) et \(WeekKind.b.title). Chaque modification est appliquée immédiatement au Calendrier, y compris aux semaines déjà générées. Vos séances ajoutées à la main et vos séances déjà travaillées sont toujours conservées."
            )
            .font(.footnote)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Programmation hebdomadaire")
                    .font(.largeTitle.bold())
                Text("Activez les jours utiles et réglez leurs créneaux de travail (0 à 4 par jour).")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text("ALTERNANCE")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                Picker("Semaine", selection: $selectedWeek) {
                    ForEach(WeekKind.allCases) { week in
                        Text(week.title).tag(week)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 280)
                .controlSize(.large)
                .comfortableHitTarget()
            }
        }
    }

    private var weekSummary: some View {
        HStack(spacing: 12) {
            summaryCard(
                title: "Jours actifs",
                value: "\(enabledDays.count)",
                systemImage: "calendar.badge.checkmark"
            )
            summaryCard(
                title: "Temps programmé",
                value: scheduledHours.formatted(.number.precision(.fractionLength(0...1))) + " h",
                systemImage: "clock"
            )

            VStack(alignment: .leading, spacing: 8) {
                Text("Répartition")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    ForEach(StudyDomainKind.allCases) { domain in
                        let count = enabledDays.filter { $0.domain == domain }.count
                        HStack(spacing: 5) {
                            Circle()
                                .fill(AppTheme.color(for: domain))
                                .frame(width: 8, height: 8)
                            Text("\(domain.title) · \(count)")
                                .font(.caption)
                        }
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
            .background(.background, in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func summaryCard(title: String, value: String, systemImage: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.title)
                .foregroundStyle(Color.accentColor)
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title.bold())
                    .monospacedDigit()
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(minWidth: 180, minHeight: 88, alignment: .leading)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
    }

    private func dayEditor(_ day: PlanningDay) -> some View {
        let accent = AppTheme.color(for: day.domain ?? .maths)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                Toggle(isOn: enabledBinding(for: day.id)) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(day.longLabel)
                            .font(.title3.weight(.semibold))
                        Text(day.isEnabled ? "Journée active" : "Journée désactivée")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .toggleStyle(.switch)
                .controlSize(.large)
                .frame(width: 210, alignment: .leading)
                .comfortableHitTarget()

                Divider()
                    .frame(height: 44)

                HStack(spacing: 8) {
                    Text("Domaine")
                        .foregroundStyle(.secondary)
                    Picker("Domaine", selection: domainBinding(for: day.id)) {
                        ForEach(StudyDomainKind.allCases) { domain in
                            Text(domain.title).tag(domain)
                        }
                    }
                    .labelsHidden()
                    .controlSize(.large)
                    .frame(width: 190)
                    .comfortableHitTarget()
                }
                .disabled(!day.isEnabled)

                Spacer()

                if day.isEnabled, let domain = day.domain {
                    DomainBadge(domain: domain)
                }
            }

            courseSlotsSection(day: day, accent: accent)
                .disabled(!day.isEnabled)
                .opacity(day.isEnabled ? 1 : 0.48)

            activityEditor(day: day, kind: .sport)
                .disabled(!day.isEnabled)
                .opacity(day.isEnabled ? 1 : 0.48)

            activityEditor(day: day, kind: .bike)
                .disabled(!day.isEnabled)
                .opacity(day.isEnabled ? 1 : 0.48)
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 14))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
                .fill(day.isEnabled ? accent : Color.secondary.opacity(0.3))
                .frame(width: 4)
                .padding(.vertical, 12)
        }
    }

    private func courseSlotsSection(day: PlanningDay, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Créneaux de cours (\(day.courseSlots.count)/4)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    addCourseSlot(dayID: day.id)
                } label: {
                    Label("Ajouter un créneau", systemImage: "plus.circle.fill")
                        .font(.callout.weight(.semibold))
                        .comfortableHitTarget()
                }
                .buttonStyle(.borderless)
                .controlSize(.large)
                .disabled(day.courseSlots.count >= 4)
                .help(day.courseSlots.count >= 4
                    ? "Maximum de 4 créneaux de cours par jour"
                    : "Ajouter un créneau de cours")
            }

            if day.courseSlots.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "clock.badge.questionmark")
                        .foregroundStyle(.secondary)
                    Text("Aucun créneau de cours ce jour. Utilisez « Ajouter un créneau » pour en programmer un.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            } else {
                let columns = [GridItem(.adaptive(minimum: 260), spacing: 12)]
                LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
                    ForEach(Array(day.courseSlots.enumerated()), id: \.element.id) { slotIndex, slot in
                        slotEditor(
                            dayID: day.id,
                            slotIndex: slotIndex,
                            slot: slot,
                            accent: accent
                        )
                    }
                }
            }
        }
    }

    private func activityEditor(day: PlanningDay, kind: SessionKind) -> some View {
        let slot = day.sportSlots.first { $0.activityKind == kind }
        let color = AppTheme.color(for: kind)
        let activityName = kind.title.lowercased()
        return HStack(spacing: 14) {
            if let slot {
                Label(kind.title, systemImage: kind.systemImage)
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(color)
                    .frame(width: 240, alignment: .leading)

                Text("\(slot.startLabel) – \(slot.endLabel)")
                    .font(.body.weight(.semibold).monospacedDigit())
                    .foregroundStyle(color)

                Button {
                    presentActivityEditor(for: day, kind: kind)
                } label: {
                    Label("Modifier les horaires", systemImage: "clock.badge.checkmark")
                }
                .buttonStyle(.bordered)
                .tint(color)
                .controlSize(.large)

                Button(role: .destructive) {
                    removeActivitySlot(dayID: day.id, kind: kind)
                } label: {
                    Image(systemName: "trash")
                        .frame(width: AppTheme.minimumHitTarget, height: AppTheme.minimumHitTarget)
                }
                .buttonStyle(.borderless)
                .help("Supprimer le créneau \(activityName)")
            } else {
                Button {
                    presentActivityEditor(for: day, kind: kind)
                } label: {
                    Label("Ajouter un créneau \(activityName)", systemImage: kind.systemImage)
                        .font(.callout.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(color)
                .controlSize(.large)

                Text("Choisissez librement l’heure de début et l’heure de fin.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(14)
        .background(
            color.opacity(slot == nil ? 0.05 : 0.10),
            in: RoundedRectangle(cornerRadius: 10)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(color.opacity(slot == nil ? 0.25 : 0.55), lineWidth: 1)
        }
    }

    private func slotEditor(
        dayID: String,
        slotIndex: Int,
        slot: PlanningSlot,
        accent: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                Label(slot.label, systemImage: slotIndex == 0 ? "sunrise" : "sun.max")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(accent)
                Spacer()
                Text("\(slot.startLabel) – \(slot.endLabel)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                Button {
                    removeCourseSlot(dayID: dayID, slotID: slot.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .frame(width: AppTheme.minimumHitTarget, height: AppTheme.minimumHitTarget)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.borderless)
                .controlSize(.large)
                .foregroundStyle(.secondary)
                .help("Supprimer ce créneau")
                .accessibilityLabel("Supprimer le créneau \(slot.label)")
            }

            HStack(spacing: 10) {
                timeControl(
                    label: "Début",
                    selection: timeBinding(dayID: dayID, slotIndex: slotIndex, isStart: true)
                )
                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                timeControl(
                    label: "Fin",
                    selection: timeBinding(dayID: dayID, slotIndex: slotIndex, isStart: false)
                )
            }
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(accent.opacity(0.07), in: RoundedRectangle(cornerRadius: 10))
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(accent.opacity(0.16), lineWidth: 1)
        }
    }

    private func timeControl(
        label: String,
        selection: Binding<Date>,
        tint: Color? = nil
    ) -> some View {
        HStack(spacing: 7) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(tint ?? Color.secondary)
            DatePicker(label, selection: selection, displayedComponents: .hourAndMinute)
                .labelsHidden()
                .datePickerStyle(.field)
                .monospacedDigit()
                .controlSize(.large)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 7))
        .overlay {
            if let tint {
                RoundedRectangle(cornerRadius: 7)
                    .stroke(tint.opacity(0.45), lineWidth: 1)
            }
        }
    }

    private func enabledBinding(for dayID: String) -> Binding<Bool> {
        Binding(
            get: { day(withID: dayID)?.isEnabled ?? false },
            set: { isEnabled in
                updateDay(withID: dayID) { day in
                    day.isEnabled = isEnabled
                    if isEnabled, day.domain == nil {
                        day.domain = .maths
                    }
                }
            }
        )
    }

    private func domainBinding(for dayID: String) -> Binding<StudyDomainKind> {
        Binding(
            get: { day(withID: dayID)?.domain ?? .maths },
            set: { domain in
                updateDay(withID: dayID) { $0.domain = domain }
            }
        )
    }

    private func timeBinding(dayID: String, slotIndex: Int, isStart: Bool) -> Binding<Date> {
        Binding(
            get: {
                guard let day = day(withID: dayID), day.courseSlots.indices.contains(slotIndex) else {
                    return date(for: 540)
                }
                let slot = day.courseSlots[slotIndex]
                return date(for: isStart ? slot.startMinutes : slot.endMinutes)
            },
            set: { newDate in
                let minutes = minutes(in: newDate)
                updateDay(withID: dayID) { day in
                    guard day.courseSlots.indices.contains(slotIndex) else { return }
                    if isStart {
                        day.courseSlots[slotIndex].startMinutes = min(
                            minutes,
                            max(0, day.courseSlots[slotIndex].endMinutes - 15)
                        )
                    } else {
                        day.courseSlots[slotIndex].endMinutes = min(
                            1_439,
                            max(minutes, day.courseSlots[slotIndex].startMinutes + 15)
                        )
                    }
                }
            }
        )
    }

    private func day(withID dayID: String) -> PlanningDay? {
        store.weekPlan(for: selectedWeek).days.first { $0.id == dayID }
    }

    private func updateDay(withID dayID: String, mutation: (inout PlanningDay) -> Void) {
        updateDay(withID: dayID, week: selectedWeek, mutation: mutation)
    }

    private func updateDay(
        withID dayID: String,
        week: WeekKind,
        mutation: (inout PlanningDay) -> Void
    ) {
        var plan = store.weekPlan(for: week)
        guard let index = plan.days.firstIndex(where: { $0.id == dayID }) else { return }
        mutation(&plan.days[index])
        store.updateWeekPlan(plan)
    }

    private func presentActivityEditor(for day: PlanningDay, kind: SessionKind) {
        let slot = day.sportSlots.first { $0.activityKind == kind }
        activityEditorItem = ActivityEditorItem(
            week: selectedWeek,
            dayID: day.id,
            dayLabel: day.longLabel,
            kind: kind,
            slot: slot,
            occupiedSlots: day.courseSlots + day.sportSlots.filter { $0.id != slot?.id }
        )
    }

    private func updateActivitySlot(
        _ slot: PlanningSlot,
        kind: SessionKind,
        dayID: String,
        week: WeekKind
    ) -> Bool {
        var plan = store.weekPlan(for: week)
        guard let index = plan.days.firstIndex(where: { $0.id == dayID }) else { return false }
        if let slotIndex = plan.days[index].sportSlots.firstIndex(where: { $0.activityKind == kind }) {
            plan.days[index].sportSlots[slotIndex] = slot
        } else {
            plan.days[index].sportSlots.append(slot)
        }
        return store.updateWeekPlan(plan)
    }

    private func removeActivitySlot(dayID: String, kind: SessionKind) {
        updateDay(withID: dayID) { day in
            day.sportSlots.removeAll { $0.activityKind == kind }
        }
    }

    private func addCourseSlot(dayID: String) {
        updateDay(withID: dayID) { day in
            guard day.courseSlots.count < 4 else { return }
            let existing = (day.courseSlots + day.sportSlots)
                .sorted { $0.startMinutes < $1.startMinutes }
            let newSlot = makeAvailableSlot(
                avoiding: existing,
                ordinal: day.courseSlots.count + 1
            )
            day.courseSlots.append(newSlot)
        }
    }

    private func removeCourseSlot(dayID: String, slotID: String) {
        updateDay(withID: dayID) { day in
            day.courseSlots.removeAll { $0.id == slotID }
        }
    }

    /// Finds a free 90-minute window that does not overlap existing slots,
    /// so the store's overlap validation accepts the new slot directly.
    private func makeAvailableSlot(avoiding existing: [PlanningSlot], ordinal: Int) -> PlanningSlot {
        let duration = 90
        var candidateStart = 540
        for slot in existing {
            if candidateStart + duration <= slot.startMinutes {
                break
            }
            candidateStart = max(candidateStart, slot.endMinutes)
        }
        if candidateStart + duration > 1_440 {
            candidateStart = max(0, 1_440 - duration)
        }
        return PlanningSlot(
            id: "slot-\(UUID().uuidString.prefix(8))",
            label: "Créneau \(ordinal)",
            startMinutes: candidateStart,
            endMinutes: min(1_440, candidateStart + duration)
        )
    }

    private func date(for minutes: Int) -> Date {
        let calendar = WeekCycle.calendar
        let startOfDay = calendar.startOfDay(for: Date())
        return calendar.date(byAdding: .minute, value: minutes, to: startOfDay) ?? startOfDay
    }

    private func minutes(in date: Date) -> Int {
        let components = WeekCycle.calendar.dateComponents([.hour, .minute], from: date)
        return (components.hour ?? 0) * 60 + (components.minute ?? 0)
    }
}

private struct ActivityEditorItem: Identifiable {
    let week: WeekKind
    let dayID: String
    let dayLabel: String
    let kind: SessionKind
    let slot: PlanningSlot?
    let occupiedSlots: [PlanningSlot]

    var id: String { "\(week.rawValue)-\(dayID)-\(kind.rawValue)" }
}

private struct ActivityTimeEditor: View {
    private struct FreeWindow: Identifiable {
        let start: Int
        let end: Int

        var id: String { "\(start)-\(end)" }
        var label: String {
            "\(PlanningSlot.timeLabel(minutes: start)) – \(PlanningSlot.timeLabel(minutes: end))"
        }
    }

    @Environment(\.dismiss) private var dismiss
    let item: ActivityEditorItem
    let onSave: (PlanningSlot) -> Bool
    @State private var startMinutes: Int
    @State private var endMinutes: Int

    init(item: ActivityEditorItem, onSave: @escaping (PlanningSlot) -> Bool) {
        self.item = item
        self.onSave = onSave
        let initial = item.slot ?? Self.suggestedSlot(avoiding: item.occupiedSlots, kind: item.kind)
        _startMinutes = State(initialValue: initial.startMinutes)
        _endMinutes = State(initialValue: initial.endMinutes)
    }

    private var freeWindows: [FreeWindow] {
        Self.freeWindows(around: item.occupiedSlots)
    }

    private var overlappingSlot: PlanningSlot? {
        item.occupiedSlots.first {
            $0.startMinutes < endMinutes && startMinutes < $0.endMinutes
        }
    }

    private var validationMessage: String? {
        if endMinutes <= startMinutes {
            return "L’heure de fin doit être postérieure à l’heure de début."
        }
        if endMinutes - startMinutes < 15 {
            return "Prévoyez au moins 15 minutes pour la séance de \(item.kind.title.lowercased())."
        }
        if let overlappingSlot {
            return "Ce créneau chevauche « \(overlappingSlot.label) » (\(overlappingSlot.startLabel)–\(overlappingSlot.endLabel))."
        }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 5) {
                Label("Horaires du \(item.kind.title.lowercased())", systemImage: item.kind.systemImage)
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.color(for: item.kind))
                Text("\(item.dayLabel) · \(item.week.title)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 18) {
                timePicker("Début", minutes: $startMinutes)
                Image(systemName: "arrow.right")
                    .foregroundStyle(AppTheme.color(for: item.kind))
                timePicker("Fin", minutes: $endMinutes)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Plages libres ce jour")
                    .font(.subheadline.weight(.semibold))
                if freeWindows.isEmpty {
                    Text("Aucune plage libre d’au moins 15 minutes.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(freeWindows) { window in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                            Text(window.label)
                                .monospacedDigit()
                            Spacer()
                            Button("Utiliser") {
                                startMinutes = Self.preferredStart(in: window)
                                endMinutes = min(window.end, startMinutes + 60)
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                }
            }
            .padding(14)
            .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 10))

            if let validationMessage {
                Label(validationMessage, systemImage: "exclamationmark.triangle.fill")
                    .font(.callout)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Label("Ce créneau est libre et sera appliqué immédiatement au Calendrier.", systemImage: "checkmark.circle.fill")
                    .font(.callout)
                    .foregroundStyle(.green)
            }

            HStack {
                Spacer()
                Button("Annuler") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Enregistrer") {
                    var slot = PlanningSlot(
                        id: item.slot?.id ?? "\(item.kind.rawValue)-\(UUID().uuidString.prefix(8))",
                        label: item.slot?.label ?? item.kind.title,
                        startMinutes: startMinutes,
                        endMinutes: endMinutes
                    )
                    slot.activityKind = item.kind
                    if onSave(slot) { dismiss() }
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.color(for: item.kind))
                .keyboardShortcut(.defaultAction)
                .disabled(validationMessage != nil)
            }
        }
        .padding(24)
        .frame(width: 560)
    }

    private func timePicker(_ label: String, minutes: Binding<Int>) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.subheadline.weight(.semibold))
            DatePicker(
                label,
                selection: Binding(
                    get: { Self.date(for: minutes.wrappedValue) },
                    set: { minutes.wrappedValue = Self.minutes(in: $0) }
                ),
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .datePickerStyle(.field)
            .monospacedDigit()
            .controlSize(.large)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.color(for: item.kind).opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(AppTheme.color(for: item.kind).opacity(0.4), lineWidth: 1)
        }
    }

    private static func suggestedSlot(avoiding occupied: [PlanningSlot], kind: SessionKind) -> PlanningSlot {
        let windows = freeWindows(around: occupied)
        let preferred = windows.first(where: { $0.start <= 1_080 && $0.end >= 1_140 })
            ?? windows.first(where: { $0.end - $0.start >= 60 })
            ?? windows.first
        let start = preferred.map(preferredStart(in:)) ?? 1_080
        let end = preferred.map { min($0.end, start + 60) } ?? 1_140
        var slot = PlanningSlot(
            id: kind.rawValue,
            label: kind.title,
            startMinutes: start,
            endMinutes: end
        )
        slot.activityKind = kind
        return slot
    }

    private static func preferredStart(in window: FreeWindow) -> Int {
        let evening = 1_080
        if window.start <= evening && evening + 60 <= window.end { return evening }
        return window.start
    }

    private static func freeWindows(around occupied: [PlanningSlot]) -> [FreeWindow] {
        let sorted = occupied
            .map { FreeWindow(start: max(0, $0.startMinutes), end: min(1_440, $0.endMinutes)) }
            .filter { $0.end > $0.start }
            .sorted { $0.start < $1.start }
        var merged: [FreeWindow] = []
        for window in sorted {
            if let last = merged.last, window.start <= last.end {
                merged[merged.count - 1] = FreeWindow(start: last.start, end: max(last.end, window.end))
            } else {
                merged.append(window)
            }
        }
        var result: [FreeWindow] = []
        var cursor = 0
        for window in merged {
            if window.start - cursor >= 15 {
                result.append(FreeWindow(start: cursor, end: window.start))
            }
            cursor = max(cursor, window.end)
        }
        if 1_440 - cursor >= 15 {
            result.append(FreeWindow(start: cursor, end: 1_440))
        }
        return result
    }

    private static func date(for minutes: Int) -> Date {
        let startOfDay = WeekCycle.calendar.startOfDay(for: Date())
        return WeekCycle.calendar.date(byAdding: .minute, value: minutes, to: startOfDay) ?? startOfDay
    }

    private static func minutes(in date: Date) -> Int {
        let components = WeekCycle.calendar.dateComponents([.hour, .minute], from: date)
        return (components.hour ?? 0) * 60 + (components.minute ?? 0)
    }
}
