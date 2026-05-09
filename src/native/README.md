# Guia para compilar FakeCall con Apple Watch

## Requisitos
- Mac con Xcode 14+ instalado
- iPhone fisico (WCSession no funciona en simulador)
- Apple Watch emparejado con el iPhone

## Pasos para compilar

### 1. Preparar el proyecto
```bash
npm install
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

### 2. Agregar el Watch App en Xcode
1. En Xcode, File > New > Target
2. Selecciona "watchOS" > "App"
3. Configura:
   - Product Name: FakeCallWatch
   - Team: Tu equipo de desarrollador
   - Organization: tu nombre
   - Language: Swift
   - Interface: SwiftUI
   - No marques "Include Notification Scene"
4. Click "Finish", luego "Activate" cuando pregunte por el esquema

### 3. Configurar Capabilities
**iOS App target:**
- Selecciona el target principal (App)
- Ve a "Signing & Capabilities"
- Agrega:
  - App Groups (crea un grupo, ej: group.app.lovable.fakecall)
  - Background Modes: marca "Background fetch" y "Remote notifications"

**Watch App target:**
- Selecciona el target del Watch
- Ve a "Signing & Capabilities"
- Agrega el MISMO "App Group" que el iPhone

### 4. Copiar archivos nativos
1. Abre la carpeta del Watch App en Xcode (FakeCallWatch)
2. Reemplaza `ContentView.swift` con el archivo de esta carpeta: `ContentView.swift`
3. En el target iOS principal, agrega:
   - `WatchBridgePlugin.swift`
   - `WatchBridgePlugin.m`
   - Ve a Build Settings > Swift Compiler - Search Paths > Import Paths y agrega `$(PROJECT_DIR)/App/App`

### 5. Conectar Watch con iPhone via WCSession
En `ContentView.swift` del Watch, asegurate de que el `WCSession.default.sendMessage` use el mismo App Group que configuraste.

### 6. Compilar y probar
1. Selecciona el target del Watch App
2. Conecta tu iPhone fisico al Mac
3. Asegurate de que el Apple Watch este emparejado y desbloqueado
4. Click en "Run"
5. En el Apple Watch, abre la app FakeCall
6. Toca 2 veces rapido el boton rojo
7. El iPhone deberia recibir la señal y activar la cuenta atras

## Notas importantes
- WCSession requiere iPhone fisico, no funciona en simulador
- Si no hay conectividad inmediata, el app usa UserDefaults como fallback (la app iPhone lo lee cada 2 segundos)
- La app del Watch requiere solo 2 toques rapidos para activar la llamada falsa
