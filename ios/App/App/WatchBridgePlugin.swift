import Foundation
import Capacitor
import WatchConnectivity

/// Puentes entre el Apple Watch (watchOS) y la app web de Capacitor (iOS).
/// El Watch envia ["action": "fakecall"] y aqui se lanza el evento JS
/// "fakecall:trigger" que escucha src/hooks/useWatchTrigger.ts.
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, WCSessionDelegate {

    public override func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Tambien puede invocarse desde JavaScript: WatchBridge.notifyTrigger()
    @objc func notifyTrigger(_ call: CAPPluginCall) {
        fireTrigger()
        call.resolve()
    }

    private func fireTrigger() {
        bridge?.triggerJSEvent(eventName: "fakecall:trigger", target: "window")
    }

    // MARK: - WCSessionDelegate

    public func session(_ session: WCSession,
                        didReceiveMessage message: [String: Any]) {
        if message["action"] as? String == "fakecall" {
            DispatchQueue.main.async { self.fireTrigger() }
        }
    }

    public func session(_ session: WCSession,
                        didReceiveApplicationContext context: [String: Any]) {
        if context["action"] as? String == "fakecall" {
            DispatchQueue.main.async { self.fireTrigger() }
        }
    }

    public func session(_ session: WCSession,
                        activationDidCompleteWith activationState: WCSessionActivationState,
                        error: Error?) {}

    public func sessionDidBecomeInactive(_ session: WCSession) {}

    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}
