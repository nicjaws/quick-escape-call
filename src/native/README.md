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

Sin reloj: toca dos veces el boton rojo de la app del iPhone dentro de 0.8 segundos. La llamada se activa localmente con el mismo retardo, sin depender de WCSession.

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
- `ios/App/App/ringtone.caf` (timbre de la notificacion de respaldo)

Archivos del Watch:
- `ios/App/FakeCallWatch Watch App/ContentView.swift`
- `ios/App/FakeCallWatch Watch App/FakeCallWatchApp.swift`

## Activacion con la app cerrada o el iPhone bloqueado

- Al recibir los dos toques del reloj, el iPhone programa una **notificacion local** con el nombre del contacto, el retardo configurado y el timbre `ringtone.caf`. Si la app esta abierta, cancela esa notificacion y muestra la llamada completa como siempre.
- Si la app esta cerrada o el iPhone bloqueado, la notificacion aparece sola tras el retardo; al tocarla, la app se abre directamente en la pantalla de llamada entrante.
- La apertura y la imagen que iOS guarda al pasar a segundo plano quedan negras. El puente conserva la notificación y solo retira esa protección tras pintar la llamada; no debe verse el botón rojo durante la transición. En el Mac, actualiza desde el repositorio, ejecuta `npm run build` y `npx cap sync ios`, reinstala **App** y prueba tocar la notificación tanto tras volver al inicio como tras un arranque nuevo. La transición nativa solo se puede comprobar en Xcode o iPhone.
- La app pide permiso de notificaciones la primera vez; hay que aceptarlo para que este respaldo funcione.
- La app sincroniza nombre y retardo al nativo con `syncSettings` cada vez que cambian los ajustes.

## Limitaciones honestas

- El Watch permanece negro tras los dos toques, sin regreso automatico a los 30 segundos, incluso al volver a abrir la vista. Un toque intencionado devuelve el boton para otra activacion. La pantalla negra no bloquea el reloj ni impide que watchOS muestre sus propias notificaciones.
- Apple no ofrece acceso publico al tono elegido en Ajustes del iPhone ni una lista de los tonos instalados. En Ajustes de FakeCall se puede importar un archivo de audio propio desde Archivos, escucharlo y elegir entre ese tono y el clasico. No cambia el tono de las llamadas reales.
- El audio importado permanece solo en el dispositivo. Se convierte a WAV PCM mono, usando como maximo los primeros 20 segundos para respetar el ciclo de llamada y el limite de sonidos de notificacion de Apple (menos de 30 segundos). Se usa el mismo archivo en la llamada abierta y en la notificacion local. No se puede extraer automaticamente un tono comprado o protegido.
- Para probar estos cambios: actualiza el proyecto local desde el repositorio y ejecuta `npm install`, `npm run build` y `npx cap sync ios`; reinstala los targets App y FakeCallWatch Watch App en Xcode. Comprueba importar, escuchar, reiniciar, activar desde Watch con iPhone abierto y en segundo plano, y volver al tono clasico. No se puede validar el sonido nativo desde el navegador.
- Si la app se cerro deslizandola hacia arriba (forzar cierre), iOS no la despierta: hay que abrirla una vez para que el reloj vuelva a activarla.
- El sonido de una notificacion es mas corto que el timbre completo de la app abierta.
- Apple no permite a una app de terceros mostrar la pantalla de llamada real
  sobre el bloqueo sin una llamada verdadera (CallKit esta reservado a las apps
  de telefonia y exige un servidor). Por eso el respaldo usa notificaciones.

Las pruebas automatizadas de React se ejecutan con `npm test`. Las pruebas de los dos toques del reloj estan en **FakeCallWatch Watch AppTests**; ejecutalas en Xcode. Este entorno no dispone de Xcode para compilar ni verificar la conexion nativa.

## Antes de subir a App Store

- `capacitor.config.ts` sin bloque `server` (ya esta limpio).
- `npm run build && npx cap sync ios`.
- Xcode: **Product → Archive**, luego *Distribute App* → App Store Connect.
- Presentala como herramienta de seguridad personal, no como broma.

## Xcode Cloud: «an out-of-date resolved file was detected»

Este error indica que `Package.resolved` no coincide con las dependencias que
solicita `CapApp-SPM/Package.swift`. No es un error de la cuenta de Apple ni del
emparejamiento del reloj. Las versiones de Capacitor quedan fijadas en 8.3.3;
el archivo de npm se actualiza también para incluir la vibración nativa.

`ios/App/ci_scripts/ci_post_clone.sh` prepara cada copia nueva en Xcode Cloud:
instala Node compatible si hace falta, ejecuta `npm ci`, genera los archivos
de la app, sincroniza iOS y resuelve los paquetes Swift antes del archivado.
Xcode regenera el `originHash` de `Package.resolved`; no se inventa ni se
desactivan las comprobaciones estrictas del archivado.

1. Espera a que los cambios estén en la rama `main` de GitHub.
2. En App Store Connect abre **Xcode Cloud → Workflows → main** y inicia una
   compilación nueva de la última revisión de `main`. No uses **Recompilar**
   sobre la compilación antigua si conserva la revisión que falló.
3. En **Registros**, comprueba que se ejecuta `ci_post_clone.sh` y termina con
   `App assets, native plugins and Swift packages are ready for Xcode Cloud.`
4. Revisa **Archive - iOS** y **Archive - watchOS**. El archivado aún debe
   verificarse en Apple; las pruebas locales no sustituyen ese resultado.

Para actualizar y resolver también en el Mac:

```bash
git pull
npm ci
npm run build
npx cap sync ios
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
npx cap open ios
```

Después de actualizar el proyecto local, `npx cap sync ios` es necesario para
que los cambios lleguen a las apps nativas. Si el flujo de Apple pide acceso
al repositorio público `ionic-team/capacitor-swift-pm`, autorízalo desde los
ajustes de Xcode Cloud. Usa una versión de Xcode cuyo SDK admita la versión
mínima de watchOS configurada en el proyecto.

Guía de Apple: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts
Guía de desarrollo nativo: https://lovable.dev/blog/building-mobile-apps-with-capacitor
