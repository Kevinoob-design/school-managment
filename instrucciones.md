# Instrucciones del proyecto

## Contexto general
- Proyecto Angular para portal escolar con autenticaci�n Firebase y componentes standalone.
- Flujo actual: `AuthComponent` (login/registro) redirige a `ParentPortalComponent` para el rol de tutores.
- Estilo visual basado en tonos azules, tarjetas suaves y uso de Material Symbols.

## Convenciones vigentes
- Generar nuevos componentes con Angular CLI (standalone, preferiblemente con archivos SASS dedicados).
- Ubicar tipos e interfaces en archivos dedicados dentro de carpetas hom�nimas.
- Favorecer componentes reutilizables para reducir duplicaci�n de HTML.

## Actualizaciones recientes (30/09/2025)
- Se cre� `ParentPortalComponent` con tarjetas de progreso, comentarios y acciones.
- Se modulariz� la vista usando `app-insight-card`, `app-quick-action`, `app-teacher-comment-card` y `app-announcement-item`.
- Interfaces del portal movidas a `src/app/parent-portal/models/*` para reutilizaci�n.
- Componentes reutilizables actualizados para consumir hojas `.sass` dedicadas, evitando errores de compilaci�n.

## Pr�ximos pasos sugeridos
- Conectar datos reales (Firebase/servicios) a las tarjetas e indicadores.
- Crear manejo real para acciones r�pidas (descargas, mensajes, etc.).
- Revisar responsividad en breakpoints <768px y accesibilidad (roles, aria).

_�ltima actualizaci�n: 30/09/2025_
