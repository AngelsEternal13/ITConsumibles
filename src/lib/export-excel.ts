import ExcelJS from "exceljs";
import { ConsumibleCalculoItem, UpsCalculoItem, ConsolidadoItem } from "./calculations";
import { Transferencia, CompraAdicional } from "@/db/schema";

interface ExportExcelParams {
  consumibles: ConsumibleCalculoItem[];
  ups: UpsCalculoItem[];
  comprasAdicionales: CompraAdicional[];
  transferencias: (Transferencia & { origenNombre?: string; destinoNombre?: string })[];
  consolidado: ConsolidadoItem[];
}

export async function generarLibroExcel({
  consumibles,
  ups,
  comprasAdicionales,
  transferencias,
  consolidado,
}: ExportExcelParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Web de Consumibles y UPS";
  workbook.created = new Date();

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } }, // Microsoft 365 Blue
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      top: { style: "thin", color: { argb: "FFB3D7FF" } },
      left: { style: "thin", color: { argb: "FFB3D7FF" } },
      bottom: { style: "thin", color: { argb: "FFB3D7FF" } },
      right: { style: "thin", color: { argb: "FFB3D7FF" } },
    },
  };

  const rowBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE0E0E0" } },
    left: { style: "thin", color: { argb: "FFE0E0E0" } },
    bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
    right: { style: "thin", color: { argb: "FFE0E0E0" } },
  };

  // ==========================================
  // Hoja 1: Consumibles
  // ==========================================
  const wsConsumibles = workbook.addWorksheet("Consumibles");
  wsConsumibles.columns = [
    { header: "Agencia", key: "agencia", width: 22 },
    { header: "Departamento", key: "depto", width: 18 },
    { header: "Modelo Impresora", key: "modelo", width: 22 },
    { header: "Cant. Impresoras", key: "cant_imp", width: 16 },
    { header: "Consumible", key: "tipo", width: 16 },
    { header: "Existencia Actual (Acopio)", key: "existencia", width: 22 },
    { header: "Cantidad Requerida", key: "requerida", width: 18 },
    { header: "Falta Comprar", key: "comprar", width: 16 },
    { header: "Sobra en Stock", key: "sobra", width: 16 },
    { header: "Estado", key: "estado", width: 15 },
  ];

  wsConsumibles.getRow(1).height = 28;
  wsConsumibles.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

  for (const item of consumibles) {
    const row = wsConsumibles.addRow({
      agencia: item.agenciaNombre,
      depto: item.departamento,
      modelo: item.modeloImpresora,
      cant_imp: item.cantidadImpresoras,
      tipo: item.tipoConsumible,
      existencia: item.existenciaActual,
      requerida: item.cantidadRequerida,
      comprar: item.cantidadAComprar,
      sobra: item.cantidadSobrante || 0,
      estado: item.cantidadAComprar > 0 ? "Faltante" : item.cantidadSobrante > 0 ? "Superávit" : "Exacto",
    });

    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (colNumber >= 4 && colNumber <= 9) {
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 8 && item.cantidadAComprar > 0) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD13438" } };
      }
      if (colNumber === 9 && item.cantidadSobrante > 0) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF107C41" } };
      }
    });
  }

  // ==========================================
  // Hoja 2: UPS
  // ==========================================
  const wsUps = workbook.addWorksheet("UPS");
  wsUps.columns = [
    { header: "Agencia", key: "agencia", width: 22 },
    { header: "Departamento", key: "depto", width: 18 },
    { header: "Modelo Impresora", key: "modelo", width: 22 },
    { header: "Cant. Impresoras", key: "cant_imp", width: 16 },
    { header: "UPS Requerida (VA)", key: "requerida_va", width: 18 },
    { header: "UPS Existentes", key: "existentes", width: 16 },
    { header: "UPS Faltantes", key: "faltantes", width: 16 },
    { header: "UPS Sobrantes", key: "sobrantes", width: 16 },
    { header: "Estado", key: "estado", width: 15 },
  ];

  wsUps.getRow(1).height = 28;
  wsUps.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

  for (const item of ups) {
    const row = wsUps.addRow({
      agencia: item.agenciaNombre,
      depto: item.departamento,
      modelo: item.modeloImpresora,
      cant_imp: item.cantidadImpresoras,
      requerida_va: `${item.upsRequeridaVa} VA${item.upsRequeridaVaAlt ? ` o ${item.upsRequeridaVaAlt} VA` : ""}`,
      existentes: item.upsExistentes,
      faltantes: item.upsFaltantes,
      sobrantes: item.upsSobrantes || 0,
      estado: item.upsFaltantes > 0 ? "Falta UPS" : item.upsSobrantes > 0 ? "Superávit" : "1 a 1 Cubierto",
    });

    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (colNumber >= 4 && colNumber <= 8) {
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 7 && item.upsFaltantes > 0) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD13438" } };
      }
      if (colNumber === 8 && item.upsSobrantes > 0) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF107C41" } };
      }
    });
  }

  // ==========================================
  // Hoja 3: Compras Adicionales
  // ==========================================
  const wsCompras = workbook.addWorksheet("Compras Adicionales");
  wsCompras.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Descripción", key: "descripcion", width: 30 },
    { header: "Cantidad", key: "cantidad", width: 14 },
    { header: "Prioridad", key: "prioridad", width: 16 },
    { header: "Observaciones", key: "observaciones", width: 35 },
    { header: "Fecha Registro", key: "fecha", width: 20 },
  ];

  wsCompras.getRow(1).height = 28;
  wsCompras.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

  for (const item of comprasAdicionales) {
    const row = wsCompras.addRow({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      prioridad: item.prioridad,
      observaciones: item.observaciones || "-",
      fecha: item.fecha_creacion,
    });
    row.eachCell((cell) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
    });
  }

  // ==========================================
  // Hoja 4: Transferencias
  // ==========================================
  const wsTransferencias = workbook.addWorksheet("Transferencias");
  wsTransferencias.columns = [
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Agencia Origen", key: "origen", width: 22 },
    { header: "Agencia Destino", key: "destino", width: 22 },
    { header: "Tipo Artículo", key: "tipo", width: 16 },
    { header: "Descripción / Modelo", key: "descripcion", width: 28 },
    { header: "Cantidad", key: "cantidad", width: 14 },
    { header: "Usuario Responsable", key: "usuario", width: 22 },
  ];

  wsTransferencias.getRow(1).height = 28;
  wsTransferencias.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

  for (const item of transferencias) {
    const row = wsTransferencias.addRow({
      fecha: item.fecha,
      origen: item.origenNombre || `Agencia #${item.agencia_origen_id}`,
      destino: item.destinoNombre || `Agencia #${item.agencia_destino_id}`,
      tipo: item.tipo_articulo,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      usuario: item.usuario,
    });
    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (colNumber === 6) cell.alignment = { horizontal: "right" };
    });
  }

  // ==========================================
  // Hoja 5: Resumen General / Consolidado
  // ==========================================
  const wsResumen = workbook.addWorksheet("Resumen General");
  wsResumen.columns = [
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Artículo / Requerimiento", key: "articulo", width: 32 },
    { header: "Cantidad a Comprar", key: "cantidad", width: 20 },
    { header: "Unidad", key: "unidad", width: 15 },
    { header: "Prioridad", key: "prioridad", width: 15 },
    { header: "Justificación / Observación", key: "observaciones", width: 45 },
  ];

  wsResumen.getRow(1).height = 28;
  wsResumen.getRow(1).eachCell((cell) => {
    Object.assign(cell, headerStyle);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF107C41" } }; // Corporate Green
  });

  for (const item of consolidado) {
    const row = wsResumen.addRow({
      categoria: item.categoria,
      articulo: item.articulo,
      cantidad: item.cantidad,
      unidad: item.unidad,
      prioridad: item.prioridad || "Alta",
      observaciones: item.observaciones,
    });
    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if (colNumber === 3) {
        cell.alignment = { horizontal: "right" };
        cell.font = { name: "Segoe UI", size: 10, bold: true };
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
