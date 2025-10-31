# Instrucciones del proyecto

## Contexto general
- Proyecto Angular para portal escolar con autenticación Firebase y componentes standalone.
- Flujo actual: `AuthComponent` (login/registro) redirige a `ParentPortalComponent` para el rol de tutores.
- Estilo visual basado en tonos azules, tarjetas suaves y uso de Material Symbols.

## Convenciones vigentes
- Generar nuevos componentes con Angular CLI (standalone, preferiblemente con archivos SASS dedicados).
- Ubicar tipos e interfaces en archivos dedicados dentro de carpetas homónimas.
- Favorecer componentes reutilizables para reducir duplicación de HTML.

## Actualizaciones recientes (30/09/2025)
- Se creó `ParentPortalComponent` con tarjetas de progreso, comentarios y acciones.
- Se modularizó la vista usando `app-insight-card`, `app-quick-action`, `app-teacher-comment-card` y `app-announcement-item`.
- Interfaces del portal movidas a `src/app/parent-portal/models/*` para reutilización.
- Componentes reutilizables actualizados para consumir hojas `.sass` dedicadas, evitando errores de compilación.

## Próximos pasos sugeridos
- Conectar datos reales (Firebase/servicios) a las tarjetas e indicadores.
- Crear manejo real para acciones rápidas (descargas, mensajes, etc.).
- Revisar responsividad en breakpoints <768px y accesibilidad (roles, aria).

_Última actualización: 30/09/2025_
