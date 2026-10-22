//
//  FakeCallWatch_Watch_AppTests.swift
//  FakeCallWatch Watch AppTests
//
//  Created by Nicolas Corbalan Calvo on 10/5/26.
//

import Testing
import Foundation
@testable import FakeCallWatch_Watch_App

@MainActor
struct FakeCallWatch_Watch_AppTests {

    @Test func oneTapDoesNotTrigger() {
        var detector = WatchDoubleTapDetector()
        #expect(detector.registerTap(at: Date(timeIntervalSince1970: 100)) == false)
    }

    @Test func twoTapsWithinPointEightSecondsTrigger() {
        var detector = WatchDoubleTapDetector()
        let start = Date(timeIntervalSince1970: 100)
        #expect(detector.registerTap(at: start) == false)
        #expect(detector.registerTap(at: start.addingTimeInterval(0.79)) == true)
    }

    @Test func twoSlowTapsDoNotTrigger() {
        var detector = WatchDoubleTapDetector()
        let start = Date(timeIntervalSince1970: 100)
        #expect(detector.registerTap(at: start) == false)
        #expect(detector.registerTap(at: start.addingTimeInterval(0.8)) == false)
    }

    @Test func nextTriggerNeedsTwoMoreTaps() {
        var detector = WatchDoubleTapDetector()
        let start = Date(timeIntervalSince1970: 100)
        #expect(detector.registerTap(at: start) == false)
        #expect(detector.registerTap(at: start.addingTimeInterval(0.2)) == true)
        #expect(detector.registerTap(at: start.addingTimeInterval(0.3)) == false)
        #expect(detector.registerTap(at: start.addingTimeInterval(0.4)) == true)
    }
}
