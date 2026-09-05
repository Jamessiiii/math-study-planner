import Foundation

struct ProgrammeCatalog: Codable {
    let programmes: [ProgrammeDefinition]
    let domains: [DomainDefinition]
    let weekTemplates: [String: WeekTemplateDefinition]
    let sessionSlots: [SessionSlotDefinition]

    enum CodingKeys: String, CodingKey {
        case programmes = "STUDY_PROGRAM"
        case domains = "STUDY_DOMAINS"
        case weekTemplates = "WEEK_TEMPLATES"
        case sessionSlots = "SESSION_SLOTS"
    }

    var chapters: [StudyChapter] {
        let domainByProgramme = Dictionary(uniqueKeysWithValues: domains.flatMap { domain in
            domain.programIds.map { ($0, StudyDomainKind(rawValue: domain.id) ?? .maths) }
        })

        return programmes.flatMap { programme in
            programme.blocks.enumerated().flatMap { blockIndex, block in
                block.items.map { item in
                    var chapter = StudyChapter(
                        id: item.id,
                        domain: domainByProgramme[programme.id] ?? .maths,
                        level: programme.title,
                        blockTitle: block.title,
                        title: item.title,
                        summary: item.summary,
                        estimatedHours: item.hours,
                        sequence: item.sequence
                    )
                    chapter.programID = programme.id
                    chapter.blockIndex = blockIndex
                    chapter.priority = item.priority
                    chapter.resources = item.resources
                    return chapter
                }
            }
        }
        .sorted { $0.sequence < $1.sequence }
    }

    var plans: [WeekPlan] {
        WeekKind.allCases.compactMap { kind in
            guard let template = weekTemplates[kind.rawValue] else { return nil }
            let slots = sessionSlots.compactMap { slot -> PlanningSlot? in
                guard
                    let start = PlanningSlot.minutes(from: slot.start),
                    let end = PlanningSlot.minutes(from: slot.end)
                else { return nil }
                return PlanningSlot(id: slot.id, label: slot.label, startMinutes: start, endMinutes: end)
            }
            var days = template.days.map { day in
                PlanningDay(
                    id: day.id,
                    label: day.label,
                    longLabel: day.longLabel,
                    domainRawValue: day.domainId,
                    isEnabled: true,
                    courseSlots: slots,
                    sportSlots: []
                )
            }
            days.append(contentsOf: [
                PlanningDay(id: "sat", label: "Sam", longLabel: "Samedi", domainRawValue: nil, isEnabled: false, courseSlots: [], sportSlots: []),
                PlanningDay(id: "sun", label: "Dim", longLabel: "Dimanche", domainRawValue: nil, isEnabled: false, courseSlots: [], sportSlots: [])
            ])
            return WeekPlan(id: kind.rawValue, label: template.label, days: days)
        }
    }
}

struct ProgrammeDefinition: Codable {
    let id: String
    let title: String
    let phase: String
    let sourceUrl: String?
    let blocks: [BlockDefinition]
}

struct BlockDefinition: Codable {
    let title: String
    let items: [ChapterDefinition]
}

struct ChapterDefinition: Codable {
    let id: String
    let title: String
    let summary: String
    let resources: [String]
    let hours: Int
    let priority: Int
    let sequence: Int
}

struct DomainDefinition: Codable {
    let id: String
    let title: String
    let shortTitle: String
    let accent: String
    let programIds: [String]
    let rule: String
}

struct WeekTemplateDefinition: Codable {
    let label: String
    let summary: String
    let days: [WeekDayDefinition]
}

struct WeekDayDefinition: Codable {
    let id: String
    let label: String
    let longLabel: String
    let domainId: String
}

struct SessionSlotDefinition: Codable {
    let id: String
    let label: String
    let start: String
    let end: String
}

enum ProgrammeCatalogLoader {
    static func load() -> ProgrammeCatalog? {
        let resourceBundleName = "MathStudyPlanner_MathStudyPlannerApp.bundle"
        let executableDirectory = URL(fileURLWithPath: ProcessInfo.processInfo.arguments[0])
            .deletingLastPathComponent()
        let candidates: [URL?] = [
            Bundle.main.url(forResource: "programme-catalog", withExtension: "json"),
            Bundle.main.resourceURL?
                .appendingPathComponent(resourceBundleName, isDirectory: true)
                .appendingPathComponent("programme-catalog.json"),
            Bundle.main.bundleURL
                .appendingPathComponent(resourceBundleName, isDirectory: true)
                .appendingPathComponent("programme-catalog.json"),
            executableDirectory
                .appendingPathComponent(resourceBundleName, isDirectory: true)
                .appendingPathComponent("programme-catalog.json")
        ]
        guard let url = candidates.compactMap({ $0 }).first(where: {
            FileManager.default.fileExists(atPath: $0.path)
        }) else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(ProgrammeCatalog.self, from: data)
    }
}
