import SwiftUI

struct CalendarFeatureView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedDate = Date()

    private var weekDays: [Date] { WeekCycle.days(inWeekContaining: selectedDate) }
    private var selectedSessions: [StudySession] {
        store.sessions.filter { Calendar.current.isDate($0.startAt, inSameDayAs: selectedDate) }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            dayStrip
            Divider()
            StudyTimeline(sessions: selectedSessions)
        }
        .navigationTitle("Calendrier")
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(WeekCycle.kind(for: selectedDate).title)
                    .font(.title2.bold())
                Text("Planning automatique · 07 h – 19 h")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                selectedDate = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: selectedDate) ?? selectedDate
            } label: {
                Image(systemName: "chevron.left")
            }
            Button("Aujourd’hui") { selectedDate = Date() }
            Button {
                selectedDate = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: selectedDate) ?? selectedDate
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .buttonStyle(.bordered)
        .padding(20)
    }

    private var dayStrip: some View {
        HStack(spacing: 8) {
            ForEach(weekDays, id: \.self) { day in
                let isSelected = Calendar.current.isDate(day, inSameDayAs: selectedDate)
                Button {
                    selectedDate = day
                } label: {
                    VStack(spacing: 5) {
                        Text(day.formatted(.dateTime.weekday(.abbreviated)))
                            .font(.caption)
                        Text(day.formatted(.dateTime.day()))
                            .font(.title3.bold())
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(isSelected ? Color.accentColor : Color.clear, in: RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(isSelected ? Color.white : Color.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }
}

private struct StudyTimeline: View {
    let sessions: [StudySession]
    private let startHour = 7
    private let endHour = 19
    private let hourHeight: CGFloat = 52

    var body: some View {
        ScrollView {
            ZStack(alignment: .topLeading) {
                hourGrid
                ForEach(sessions) { session in
                    sessionBlock(session)
                }
            }
            .frame(height: CGFloat(endHour - startHour) * hourHeight)
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }

    private var hourGrid: some View {
        VStack(spacing: 0) {
            ForEach(startHour..<endHour, id: \.self) { hour in
                HStack(alignment: .top, spacing: 12) {
                    Text(String(format: "%02d h", hour))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 44, alignment: .trailing)
                        .offset(y: -7)
                    Divider()
                }
                .frame(height: hourHeight, alignment: .top)
                .overlay(alignment: .top) {
                    Divider().padding(.leading, 58)
                }
            }
        }
    }

    private func sessionBlock(_ session: StudySession) -> some View {
        let calendar = Calendar.current
        let start = calendar.dateComponents([.hour, .minute], from: session.startAt)
        let end = calendar.dateComponents([.hour, .minute], from: session.endAt)
        let startMinutes = (start.hour ?? startHour) * 60 + (start.minute ?? 0)
        let endMinutes = (end.hour ?? startHour) * 60 + (end.minute ?? 0)
        let y = CGFloat(startMinutes - startHour * 60) / 60 * hourHeight
        let height = max(42, CGFloat(endMinutes - startMinutes) / 60 * hourHeight)

        return VStack(alignment: .leading, spacing: 4) {
            Text(session.title).font(.headline)
            Text("\(session.startAt.formatted(.dateTime.hour().minute())) – \(session.endAt.formatted(.dateTime.hour().minute()))")
                .font(.caption.monospacedDigit())
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .topLeading)
        .background(AppTheme.color(for: session.domain).gradient, in: RoundedRectangle(cornerRadius: 10))
        .foregroundStyle(.white)
        .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
        .padding(.leading, 70)
        .offset(y: y)
    }
}
