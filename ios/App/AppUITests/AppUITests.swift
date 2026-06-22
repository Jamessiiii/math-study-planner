import XCTest

final class AppUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        XCTAssertTrue(waitForAnyText(["Calendrier", "Progres", "Programmation"]), "The app did not finish launching.")
    }

    func testCoreNavigationAndControls() throws {
        openTab("Calendrier")
        XCTAssertTrue(waitForText("Calendrier"))
        tapCalendarNextWeek()
        XCTAssertTrue(waitForAnyText(["Semaine A", "Semaine B"]))

        openTab("Progres")
        XCTAssertTrue(waitForText("Progres"))
        tapText("Proba")
        XCTAssertTrue(waitForText("Proba"))
        tapText("Info")
        XCTAssertTrue(waitForText("Informatique"))
        tapText("Maths")
        XCTAssertTrue(waitForText("Maths Sup"))

        app.swipeUp()
        XCTAssertTrue(waitForAnyText(["A faire", "En cours", "Fait", "A revoir"]))
        tapVisibleProgressStatus(.active)
        XCTAssertTrue(waitForText("En cours"))
        tapVisibleProgressStatus(.done)
        RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        tapVisibleProgressStatus(.todo)
        RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }

    func testProgrammeScheduleScrollingAndSelectors() throws {
        openTab("Programme")
        XCTAssertTrue(waitForText("Programmation"))

        app.swipeUp()
        XCTAssertTrue(waitForAnyText(["Horaires", "Matiere du jour", "Matin"]))
        XCTAssertTrue(waitForText("Matin"))
        XCTAssertTrue(waitForText("Apres-midi"))

        tapText("+ Soir")
        XCTAssertTrue(waitForAnyText(["Soir", "3 creneaux"]))
        tapText("Defaut")
        if app.alerts.firstMatch.waitForExistence(timeout: 2) {
            app.alerts.firstMatch.buttons.element(boundBy: 1).tap()
        }
        XCTAssertTrue(waitForAnyText(["Matin", "Apres-midi"]))
    }

    private func openTab(_ title: String) {
        tapText(title)
    }

    private func tapCalendarNextWeek() {
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.88, dy: 0.27)).tap()
    }

    private enum ProgressStatusPosition {
        case todo
        case active
        case done

        var xOffset: CGFloat {
            switch self {
            case .todo: return 0.22
            case .active: return 0.42
            case .done: return 0.60
            }
        }
    }

    private func tapVisibleProgressStatus(_ status: ProgressStatusPosition) {
        app.coordinate(withNormalizedOffset: CGVector(dx: status.xOffset, dy: 0.49)).tap()
        RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }

    private func tapText(_ text: String, timeout: TimeInterval = 5) {
        let candidates: [XCUIElement] = [
            app.buttons[text],
            app.staticTexts[text],
            app.links[text],
            app.otherElements[text]
        ]
        if let element = candidates.first(where: { $0.waitForExistence(timeout: timeout) }) {
            element.tap()
            return
        }

        let partial = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
        XCTAssertTrue(partial.waitForExistence(timeout: timeout), "Could not find text: \(text)")
        partial.tap()
    }

    private func waitForText(_ text: String, timeout: TimeInterval = 8) -> Bool {
        app.staticTexts[text].waitForExistence(timeout: timeout)
            || app.buttons[text].waitForExistence(timeout: 0.2)
            || app.descendants(matching: .any)
                .matching(NSPredicate(format: "label CONTAINS %@", text))
                .firstMatch
                .waitForExistence(timeout: 0.2)
    }

    private func waitForAnyText(_ texts: [String], timeout: TimeInterval = 8) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if texts.contains(where: { waitForText($0, timeout: 0.2) }) {
                return true
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return false
    }
}
