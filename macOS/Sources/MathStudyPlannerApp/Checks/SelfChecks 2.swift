import Foundation

enum SelfChecks {
    static func run() -> Bool {
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!

        let anchorIsA = WeekCycle.kind(for: WeekCycle.anchor, calendar: calendar) == .a
        let nextWeek = calendar.date(byAdding: .day, value: 7, to: WeekCycle.anchor)
        let nextWeekIsB = nextWeek.map { WeekCycle.kind(for: $0, calendar: calendar) == .b } ?? false
        let assignmentsMatch = WeekAssignment.assignments(for: .a).map(\.domain) == [
            .maths, .maths, .proba, .proba, .info
        ]
        let seedIsComplete = Set(SeedData.chapters().map(\.domain)) == Set(StudyDomainKind.allCases)

        let checks = [
            ("ancre 2026-06-15 = semaine A", anchorIsA),
            ("semaine suivante = semaine B", nextWeekIsB),
            ("répartition de la semaine A", assignmentsMatch),
            ("données initiales des trois domaines", seedIsComplete)
        ]

        checks.forEach { label, success in
            print("\(success ? "OK" : "ECHEC") — \(label)")
        }
        return checks.allSatisfy(\.1)
    }
}
