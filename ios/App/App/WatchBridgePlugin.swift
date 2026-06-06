import Foundation
import Capacitor
import WatchConnectivity

@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, WCSessionDelegate {
    public override func load() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    public func session(_ s: WCSession, activationDidCompleteWith st: WCSessionActivationState, error: Error?) {}
    public func sessionDidBecomeInactive(_ s: WCSession) {}
    public func sessionDidDeactivate(_ s: WCSession) { WCSession.default.activate() }

    public func session(_ s: WCSession, didReceiveMessage m: [String: Any]) {
        DispatchQueue.main.async {
            self.bridge?.triggerJSEvent(eventName: "fakecall:trigger", target: "window")
        }
    }

    public func session(_ s: WCSession, didReceiveApplicationContext c: [String: Any]) {
        DispatchQueue.main.async {
            self.bridge?.triggerJSEvent(eventName: "fakecall:trigger", target: "window")
        }
    }
}
