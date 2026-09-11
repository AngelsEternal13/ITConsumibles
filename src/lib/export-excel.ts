import ExcelJS from "exceljs";
import { ConsumibleCalculoItem, UpsCalculoItem, ConsolidadoItem, MatrizAcopioItem } from "./calculations";
import { Transferencia, CompraAdicional } from "@/db/schema";

interface ExportExcelParams {
  consumibles: ConsumibleCalculoItem[];
  ups: UpsCalculoItem[];
  matrizAcopios?: MatrizAcopioItem[];
  comprasAdicionales: CompraAdicional[];
  transferencias: (Transferencia & { origenNombre?: string; destinoNombre?: string })[];
  consolidado: ConsolidadoItem[];
}

export async function generarLibroExcel({
  consumibles,
  ups,
  matrizAcopios = [],
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
  // Hoja 1: Matriz Acopios vs Equipamiento
  // ==========================================
  if (matrizAcopios && matrizAcopios.length > 0) {
    const wsMatriz = workbook.addWorksheet("Matriz Acopios");
    wsMatriz.columns = [
      { header: "Agencia", key: "agencia", width: 22 },
      { header: "Departamento", key: "depto", width: 18 },
      { header: "Acopios a Abrir", key: "acopios", width: 16 },
      { header: "Impresoras Existentes", key: "imp_exist", width: 20 },
      { header: "Impresoras Requeridas", key: "imp_req", width: 20 },
      { header: "Déficit / Sobra Impresoras", key: "imp_bal", width: 22 },
      { header: "Consumibles en Stock", key: "con_exist", width: 20 },
      { header: "Consumibles Requeridos", key: "con_req", width: 22 },
      { header: "Déficit / Sobra Consumibles", key: "con_bal", width: 24 },
      { header: "UPS en Stock", key: "ups_exist", width: 16 },
      { header: "UPS Requeridas", key: "ups_req", width: 16 },
      { header: "Déficit / Sobra UPS", key: "ups_bal", width: 20 },
      { header: "Estado Cobertura", key: "estado", width: 18 },
    ];

    wsMatriz.getRow(1).height = 28;
    wsMatriz.getRow(1).eachCell((cell) => {
      Object.assign(cell, headerStyle);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6CBD" } };
    });

    for (const item of matrizAcopios) {
      const impBal = item.impresorasFaltantes > 0 ? `Faltan ${item.impresorasFaltantes}` : item.impresorasSobrantes > 0 ? `Sobran ${item.impresorasSobrantes}` : "Exacto";
      const conBal = item.consumiblesFaltantes > 0 ? `Faltan ${item.consumiblesFaltantes}` : item.consumiblesSobrantes > 0 ? `Sobran ${item.consumiblesSobrantes}` : "Exacto";
      const upsBal = item.upsFaltantes > 0 ? `Faltan ${item.upsFaltantes}` : item.upsSobrantes > 0 ? `Sobran ${item.upsSobrantes}` : "Exacto";

      const row = wsMatriz.addRow({
        agencia: item.agenciaNombre,
        depto: item.departamento,
        acopios: item.acopiosAAbrir,
        imp_exist: item.impresorasExistentes,
        imp_req: item.impresorasRequeridas,
        imp_bal: impBal,
        con_exist: item.consumiblesExistentes,
        con_req: item.consumiblesRequeridos,
        con_bal: conBal,
        ups_exist: item.upsExistentes,
        ups_req: item.upsRequeridas,
        ups_bal: upsBal,
        estado: item.estadoCobertura === "cubierto" ? "CUBIERTO" : item.estadoCobertura === "al_limite" ? "AL LÍMITE" : "DÉFICIT",
      });

      row.eachCell((cell, colNumber) => {
        cell.border = rowBorder;
        cell.font = { name: "Segoe UI", size: 10 };
        if ([3, 4, 5, 7, 8, 10, 11].includes(colNumber)) {
          cell.alignment = { horizontal: "right" };
        }
        if (colNumber === 13) {
          cell.alignment = { horizontal: "center" };
          if (item.estadoCobertura === "cubierto") {
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF107C41" } };
          } else if (item.estadoCobertura === "deficit") {
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD13438" } };
          }
        }
      });
    }
  }

  // ==========================================
  // Hoja 2: Consumibles
  // ==========================================
  const wsConsumibles = workbook.addWorksheet("Consumibles");
  wsConsumibles.columns = [
    { header: "Agencia", key: "agencia", width: 22 },
    { header: "Departamento", key: "depto", width: 18 },
    { header: "Acopios", key: "acopios", width: 12 },
    { header: "Modelo Impresora", key: "modelo", width: 22 },
    { header: "Cant. Impresoras Total", key: "cant_imp", width: 20 },
    { header: "Impresoras en Acopios", key: "cant_op", width: 20 },
    { header: "Consumible", key: "tipo", width: 16 },
    { header: "Existencia Actual (Stock)", key: "existencia", width: 22 },
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
      acopios: item.acopiosAgencia,
      modelo: item.modeloImpresora,
      cant_imp: item.cantidadImpresorasTotal,
      cant_op: item.cantidadImpresorasOperativas,
      tipo: item.tipoConsumible,
      existencia: item.existenciaActual,
      requerida: item.cantidadRequerida,
      comprar: item.cantidadAComprar,
      sobra: item.cantidadSobrante,
      estado: item.estadoAlerta === "verde" ? "CORRECTO" : item.estadoAlerta === "amarillo" ? "AL LÍMITE" : "FALTA COMPRA",
    });

    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if ([3, 5, 6, 8, 9, 10, 11].includes(colNumber)) {
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 12) {
        cell.alignment = { horizontal: "center" };
        if (item.estadoAlerta === "verde") {
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF107C41" } };
        } else if (item.estadoAlerta === "rojo") {
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD13438" } };
        }
      }
    });
  }

  // ==========================================
  // Hoja 3: UPS
  // ==========================================
  const wsUps = workbook.addWorksheet("UPS");
  wsUps.columns = [
    { header: "Agencia", key: "agencia", width: 22 },
    { header: "Departamento", key: "depto", width: 18 },
    { header: "Acopios", key: "acopios", width: 12 },
    { header: "Modelo Impresora", key: "modelo", width: 22 },
    { header: "Impresoras en Acopios", key: "cant_op", width: 20 },
    { header: "VA Requerida", key: "va", width: 16 },
    { header: "UPS Compatibles en Stock", key: "existentes", width: 24 },
    { header: "Falta Comprar", key: "comprar", width: 16 },
    { header: "Sobran en Stock", key: "sobra", width: 16 },
    { header: "Estado", key: "estado", width: 15 },
  ];

  wsUps.getRow(1).height = 28;
  wsUps.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

  for (const item of ups) {
    const row = wsUps.addRow({
      agencia: item.agenciaNombre,
      depto: item.departamento,
      acopios: item.acopiosAgencia,
      modelo: item.modeloImpresora,
      cant_op: item.cantidadImpresorasOperativas,
      va: `${item.upsRequeridaVa} VA`,
      existentes: item.upsExistentes,
      comprar: item.upsFaltantes,
      sobra: item.upsSobrantes,
      estado: item.estadoAlerta === "verde" ? "CORRECTO" : item.estadoAlerta === "amarillo" ? "EXACTO" : "FALTA COMPRA",
    });

    row.eachCell((cell, colNumber) => {
      cell.border = rowBorder;
      cell.font = { name: "Segoe UI", size: 10 };
      if ([3, 5, 7, 8, 9].includes(colNumber)) {
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 10) {
        cell.alignment = { horizontal: "center" };
        if (item.estadoAlerta === "verde") {
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF107C41" } };
        } else if (item.estadoAlerta === "rojo") {
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD13438" } };
        }
      }
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
    { header: "Tipo Artículo", key: "tipo", width: 18 },
    { header: "Descripción", key: "descripcion", width: 30 },
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
