import Capacitor

@objc(AppBridgeViewController)
class AppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // registerPluginType is a no-op when auto-registration is enabled.
        bridge?.registerPluginInstance(WatchBridgePlugin())
    }
}