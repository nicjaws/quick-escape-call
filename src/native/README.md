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

- Mac con Xcode 15+
- Cuenta de Apple Developer (pagada, 99 USD/anio) para instalar en un dispositivo fisico
- iPhone fisico + Apple Watch emparejado (WCSession **no** funciona entre simuladores)

## 1. Bajar el proyecto en tu Mac

```bash
git clone https://github.com/nicjaws/fakecall.git
cd fakecall
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

1. Abre FakeCall en el iPhone (la app debe estar abierta o en segundo plano).
2. En el Apple Watch abre FakeCall y toca 2 veces rapidas el boton rojo.
3. El iPhone confirma con un pulgar 👍 y, tras el retardo configurado
   (10 s por defecto), suena la llamada entrante.

## Como viaja la senal

```
Watch: ContentView.swift  →  WCSession  →  iPhone: WatchBridgePlugin.swift
                                                     ↓
                                    evento JS "fakecall:trigger" (window)
                                                     ↓
                                    src/hooks/useWatchTrigger.ts
                                                     ↓
                                    src/pages/Index.tsx (cuenta atras → llamada)
```

Archivos nativos del iPhone (ya anadidos al target *App*):
- `ios/App/App/WatchBridgePlugin.swift`
- `ios/App/App/WatchBridgePlugin.m`
- `ios/App/App/App-Bridging-Header.h`

Archivos del Watch:
- `ios/App/FakeCallWatch Watch App/ContentView.swift`
- `ios/App/FakeCallWatch Watch App/FakeCallWatchApp.swift`

## Limitaciones honestas

- Si la app del iPhone esta cerrada del todo, la senal se entrega cuando la
  vuelves a abrir (via `updateApplicationContext`), no en el momento.
- Apple no permite a una app de terceros hacer sonar de verdad el telefono
  desde segundo plano sin una llamada real (CallKit esta reservado a las apps
  de telefonia). Por eso la experiencia completa ocurre con la app abierta.

## Antes de subir a App Store

- `capacitor.config.ts` sin bloque `server` (ya esta limpio).
- `npm run build && npx cap sync ios`.
- Xcode: **Product → Archive**, luego *Distribute App* → App Store Connect.
- Presentala como herramienta de seguridad personal, no como broma.
