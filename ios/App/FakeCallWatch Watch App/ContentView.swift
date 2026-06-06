import SwiftUI
import Combine
import WatchConnectivity

class WatchSession: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSession()
    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }
    func session(_ s: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}

    func sendTrigger() {
        let msg = ["action": "fakecall"]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(msg, replyHandler: nil)
        } else {
            try? WCSession.default.updateApplicationContext(msg)
        }
        WKInterfaceDevice.current().play(.success)
    }
}

struct ContentView: View {
    @StateObject private var session = WatchSession.shared
    @State private var taps = 0
    @State private var lastTap = Date.distantPast

    var body: some View {
        VStack(spacing: 12) {
            Text("FakeCall").font(.headline)
            Button(action: handleTap) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 38))
                    .frame(maxWidth: .infinity, minHeight: 90)
            }
            .tint(.red)
            Text("Toca 2 veces").font(.caption2).foregroundColor(.gray)
        }
    }

    private func handleTap() {
        let now = Date()
        if now.timeIntervalSince(lastTap) < 0.8 {
            taps += 1
        } else {
            taps = 1
        }
        lastTap = now
        if taps >= 2 {
            taps = 0
            session.sendTrigger()
        }
    }
}
