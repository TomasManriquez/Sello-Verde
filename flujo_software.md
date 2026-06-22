# Flujo de Operación del Software - Gestión Sello Verde

Este documento describe el flujo de trabajo del sistema, considerando que el **único usuario de la plataforma es el encargado del proceso del SLEP** (ej. Encargado de Infraestructura), quien actúa como digitador y controlador de la información proveniente de actores externos.

## 1. Creación del Seguimiento y Asignación de Licitación
El proceso comienza con la formalización del expediente en la plataforma.
- **Ingreso del Proyecto:** El encargado crea un nuevo expediente vinculado al **Rol Base de Datos (RBD)** del establecimiento.
- **Registro de la Empresa:** Digitación de los datos de la empresa instaladora adjudicada a la licitación pública encargada del levantamiento y regularización.

## 2. Digitación del Levantamiento (Anexo 2 SEC)
El sistema sirve como repositorio digital de la información técnica recolectada en terreno.
- **Recepción de Datos:** El instalador entrega la información física del levantamiento al SLEP.
- **Ingreso en Plataforma:** El encargado digitaliza el **"Formulario de Levantamiento de Instalaciones de Gas" (Anexo 2)**, registrando:
    - Cantidad y detalle de locales.
    - Tipo de gas (GLP o Gas Natural) y modalidad de abastecimiento.
    - Zonas de abastecimiento (casino, camarines, etc.).

## 3. Seguimiento del Proyecto TC6 y Presupuesto
Control administrativo y técnico del avance de las obras.
- **Actualización de Estados:** Cambio manual del estado del proyecto de diseño ante la SEC:
    - `En elaboración` -> `Ingresado a la SEC` -> `Observado` -> `TC6 Aprobado`.
- **Control Financiero:** Carga del acta de reparaciones y registro de montos para el control presupuestario del departamento de administración e infraestructura.

## 4. Certificación, Digitación de Defectos (Anexo 3 SEC) y Alertas
Cierre del ciclo de inspección y activación de mantenimientos o regularizaciones.
- **Registro del Inspector:** Ingreso del nombre y entidad certificadora del verificador externo para trazabilidad.
- **Calificación del Sello:**
    - **Sello Verde:** 
        - Marcado como aprobado.
        - Adjunto de certificado final en el repositorio.
        - **Automatización:** Activación de alerta de vencimiento para 2 años.
    - **Sello Rojo o Amarillo:**
        - Digitalización del **"Formulario de Comunicación de Defectos Críticos a Usuarios" (Anexo 3)**.
        - Marcado de defectos específicos (ej. fugas, niveles de CO, ubicación de artefactos).
        - **Automatización:** Activación y monitoreo del **plazo normativo de 90 días** para la regularización.
