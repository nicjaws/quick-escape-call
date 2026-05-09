import Foundation
import Capacitor
import WatchConnectivity

@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, WCSessionDelegate {
    
    private var session: WCSession?
    
    public override func load() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
        
        // Fallback: leer UserDefaults cada 2 segundos
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            self.checkUserDefaultsFallback()
        }
    }
    
    private func checkUserDefaultsFallback() {
        guard let timestamp = UserDefaults.standard.object(forKey: "watch_fakecall_trigger") as? TimeInterval else { return }
        let elapsed = Date().timeIntervalSince1970 - timestamp
        if elapsed < 5 {
            UserDefaults.standard.removeObject(forKey: "watch_fakecall_trigger")
            self.notifyTrigger()
        }
    }
    
    private func notifyTrigger() {
        self.bridge?.triggerJSEvent(eventName: "fakecall:trigger", target: "window")
    }
    
    // MARK: - WCSessionDelegate
    
    public func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        if message["action"] as? String == "fakecall" {
            DispatchQueue.main.async {
                self.notifyTrigger()
            }
        }
    }
    
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    
    public func sessionDidBecomeInactive(_ session: WCSession) {}
    
    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}
