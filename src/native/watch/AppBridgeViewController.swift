import Capacitor
import UIKit

@objc(AppBridgeViewController)
class AppBridgeViewController: CAPBridgeViewController {
    private let privacyCover = UIView()

    override func capacitorDidLoad() {
        // Cover before the first web frame, and before iOS captures a resume
        // snapshot. Only React's committed presentation may uncover it.
        privacyCover.backgroundColor = .black
        privacyCover.frame = view.bounds
        privacyCover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        privacyCover.isAccessibilityElement = false
        view.addSubview(privacyCover)
        NotificationCenter.default.addObserver(self, selector: #selector(concealPresentation),
                                               name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(concealPresentation),
                                               name: UIApplication.didEnterBackgroundNotification, object: nil)
        // registerPluginType is a no-op when auto-registration is enabled.
        bridge?.registerPluginInstance(WatchBridgePlugin())
    }

    @objc func concealPresentation() {
        privacyCover.isHidden = false
        view.bringSubviewToFront(privacyCover)
    }

    func revealPresentation() {
        privacyCover.isHidden = true
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}