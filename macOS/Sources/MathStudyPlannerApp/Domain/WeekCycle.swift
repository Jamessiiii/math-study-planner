import Foundation

enum WeekKind: String, CaseIterable, Identifiable {
    case a = "A"
    case b = "B"

    var id: String { rawValue }
    var title: String { "Semaine \(rawValue)" }
}

enum WeekCycle {
    static let timeZone = TimeZone(identifier: "America/Guadeloupe")!
    static let calendar: Calendar = {
        var calendar = Calendar(identifier: .iso8601)
        calendar.locale = Locale(identifier: "fr_FR")
        calendar.timeZone = timeZone
        calendar.firstWeekday = 2
        return calendar
    }()
    static let anchor = calendar.date(from: DateComponents(year: 2026, month: 6, day: 15))!

    static func monday(containing date: Date, calendar: Calendar = WeekCycle.calendar) -> Date {
        let start = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: start)
        let daysSinceMonday = (weekday + 5) % 7
        return calendar.date(byAdding: .day, value: -daysSinceMonday, to: start) ?? start
    }

    static func kind(for date: Date, calendar: Calendar = WeekCycle.calendar) -> WeekKind {
        let anchorMonday = monday(containing: anchor, calendar: calendar)
        let currentMonday = monday(containing: date, calendar: calendar)
        let distance = calendar.dateComponents([.weekOfYear], from: anchorMonday, to: currentMonday).weekOfYear ?? 0
        return abs(distance % 2) == 0 ? .a : .b
    }

    static func days(inWeekContaining date: Date, calendar: Calendar = WeekCycle.calendar) -> [Date] {
        let start = monday(containing: date, calendar: calendar)
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }
}

struct WeekAssignment: Identifiable {
    let dayOffset: Int
    let domain: StudyDomainKind

    var id: Int { dayOffset }

    static func assignments(for kind: WeekKind) -> [WeekAssignment] {
        let domains: [StudyDomainKind] = switch kind {
        case .a: [.maths, .maths, .proba, .proba, .info]
        case .b: [.maths, .maths, .info, .info, .proba]
        }
        return domains.enumerated().map { WeekAssignment(dayOffset: $0.offset, domain: $0.element) }
    }
}
