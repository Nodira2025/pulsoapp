# PULSO

Espacio de trabajo compartido para el equipo de PULSO. Interfaz de escritorio con navegación lateral y calendario semanal; interfaz móvil con navegación inferior, tarjetas y formularios por pasos.

**Aplicación:** https://nodira2025.github.io/pulsoapp/

## Incluye

- Apariencia día, noche o automática, con preferencia guardada en el dispositivo. Colores y degradados alineados con la web de PULSO.
- Bienvenida para instalar la PWA y activar notificaciones. Ofrece instalación nativa cuando el navegador la permite, instrucciones alternativas y ayuda si el permiso está bloqueado. «Ahora no» pospone el aviso siete días; se puede reabrir desde Mi perfil.

- Perfiles con foto, nombre, teléfono y presentación. Acceso individual con Supabase Auth. Cambio de contraseña temporal al primer ingreso.
- Empresas con logo, contacto, ubicación, redes, notas y archivos. Se conserva quién las incorporó.
- Múltiples proyectos por empresa: responsables, presupuesto, fechas, estado, tareas, avance calculado y Gantt. Enlaces a GitHub y al sitio publicado.
- Novedades generales o asociadas a una empresa/proyecto; menciones, comentarios, vistos, adjuntos y conversión a tareas.
- Formularios guiados, borradores locales por usuario, dictado por voz cuando el navegador lo admite y revisión antes de guardar.
- Agenda con búsqueda, filtros, vistas de día/semana/mes, reuniones internas o de clientes, creación rápida de empresas, detección de cruces, series semanales/mensuales, reprogramación con historial y registro de resultados.
- Creación desde un horario de la semana o desde las franjas de media hora del día elegido en celular. Los eventos tienen alto contraste y las superposiciones se distribuyen en columnas.
- WhatsApp desde el detalle de la reunión: contacto de la empresa o participantes de una reunión interna. Requiere teléfonos con código de país; abre un mensaje preparado para que el usuario confirme su envío. No envía mensajes automáticamente.
- Resumen de tareas por vencer o atrasadas, reuniones de hoy y mañana, cuotas pendientes hasta mañana y novedades sin leer. Aparece después de la bienvenida o directamente si la app ya está instalada, una vez por día y pestaña; también se abre desde la campana.
- Cuotas independientes de los pagos recibidos, pagos parciales, saldo controlado en el servidor, comprobantes privados y preparación de mensajes para WhatsApp. Importes expresados en ARS.
- Gastos generales o por empresa/proyecto, responsable del pago y comprobante.
- Notificaciones internas en tiempo real y Web Push. Recordatorios de reuniones, tareas y cuotas mediante Supabase Cron. Instalación como PWA en navegadores compatibles.

## Desarrollo

Requiere Node.js 22.12 o superior; el flujo de publicación utiliza Node.js 24.

```sh
npm ci
cp .env.example .env
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

La URL y la clave `publishable` de Supabase son públicas por diseño. No conceden acceso a los datos sin una sesión autorizada. Nunca se debe incluir una clave `service_role`, una contraseña o la clave privada VAPID en el cliente o en Git.

## Supabase

Proyecto configurado: `ckcbxnhwpnvhpskculga`.

Las migraciones están en `supabase/migrations` y se aplican en orden. No vuelvas a ejecutar la migración inicial sobre una base ya configurada. El bucket `pulso-files` es privado y limita cada archivo a 20 MB.

Los usuarios Florencia, Franco y Santiago se crearon como configuración inicial fuera del repositorio. Sus contraseñas no se publican. Franco tiene el rol de administrador; puede agregar integrantes desde **Mi perfil → Agregar integrante**. Los datos se comparten entre perfiles activos. Crear una cuenta en Auth sin un perfil aprobado no da acceso al espacio de trabajo.

El alta de integrantes utiliza la función limitada `admin_create_member`, con autorización verificada en el servidor y hash bcrypt. La aplicación utiliza identificadores internos de acceso, no correos personales. Si alguien pierde el acceso, un administrador del proyecto Supabase debe restablecerlo; el correo de recuperación no se utiliza con estos identificadores internos.

Los pagos son registros de auditoría: no se editan ni borran desde el cliente. La validación del saldo bloquea la fila de la cuota durante el registro para evitar que dos pagos simultáneos excedan el importe acordado. Los archivos se abren con enlaces firmados; al compartir un comprobante por WhatsApp el enlace dura siete días y permite abrir ese archivo a quien lo reciba.

## Notificaciones del dispositivo

1. Abrir la aplicación publicada e iniciar sesión.
2. Ir a **Mi perfil → Activar notificaciones** y aceptar el permiso del navegador.
3. Repetir en cada dispositivo. Al cerrar sesión se elimina la suscripción de ese dispositivo.

El backend usa `dispatch-notifications`, una Edge Function con autenticación propia. La clave privada y el token del despachador permanecen en Supabase Vault. La función acepta únicamente el token de Cron y restringe los endpoints de envío a proveedores push conocidos; una petición sin el token devuelve 401.

Vault debe contener `pulso_vapid_public`, `pulso_vapid_private`, `pulso_dispatch_token` y `pulso_vapid_subject`. La clave pública de esta instalación está en `src/lib/config.ts`. El JWT heredado está desactivado para esta función porque la autenticación la verifica el token privado en el propio servicio. La configuración de Cron y los secretos de esta instalación se aplicaron fuera del repositorio.

```sh
supabase functions deploy dispatch-notifications --project-ref ckcbxnhwpnvhpskculga --no-verify-jwt
```

Cron evalúa los recordatorios cada minuto. Las reuniones se muestran en la hora local del dispositivo; los recordatorios diarios de tareas y cuotas se generan desde las 09:00 de Argentina. Las series se materializan en 2 a 12 reuniones; editar una modifica solo esa fecha. Los cruces advierten y requieren que quien agenda confirme la superposición.

La migración `202609140005_advance_reminders.sql` incorpora avisos el día anterior al vencimiento de tareas y cuotas, además del día de vencimiento y los atrasados. Incluye reuniones de mañana desde las 09:00 y mantiene el aviso previo configurado en cada reunión. Los participantes con aviso de 24 horas no reciben un segundo recordatorio de «mañana». Las claves de `reminder_log` evitan duplicados en cada ejecución de Cron. El resumen dentro de la app usa la fecha local del dispositivo.

Las notificaciones dependen de permisos del navegador y del sistema operativo, conectividad y restricciones de batería. Web Push permite entregarlas cuando la página está cerrada, sin prometer entrega a una hora exacta. El dictado usa el servicio de reconocimiento del navegador y puede requerir conexión. Si no está disponible, se puede escribir o usar el dictado del teclado.

## Publicación

Cada push a `main` ejecuta las pruebas, compila y publica en GitHub Pages mediante `.github/workflows/deploy.yml`. El router usa rutas hash para admitir enlaces directos desde Pages y desde las notificaciones.

La PWA guarda solamente los recursos de la interfaz para abrirla sin conexión. No almacena una copia offline de los datos compartidos ni de los archivos privados. Los borradores de formularios se guardan en el dispositivo y se eliminan al cerrar sesión; los archivos deben volver a seleccionarse al recuperar un borrador.

## Estructura

```text
src/components/  Componentes y formularios guiados
src/pages/       Pantallas del espacio de trabajo
src/lib/         Auth, datos compartidos, archivos, push y reglas de presentación
src/sw.ts        Service worker y recepción de notificaciones
supabase/        Migraciones y función del despachador
public/          Logo e iconos de la PWA
```

El archivo original recibido es un JPEG con fondo negro. Se conserva en `public/pulso-logo.jpeg`; los iconos de instalación usan un recorte del símbolo.

Referencias técnicas: [seguridad por filas en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
