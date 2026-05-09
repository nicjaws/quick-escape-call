import SwiftUI
import WatchConnectivity

struct ContentView: View {
    @State private var tapCount = 0
    @State private var lastTapTime: Date?
    @State private var statusMessage = "Listo"
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "phone.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 40, height: 40)
                .foregroundColor(.red)
            
            Text("FakeCall")
                .font(.headline)
            
            Text(statusMessage)
                .font(.caption)
                .foregroundColor(.gray)
            
            // Boton grande para 2 toques rapidos
            Button(action: handleTap) {
                ZStack {
                    Circle()
                        .fill(Color.red.opacity(0.2))
                        .frame(width: 80, height: 80)
                    Image(systemName: "phone.fill")
                        .font(.title2)
                        .foregroundColor(.red)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            Text("Toca 2 veces rapido")
                .font(.caption2)
                .foregroundColor(.gray)
        }
    }
    
    private func handleTap() {
        let now = Date()
        let interval = lastTapTime.map { now.timeIntervalSince($0) } ?? 1.0
        
        if interval < 0.6 {
            tapCount += 1
            if tapCount >= 1 {
                triggerFakeCall()
                tapCount = 0
            }
        } else {
            tapCount = 0
        }
        
        lastTapTime = now
    }
    
    private func triggerFakeCall() {
        statusMessage = "Enviando..."
        
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(
                ["action": "fakecall"],
                replyHandler: { _ in
                    statusMessage = "Enviado"
                },
                errorHandler: { _ in
                    statusMessage = "Error"
                }
            )
        } else {
            // Fallback: UserDefaults para iOS leer en foreground
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "watch_fakecall_trigger")
            statusMessage = "Guardado"
        }
        
        // Resetear mensaje despues de 2 segundos
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            statusMessage = "Listo"
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
