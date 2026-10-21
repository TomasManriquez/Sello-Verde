import * as ExcelJS from 'exceljs';

/** Una fila del reporte: un establecimiento / local / instalación (el establecimiento se repite). */
export type FilaExport = Record<string, string | number | Date | null>;

interface Columna {
  header: string;
  key: string;
  width: number;
  /** Formato de número o fecha de Excel */
  numFmt?: string;
}

/** Columnas del reporte, en el orden en que se ven en la hoja. */
export const COLUMNAS_EXPORT: Columna[] = [
  // Establecimiento
  { header: 'RBD', key: 'rbd', width: 11 },
  { header: 'Establecimiento', key: 'nombre', width: 34 },
  { header: 'Dirección', key: 'direccion', width: 32 },
  { header: 'Comuna', key: 'comuna', width: 14 },
  { header: 'Propietario / Representante', key: 'propietario', width: 26 },
  { header: 'Estado general', key: 'estado', width: 22 },
  { header: 'Cantidad de locales', key: 'cantidad_locales', width: 12 },
  // Proyecto
  { header: 'Empresa contratista', key: 'contratista', width: 26 },
  { header: 'RUT contratista', key: 'rut_contratista', width: 15 },
  { header: 'Contacto contratista', key: 'contacto_contratista', width: 22 },
  { header: 'Teléfono contratista', key: 'telefono_contratista', width: 16 },
  { header: 'Correo contratista', key: 'email_contratista', width: 26 },
  { header: 'N° licitación', key: 'licitacion', width: 14 },
  { header: 'Estado TC6', key: 'tc6', width: 16 },
  { header: 'Presupuesto', key: 'presupuesto', width: 14, numFmt: '"$"#,##0' },
  { header: 'Monto ejecutado', key: 'ejecutado', width: 15, numFmt: '"$"#,##0' },
  // Local
  { header: 'N° local', key: 'numero_local', width: 9 },
  { header: 'Nombre local', key: 'nombre_local', width: 24 },
  { header: 'Dirección local', key: 'direccion_local', width: 28 },
  { header: 'Usa gas', key: 'usa_gas', width: 9 },
  // Instalación
  { header: 'Tipo de gas', key: 'tipo_gas', width: 13 },
  { header: 'Abastecimiento', key: 'abastecimiento', width: 18 },
  { header: 'Zona de abastecimiento', key: 'zona', width: 18 },
  { header: 'Referencia', key: 'referencia', width: 30 },
  { header: 'Artefacto / cilindro', key: 'artefacto', width: 24 },
  // Sello vigente de la instalación
  { header: 'Sello vigente', key: 'sello', width: 15 },
  { header: 'Fecha de inspección', key: 'fecha_inspeccion', width: 14, numFmt: 'dd-mm-yyyy' },
  { header: 'Vence / plazo hasta', key: 'fecha_limite', width: 14, numFmt: 'dd-mm-yyyy' },
  { header: 'Días restantes', key: 'dias_restantes', width: 11 },
  { header: 'Certificador', key: 'inspector', width: 24 },
  { header: 'RUT certificador', key: 'rut_certificador', width: 15 },
  { header: 'Entidad del certificador', key: 'entidad', width: 24 },
  { header: 'N° certificado', key: 'numero_certificado', width: 16 },
  { header: 'Defectos', key: 'defectos', width: 44 },
  { header: 'Alertas pendientes', key: 'alertas_pendientes', width: 11 },
];

/** Construye el libro de una sola hoja con las filas ya preparadas. */
export async function construirExcel(filas: FilaExport[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Sello Verde';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Establecimientos', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
  });

  hoja.columns = COLUMNAS_EXPORT.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : {},
  }));

  for (const fila of filas) hoja.addRow(fila);

  const encabezado = hoja.getRow(1);
  encabezado.height = 32;
  encabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF01696F' } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS_EXPORT.length } };

  const datos = await libro.xlsx.writeBuffer();
  return Buffer.from(datos);
}
