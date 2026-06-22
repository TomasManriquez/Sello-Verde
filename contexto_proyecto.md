# Contexto del Proyecto

## Producto Mínimo Viable (MVP) para la gestión del Sello Verde

### 1. Problemática Central Identificada
La problemática principal radica en que no existe un mecanismo formal para el seguimiento de las certificaciones de instalaciones de gas en los Establecimientos Educacionales (EE). Los problemas específicos incluyen:

- **Información dispersa y punto de partida cero**: Las certificaciones previas existen en entidades externas pero no están consolidadas ni rastreadas por el SLEP (Servicio Local de Educación Pública) ni por la SEC (Superintendencia de Electricidad y Combustibles). De hecho, se asume un punto de partida donde ningún establecimiento cuenta con documentación técnica registrada.
- **Falta de trazabilidad y sanciones**: Esta falta de control ocasiona multas por sellos vencidos, pérdida de trazabilidad de los recintos que obtienen sellos de rechazo (Rojo o Amarillo), y sellos verdes rechazados.
- **Carencia de comunicación entre áreas**: Actualmente no hay un sistema que alerte a las distintas áreas involucradas (infraestructura, compras/licitaciones y administración) sobre los vencimientos y pasos a seguir.

### 2. Requisitos de Usuario
Los usuarios (como el dueño del proceso y el departamento de infraestructura) requieren un sistema que cubra las siguientes necesidades:

- **Gestión del ciclo de vida completo**: Seguimiento sistemático que abarque desde la licitación pública y el levantamiento de información, hasta la elaboración del proyecto de diseño (TC6), su aprobación por la SEC y la emisión final del Sello Verde OK.
- **Control de plazos críticos**: Capacidad para monitorear el plazo de 90 días para regularizar instalaciones en caso de que existan observaciones o defectos.
- **Seguimiento por identificadores oficiales**: El sistema debe agrupar y asignar los sellos dependiendo del Rol Base de Datos (RBD) de cada establecimiento, diferenciando si existen varios locales bajo un mismo RBD.
- **Gestión de dependencias externas**: Considerar las limitaciones y la necesidad de interactuar con actores externos, como las entidades certificadoras y la plataforma de la SEC.

### 3. Funcionalidades Necesarias para el MVP Piloto
Para abordar la licitación en curso de los 20 establecimientos seleccionados y utilizar las primeras dos implementaciones como un piloto funcional, el MVP debe incluir las siguientes funcionalidades esenciales:

- **Tablero de Seguimiento Centralizado (Dashboard Tabular)**: Un registro que permita tabular la información, ver fechas y monitorear el estado en tiempo real de cada establecimiento. Debe incluir los siguientes indicadores:
    - Total de establecimientos.
    - EE sin gestión iniciada.
    - EE con proyecto de diseño en curso.
    - EE con proyecto TC6 aprobado por la SEC.
    - EE con Sello Verde aprobado.
- **Gestión de Estados de Certificación**: El sistema debe permitir centralizar la calificación de cada instalación inspeccionada, registrando si el sello es Verde (sin defectos), Amarillo (con defectos mayores/menores pero sin riesgo inminente) o Rojo (con defectos críticos que implican riesgo).
- **Sistema de Alertas Automatizadas**: Un motor de notificaciones capaz de levantar alertas transversales a distintas áreas del SLEP. Específicamente debe alertar sobre:
    - Fechas de vencimiento del Sello Verde para agendar re-inspecciones periódicas cada 2 años.
    - Fechas críticas para iniciar licitaciones de compras necesarias para reparaciones.
- **Repositorio de Expedientes**: Una funcionalidad básica de gestión documental que consolide el expediente de cada establecimiento con todos los respaldos (planos, memorias técnicas, aprobación TC6 y certificados de la SEC), subsanando la actual brecha de información.
