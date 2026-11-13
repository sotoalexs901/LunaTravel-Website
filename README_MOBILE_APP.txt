FRESHBORN — MOBILE WEBSITE, INSTALLABLE APP & ASSIGNMENT ALERTS
Preparado: 13 de noviembre de 2026

BASE Y COMPARACIÓN
El ZIP LunaTravel-Website-main(1).zip aportado coincide exactamente con HEAD 6e4fb911d954938b4cec10fe7af22997c1cf087e del repositorio de FreshBorn. Esta actualización se construyó sobre esa base.
AeroHub aportado usa React/Vite, PWA y también Capacitor para app nativa. FreshBorn conserva sus páginas HTML, Netlify y Firebase. Se adaptaron los conceptos de instalación standalone, icono, navegación por cuenta, permisos voluntarios de alertas, registro por dispositivo y actualizaciones.
No se trasladó a FreshBorn ningún Firebase project ID, token, VAPID key, app ID nativo, credencial o información operacional de AeroHub.
Esta entrega instala FreshBorn desde el navegador. No incluye APK, compilación Xcode ni publicación en App Store/Google Play.

QUÉ CAMBIÓ
1. Presentación móvil compartida: formularios, botones, tablas desplazables, menús, espacios del iPhone/iPad y orientación vertical. Se conserva el contenido y la funcionalidad existentes.
2. PWA con manifest, iconos del logo de FreshBorn y acceso /app.html. Al iniciar sesión se abre el espacio correspondiente a staff, cliente o administrador.
3. Menú lateral por tipo de cuenta, accesos inferiores en modo app e instrucciones Install FreshBorn. Las actualizaciones disponibles muestran un botón; no se recarga por sorpresa un borrador de reporte.
4. Bandeja /notifications.html para empleados. Se registran avisos al asignar un cliente diferente y al crear una visita de servicio. El texto push es genérico: no incluye nombres/direcciones de clientes, fotos ni notas.
5. Botón Enable alerts / Alerts on para suscribir o desactivar push en cada dispositivo, con permiso del usuario. Hay controles para cuenta activa, cambio de usuario y cierre de sesión.
6. Entrega mediante Firebase Cloud Messaging con las credenciales de Firebase existentes, independiente de Twilio. Una cola registra fallos de entrega y una Scheduled Function de Netlify reintenta cada cinco minutos.
7. El Client Portal VIP existente ahora muestra las etapas y el resumen aprobado, junto con las fotos seleccionadas. Conserva clima, reloj, datos de cuenta y Crisp VIP Priority Support. Refresca servicio cada 30 segundos mientras esté abierto.
8. Los avisos llevan al empleado a la visita correspondiente. El horario puede refrescarse cuando llega una alerta, respetando un reporte con cambios sin guardar.
9. La programación desde Staff Management incluye una clave de solicitud para que repetir una petición con el mismo formulario no cree una segunda visita tras un fallo de conexión.

INSTALACIÓN / DEPLOY
Usa el paquete manteniendo TODAS las rutas. No reemplaces el sitio con una carpeta que omita archivos actuales.
Se entrega un ZIP completo del website y un ZIP con solo archivos modificados/nuevos. Ninguno incluye .git, credenciales de servidor, node_modules o los archivos de AeroHub.

Archivos importantes nuevos:
  manifest.webmanifest
  sw.js
  app.html
  notifications.html
  offline.html
  css/mobile.css
  assets/freshborn-app.js
  assets/firebase-push-config.js
  assets/app-icon-180.png
  assets/app-icon-192.png
  assets/app-icon-512.png
  netlify/lib/notifications.js
  netlify/functions/app-notifications.js
  netlify/functions/push-dispatch.js

Archivos existentes modificados:
  netlify/functions/service-operations.js
  netlify.toml
  client-portal.html
  staff-management.html
  staff-portal.html
  privacy.html
  Las demás páginas HTML completas reciben los enlaces de manifest, CSS móvil y módulo compartido de app; sus formularios y handlers existentes se conservan.

IMPORTANTE: netlify/lib/notifications.js debe ir en la carpeta lib, hermana de functions. El backend de asignaciones la importa. No subir service-operations.js sin este módulo.
No hay nuevas dependencias npm: se utiliza firebase-admin que ya existe. Netlify instalará las dependencias del package.json actual.
No se modificó package.json ni la versión Firebase JS existente 11.10.0.
Se mantiene hosting en Netlify. No se cambió DNS, dominio ni repositorio remoto y no se hizo deploy desde este trabajo.

FIREBASE: CONFIGURACIÓN NECESARIA PARA PUSH REAL
1. Abre Firebase Console, proyecto freshborn-cleaning.
2. Project settings -> Cloud Messaging -> Web configuration -> Web Push certificates.
3. Si ya existe una clave Web Push para FreshBorn, usa su clave PÚBLICA. Si no existe, Generate Key Pair.
4. En Netlify, Environment variables, agrega:
   Key: FIREBASE_WEB_PUSH_PUBLIC_KEY
   Value: la clave PÚBLICA de Web Push del proyecto FreshBorn.
   Scope: Functions; contexto Production.
   Esta variable es pública por definición. La clave privada del par permanece en Firebase; no se coloca en HTML ni se comparte en el chat.
5. Verifica que Firebase Cloud Messaging API (HTTP v1) esté habilitada. La cuenta de servicio ya configurada en FIREBASE_SERVICE_ACCOUNT_JSON debe pertenecer al proyecto correcto y tener permiso cloudmessaging.messages.create para enviar.
6. Conserva FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_STORAGE_BUCKET y las demás variables existentes. No copies las de AeroHub.
7. Realiza deploy en Netlify después de guardar la variable. Scheduled Functions corren en el deploy publicado, no en un ZIP local ni en el servidor de vista previa.

Sin la clave pública, el website y la bandeja de avisos funcionan, pero el botón indica Alerts setup pending. El envío push queda pendiente. No se ha probado FCM con credenciales reales en esta preparación.
La clave de SMS TWILIO_SMS_ENABLED sigue bajo tu control; no se cambia con esta actualización.

INSTALAR EN IPHONE / IPAD
iOS/iPadOS 16.4 o posterior para Web Push:
- Abrir https://freshborncleaning.com/app.html en Safari.
- Compartir -> Añadir a pantalla de inicio.
- Si aparece Open as Web App, mantenerlo activado; pulsar Añadir.
- Abrir FreshBorn desde su icono.
- Iniciar sesión como empleado activo.
- Pulsar Enable alerts y permitir las notificaciones.
En una pestaña normal de Safari de iPhone/iPad, el botón explica cómo instalar antes de solicitar push.

INSTALAR EN ANDROID
Abrir /app.html en Chrome -> Install FreshBorn o menú -> Instalar app / Añadir a pantalla de inicio. Iniciar sesión y activar alertas.

ESCRITORIO
Chrome/Edge: abrir /app.html y usar Install FreshBorn o la opción Instalar del navegador.
Safari de Mac: Archivo -> Añadir al Dock cuando esté disponible.
El menú y las instrucciones son adaptativos; no todos los navegadores muestran el mismo diálogo de instalación.

PRUEBA COMPLETA DE ACEPTACIÓN
1. Publicar la actualización y configurar la clave pública de Firebase.
2. Con un empleado activo de prueba, abrir /staff-portal.html en el dispositivo e instalar la app donde corresponda.
3. Enable alerts -> permitir. Debe mostrar Alerts on · turn off.
4. Entrar como administrador en otro dispositivo o ventana de prueba.
5. Asignar un cliente diferente a ese empleado. Comprobar que llega Customer assigned y que aparece en su bandeja.
6. Programar una visita. Comprobar New cleaning service. Pulsar la alerta: debe abrir la visita en Staff Portal.
7. Repetir la misma asignación existente: no debe generar otro aviso. Doble envío de la misma solicitud de programación conserva una sola visita.
8. Probar con la app abierta y después en segundo plano, según las opciones de ahorro y notificaciones del sistema.
9. Desactivar alertas con Alerts on · turn off y recargar. Deben permanecer desactivadas para ese usuario/dispositivo hasta que vuelva a elegir Enable alerts.
10. Cerrar sesión. No deben mostrarse detalles de la cuenta anterior. Confirmar el cambio con un segundo usuario de prueba.
11. Revisar que la bandeja sigue recibiendo asignaciones aunque push esté apagado o no soportado.
12. Hacer un ciclo de servicio y aprobación y confirmar el resumen/fotos aprobados dentro del portal VIP actual y el chat Crisp existente.

DATOS, ESTADOS Y REINTENTOS
- users/{uid}/notifications: avisos privados de asignación, fecha y readAt. Se consultan por Function autenticada, no por Firestore abierto al navegador. La UI muestra los últimos 50.
- pushDevices/{sha256(token)}: registro de dispositivo y cuenta, token FCM, active, etiqueta y fecha. Una asociación anterior no puede desactivar el token de otro usuario tras un cambio de cuenta.
- notificationOutbox/{eventId}: estado pending / processing / sent / failed / expired, intentos, lease, dispositivos aceptados y próxima fecha de intento.
- Máximo cinco intentos por trabajo; vence después de 24 horas. Un mensaje sent indica aceptación del proveedor o inbox_only, no confirmación de que el teléfono lo haya mostrado.
- Los tokens expirados rechazados por FCM se desactivan. Las entregas exitosas conocidas no se repiten al reintentar otros dispositivos.
- Los identificadores de evento se usan como tag para evitar apilar repetidamente la misma alerta.
- Un fallo de push no deshace la asignación ni induce al administrador a crear otra visita. La bandeja se conserva.
- El cierre de sesión solicita desregistrar el dispositivo y limpia la asociación local usada por el service worker. Se filtran mensajes de una cuenta que ya no sea la activa.
- Los usuarios controlan los permisos de notificación del sistema. Ahorro de batería, conectividad y configuración del navegador pueden afectar el momento de entrega.
No abrir las colecciones anteriores ni los reportes privados mediante reglas públicas de Firestore/Storage. El backend usa la autenticación y roles actuales; no se relajaron reglas ni permisos de acceso.

OFFLINE Y PRIVACIDAD
El service worker solo almacena recursos estáticos de presentación y una página de conexión requerida. No guarda en CacheStorage respuestas de Functions, páginas privadas, fotos de servicio, enlaces de invitación ni registros de clientes o empleados.
Punch in/out y cambios operativos requieren conexión. No se muestran como guardadas acciones que no llegaron al servidor.
Las notificaciones de pantalla bloqueada contienen un aviso genérico para abrir FreshBorn; los detalles se consultan después de autenticar.
La política de privacidad incluye el uso de registros de dispositivo para notificaciones y las marcas de asistencia/servicio.
Las protecciones y comprobaciones de Storage para las fotos nuevas y antiguas del desarrollo anterior siguen aplicando.

VALIDACIÓN REALIZADA
- Sintaxis JavaScript de todas las páginas y módulos nuevos.
- Manifest, iconos 192/512 y enlaces PWA/CSS/app en las 27 páginas HTML completas. El archivo heredado tracking-mobile.html que solo contiene una URL se dejó intacto.
- Pruebas simuladas: autorización de dispositivos/bandeja, aislamiento de cuentas, asignación e inbox atómicos, solicitudes repetidas, bloqueo por lease, token inválido, envío fallido/reintentos y minimización de datos de push.
- Pruebas simuladas de service worker: cache estática, fallback seguro offline, filtro de cuenta activa, navegación restringida de alertas y activación explícita de actualizaciones.
- Regresión de punch in/out, etapas, reportes, fotos y aprobación; y de invitaciones, Employee Number, consentimiento y SMS.
- Se abrió la nueva pantalla de app y se comprobó la apertura/cierre del menú en el navegador de vista previa. La vista previa no ejecuta las Functions de Netlify y no verifica permisos Firebase reales.
No se ha activado push en un dispositivo real ni se han enviado avisos a empleados reales durante este trabajo. La prueba de aceptación anterior requiere tu deploy y configuración Firebase.

REFERENCIAS VERIFICADAS
Apple Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
Firebase Web Push certificates: https://firebase.google.com/docs/cloud-messaging/web/get-started
Firebase Admin messages: https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
Firebase IAM: https://firebase.google.com/docs/projects/iam/permissions
Netlify Scheduled Functions: https://docs.netlify.com/build/functions/scheduled-functions/

ACCESO ADMINISTRATIVO
admin-login.html ahora dirige al acceso existente de admin.html mediante Firebase. Se retiró el formulario antiguo de usuario/PIN fijo; las cuentas y permisos de Firebase se conservan.
