import Foundation

enum SeedData {
    static func chapters() -> [StudyChapter] {
        [
            StudyChapter(
                id: "l1-01",
                domain: .maths,
                level: "L1",
                blockTitle: "Bloc 0 — Outils fondamentaux et raisonnement",
                title: "Logique et raisonnement",
                summary: "Connecteurs, quantificateurs, contraposée, absurde et récurrence.",
                estimatedHours: 5,
                sequence: 1,
                status: .inProgress
            ),
            StudyChapter(
                id: "ps-01",
                domain: .proba,
                level: "Probabilités",
                blockTitle: "Bloc 1 — Fondamentaux et probabilités",
                title: "Statistique descriptive",
                summary: "Tableaux, indicateurs, dispersion et représentations.",
                estimatedHours: 5,
                sequence: 2
            ),
            StudyChapter(
                id: "info-01",
                domain: .info,
                level: "NSI Première",
                blockTitle: "Bloc 1 — Informatique lycée",
                title: "NSI Première",
                summary: "Variables, conditions, boucles, fonctions et premiers algorithmes.",
                estimatedHours: 8,
                sequence: 3
            )
        ]
    }

    static func sessions(for date: Date = Date()) -> [StudySession] {
        let calendar = WeekCycle.calendar
        let monday = WeekCycle.monday(containing: date)
        let kind = WeekCycle.kind(for: date)
        return WeekAssignment.assignments(for: kind).compactMap { assignment in
            guard
                let day = calendar.date(byAdding: .day, value: assignment.dayOffset, to: monday),
                let start = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: day),
                let end = calendar.date(bySettingHour: 12, minute: 30, second: 0, of: day)
            else { return nil }
            return StudySession(domain: assignment.domain, title: assignment.domain.title, startAt: start, endAt: end)
        }
    }

    static func weekPlans() -> [WeekPlan] {
        WeekKind.allCases.map { kind in
            let domainByOffset = Dictionary(uniqueKeysWithValues: WeekAssignment.assignments(for: kind).map { ($0.dayOffset, $0.domain) })
            let dayDefinitions = [
                ("mon", "Lun", "Lundi"),
                ("tue", "Mar", "Mardi"),
                ("wed", "Mer", "Mercredi"),
                ("thu", "Jeu", "Jeudi"),
                ("fri", "Ven", "Vendredi"),
                ("sat", "Sam", "Samedi"),
                ("sun", "Dim", "Dimanche")
            ]
            let days = dayDefinitions.enumerated().map { offset, definition in
                PlanningDay(
                    id: definition.0,
                    label: definition.1,
                    longLabel: definition.2,
                    domainRawValue: domainByOffset[offset]?.rawValue,
                    isEnabled: offset < 5,
                    courseSlots: offset < 5 ? [PlanningSlot(id: "morning", label: "Matin", startMinutes: 540, endMinutes: 750)] : [],
                    sportSlots: []
                )
            }
            return WeekPlan(id: kind.rawValue, label: kind.title, days: days)
        }
    }
}
