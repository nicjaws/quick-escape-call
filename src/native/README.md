# FakeCall — conectar el proyecto con Xcode (iPhone + Apple Watch)

## Identificadores del proyecto (ya configurados)

| Target | Bundle ID |
|---|---|
| iPhone (App) | `com.nicjaws.fakecall` |
| Apple Watch (FakeCallWatch Watch App) | `com.nicjaws.fakecall.watch` |
| Watch Tests | `com.nicjaws.fakecall.watch.tests` |
| Watch UI Tests | `com.nicjaws.fakecall.watch.uitests` |

El ID del Watch empieza con el ID del iPhone: es un requisito de Apple para
poder incrustar la app del reloj dentro de la del movil.

`capacitor.config.ts` usa `appId: 'com.nicjaws.fakecall'`, que coincide con el
target principal de Xcode.

## Requisitos

- Mac con Xcode y runtimes compatibles con las versiones minimas configuradas en el proyecto.
- Cuenta de Apple para la firma; la distribucion por App Store/TestFlight requiere Apple Developer Program.
- Para validar la conexion final: iPhone fisico + Apple Watch emparejado. Dos simuladores abiertos no demuestran que esten emparejados ni que WCSession pueda entregar mensajes.

## 1. Bajar el proyecto en tu Mac

```bash
git clone https://github.com/nicjaws/quick-escape-call.git
cd quick-escape-call
npm install
```

Si ya lo tenias:

```bash
git pull
npm install
```

## 2. Generar la parte web y sincronizar con iOS

```bash
npm run build
npx cap sync ios
```

`npm run build` crea `dist/` y `npx cap sync ios` lo copia dentro del proyecto
de Xcode (`ios/App/public`). Hay que repetir estos dos comandos cada vez que
cambie algo de la interfaz.

## 3. Abrir Xcode

```bash
npx cap open ios
```

Al abrir:

1. Selecciona el target **App** (el del iPhone).
2. Pestana **Signing & Capabilities**:
   - Marca *Automatically manage signing*.
   - Elige tu **Team** (tu cuenta de Apple Developer).
   - Debe aparecer tu iPhone en *Provisioned Devices*.
3. Selecciona el target **FakeCallWatch Watch App** y repite el paso 2
   (mismo Team).
4. Arrastra el iPhone como dispositivo de destino (arriba a la izquierda) y
   pulsa **Run** (⌘R). Xcode instala la app del movil y la del reloj a la vez.

No hace falta configurar App Groups ni Background Modes: la comunicacion va
por `WCSession`, que no necesita capacidades extra.

## 4. Probar

1. Ejecuta primero el esquema **App** para reinstalar tambien el receptor actualizado del iPhone. Deja FakeCall abierta, en primer plano, sin una llamada ni retardo activos.
2. En el Apple Watch abre FakeCall y toca 2 veces rapidas el boton rojo.
3. El reloj muestra 👍 durante un segundo **solo cuando la interfaz del iPhone confirma la activacion**. El iPhone muestra tambien 👍 y, tras el retardo configurado (10 s por defecto), aparece la llamada entrante.
4. Si el reloj muestra **Abre FakeCall en iPhone / Open FakeCall on iPhone**, la sesion no puede entregar el mensaje en ese momento. Comprueba la instalacion en ambos dispositivos y el emparejamiento.
5. Si muestra **iPhone no disponible / iPhone not ready**, el iPhone no ha aceptado la activacion (por ejemplo, hay otra llamada en curso).

En simuladores: **Window → Devices and Simulators → Simulators**, comprueba el reloj emparejado con el iPhone seleccionado. Ejecuta **App** en ese iPhone y despues **FakeCallWatch Watch App** en su reloj. Si la sesion sigue sin estar disponible, prueba con dispositivos fisicos antes de dar la conexion por validada.

### Mensaje «Application context data is nil»

Indica que no existe un contexto de aplicacion almacenado para entregar; por si solo no demuestra un error de instalacion o firma. Los toques son eventos puntuales y ahora usan `sendMessage` con confirmacion y manejo de errores, no `updateApplicationContext`. No se guardan toques para disparar llamadas al abrir la app mucho despues.

En la consola del iPhone, filtra por **WatchBridge**. Debes ver, en orden:

```text
[WatchBridge] Receiver registered
[WatchBridge] Session activated: ...
[WatchBridge] Trigger received
[WatchBridge] iPhone activation accepted: true
```

Si falta el primer mensaje, probablemente sigue instalada una version anterior del iPhone. Si aparece el primero pero no **Trigger received**, revisa el emparejamiento/destino y el error mostrado en el reloj. Las pruebas del navegador no verifican WCSession.

## Como viaja la senal

```
Watch: ContentView.swift  →  WCSession.sendMessage  →  iPhone: WatchBridgePlugin.swift
                                                     ↓
                                    listener Capacitor "trigger" (retenido)
                                                     ↓
                                    src/hooks/useWatchTrigger.ts
                                                     ↓
                                    src/pages/Index.tsx (retardo → llamada)
                                                     ↓
                                    acknowledgeTrigger → respuesta al reloj
```

Archivos nativos del iPhone (ya anadidos al target *App*):
- `ios/App/App/WatchBridgePlugin.swift`
- `ios/App/App/AppBridgeViewController.swift` (registro explicito del puente)
- `ios/App/App/Base.lproj/Main.storyboard` (usa el controlador de la app)
- `ios/App/App/WatchBridgePlugin.m` (archivo de compatibilidad sin registro duplicado)
- `ios/App/App/App-Bridging-Header.h`

Archivos del Watch:
- `ios/App/FakeCallWatch Watch App/ContentView.swift`
- `ios/App/FakeCallWatch Watch App/FakeCallWatchApp.swift`

## Limitaciones honestas

- Si la app del iPhone no esta disponible, no se garantiza una llamada instantanea y el reloj no confirma el envio. El iPhone debe permanecer en primer plano para validar este flujo de extremo a extremo.
- Apple no permite a una app de terceros hacer sonar de verdad el telefono
  desde segundo plano sin una llamada real (CallKit esta reservado a las apps
  de telefonia). Por eso la experiencia completa ocurre con la app abierta.

Las pruebas automatizadas de React se ejecutan con `npm test`. Las pruebas de los dos toques del reloj estan en **FakeCallWatch Watch AppTests**; ejecutalas en Xcode. Este entorno no dispone de Xcode para compilar ni verificar la conexion nativa.

## Antes de subir a App Store

- `capacitor.config.ts` sin bloque `server` (ya esta limpio).
- `npm run build && npx cap sync ios`.
- Xcode: **Product → Archive**, luego *Distribute App* → App Store Connect.
- Presentala como herramienta de seguridad personal, no como broma.
