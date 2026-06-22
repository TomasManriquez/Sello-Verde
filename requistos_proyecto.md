# Requisitos del Proyecto

De acuerdo con la normativa de la SEC (Resolución 29738 EXENTA), existen dos formularios clave (Anexos 2 y 3) que se deben completar durante el proceso de certificación. Para digitalizar este proceso en tu plataforma y evitar depender de un PDF, aquí tienes la estructura exacta de los campos y las opciones de selección que debes implementar en tu base de datos y vistas de usuario:

## Formulario 1: Levantamiento de Instalaciones de Gas (Anexo 2)

Este formulario es el punto de partida que debe llenarse al realizar el levantamiento físico de los recintos. Se divide en tres secciones principales para la plataforma:

### A. Información General del Establecimiento (Cabecera del formulario)
- **RBD Establecimiento**: (Campo numérico/texto)
- **Nombre Establecimiento**: (Campo de texto)
- **Dirección**: (Campo de texto)
- **Nombre de Propietario**: (Campo de texto)
- **Fecha**: (Selector de fecha dd/mm/aaaa)
- **Cantidad de locales**: (Campo numérico. Recuerda que un RBD puede tener varias sucursales o locales)

### B. Detalle de Locales (Grilla o Tabla 1)
Por cada local asociado al establecimiento, se debe ingresar una fila con:
- **Nº Local**: (Identificador correlativo, ej. 1, 2, 3)
- **Dirección Local**: (Campo de texto)
- **Nombre Local**: (Campo de texto)
- **Usa gas**: (Selector Booleano: Sí / No)

### C. Detalle de Instalaciones (Grilla o Tabla 2)
Esta es la sección técnica más importante. Por cada local que sí use gas, se deben agregar las instalaciones con las siguientes opciones predefinidas por la SEC:
- **Nº Local**: (Para vincularlo con la tabla anterior)
- **Tipo de gas**: (Lista desplegable con opciones: GLP, Gas Natural)
- **Abastecimiento**: (Lista desplegable con opciones: GDR, Equipo GLP, Cilindros 45 kg, Cilindros 11-15 kg, GRANEL)
- **Zona de abastecimiento**: (Lista desplegable sugerida: Casino, Camarines, Sala de clases, Otros)
- **Referencia**: (Campo de texto abierto para añadir una descripción que permita ubicar la instalación interior de gas o los artefactos)
- **Artefacto/Cilindro**: (Campo de texto para especificar artefactos fijos conectados directo a cilindro, ej. "cocina-calefón")

### D. Firmas y Validación
Campos para ingresar el RUT del Propietario y el RUT del Representante Legal de la Entidad Certificadora, que en la plataforma pueden ser reemplazados por una validación de usuario logueado o firma digital.

---

## Formulario 2: Comunicación de Defectos Críticos (Anexo 3)

Si durante la inspección se debe otorgar un Sello Rojo debido a riesgos inminentes, la SEC exige notificar inmediatamente al usuario. Para tu plataforma, este es el formulario de contingencia que detona el plazo de 90 días para regularizar.

### A. Información de Cabecera
- Dirección
- Nombre del Establecimiento
- Nombre del Propietario
- Fecha

### B. Check-list de Defectos (Grilla de Selección)
El usuario (entidad certificadora) debe poder marcar con un "Check" (X) e ingresar la "Instalación afectada y sus componentes" en un campo de texto adyacente para los siguientes defectos preestablecidos:
- Fugas de gas en artefactos.
- Fugas de gas en la red.
- Fugas de gas en el medidor.
- Artefactos tipo B o C sin conducto de evacuación...
- Existencia de concentración de monóxido de carbono (CO) ambiente superior a 50 ppm.
- Artefacto a gas tipo A ubicados en salas de clases y/o bibliotecas.
- Lectura de tiro igual
