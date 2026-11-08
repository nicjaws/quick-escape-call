# Roadmap — FakeCall

- [ ] Mantener el Watch en negro sin temporizador durante la llamada y sincronizar las fuentes nativas
- [ ] Comprobar acceso a tonos del iPhone y añadir una alternativa compatible en Ajustes sin servidor
- [x] Activar tambien desde iPhone con dos toques, sin necesitar Apple Watch; 11 pruebas React correctas y flujo visible hasta contestar
- [x] Corregir recepción iPhone, registro del puente y confirmación/error de envío desde los dos toques del Watch
- [x] Explicar «Application context data is nil» y evitar usar contexto almacenado como señal de activación
- [x] Verificar recepción con pruebas React (8 correctas) y flujo simulado visible hasta contestar; no verifica WCSession
- [ ] Compilar los targets y ejecutar las pruebas Watch en el Mac de Nicolas (este entorno no dispone de Xcode)
- [x] Conectar el proyecto con Xcode (bundle IDs unificados en `com.nicjaws.fakecall`, plugin del Watch corregido, `npm run build && npx cap sync ios` ejecutado)
- [x] Meter el AppIcon en Assets.xcassets del iPhone y del Apple Watch
- [x] Favicon propio derivado del icono
- [ ] Nicolas: `git pull` en el Mac → `npm install && npm run build && npx cap sync ios` → `npx cap open ios` → elegir Team en Signing & Capabilities → Run en el iPhone
- [ ] Probar el disparo real desde el Apple Watch (2 toques) con hardware
- [x] Activación con app cerrada/bloqueada: notificación local programada con timbre (ringtone.caf), nombre y retardo sincronizados; al tocarla abre la llamada directa (12 pruebas correctas)
- [ ] Nicolas: `git pull` → `npm run build && npx cap sync ios` → Run en iPhone real; aceptar el permiso de notificaciones la primera vez; probar 2 toques en el Watch con la app del iPhone cerrada
- [x] Imagen de búsqueda convertida a PNG; aceptación de Apple pendiente de comprobar al cargar
- [x] Tres composiciones iPhone 1290×2796 con logo y capturas aportadas; inspeccionadas y agrupadas en Files
