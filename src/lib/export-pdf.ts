import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConsumibleCalculoItem, UpsCalculoItem, ConsolidadoItem } from "./calculations";
import { formatDate } from "./utils";

interface ExportPdfParams {
  consumibles: ConsumibleCalculoItem[];
  ups: UpsCalculoItem[];
  consolidado: ConsolidadoItem[];
  usuarioNombre?: string;
  fechaEmision?: string;
}

export function generarReportePDF({
  consumibles,
  ups,
  consolidado,
  usuarioNombre = "Administrador del Sistema",
  fechaEmision = new Date().toISOString(),
}: ExportPdfParams): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Encabezado Corporativo Microsoft 365
  doc.setFillColor(0, 120, 212); // #0078D4
  doc.rect(0, 0, pageWidth, 24, "F");

  // Logo / Icono corporativo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 4, 16, 16, 2, 2, "F");
  doc.setTextColor(0, 120, 212);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("M365", 16.5, 14.5);

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REPORTE EJECUTIVO DE REQUERIMIENTOS Y CONSUMIBLES", 35, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gestión Centralizada de Impresoras, Consumibles y UPS por Agencia", 35, 18);

  // Metadatos de la cabecera
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha de emisión:", 14, 32);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(fechaEmision), 46, 32);

  doc.setFont("helvetica", "bold");
  doc.text("Generado por:", 14, 37);
  doc.setFont("helvetica", "normal");
  doc.text(usuarioNombre, 46, 37);

  doc.setFont("helvetica", "bold");
  doc.text("Estado del sistema:", 120, 32);
  doc.setTextColor(209, 52, 56);
  doc.text("Requerimientos Pendientes de Compra", 155, 32);
  doc.setTextColor(60, 60, 60);

  // Línea separadora
  doc.setDrawColor(225, 223, 221);
  doc.setLineWidth(0.5);
  doc.line(14, 42, pageWidth - 14, 42);

  // SECCIÓN 1: RESUMEN CONSOLIDADO DE REQUERIMIENTOS (A COMPRAR)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 90, 158);
  doc.text("1. RESUMEN GENERAL CONSOLIDADO DE COMPRAS", 14, 48);

  const tablaConsolidadoData = consolidado.map((item, idx) => [
    idx + 1,
    item.categoria,
    item.articulo,
    `${item.cantidad} ${item.unidad}`,
    item.prioridad || "Alta",
    item.observaciones || "Requerimiento de operación",
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["#", "Categoría", "Artículo Requerido", "Cantidad a Comprar", "Prioridad", "Justificación"]],
    body: tablaConsolidadoData,
    theme: "grid",
    headStyles: {
      fillColor: [0, 120, 212],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 45, fontStyle: "bold" },
      3: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 47 },
    },
  });

  // SECCIÓN 2: DETALLE DE CONSUMIBLES CON DÉFICIT
  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 90, 158);
  doc.text("2. DETALLE DE FALTANTES DE CONSUMIBLES POR AGENCIA", 14, currentY);

  const consumiblesFaltantes = consumibles.filter((c) => c.cantidadAComprar > 0);
  const tablaConsumiblesData = consumiblesFaltantes.map((c) => [
    c.agenciaNombre,
    c.departamento,
    c.modeloImpresora,
    c.cantidadImpresoras,
    c.tipoConsumible,
    c.existenciaActual,
    c.cantidadRequerida,
    c.cantidadAComprar,
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [["Agencia", "Depto", "Modelo", "Impresoras", "Consumible", "Existencia", "Requerido", "Faltante"]],
    body: tablaConsumiblesData.length > 0 ? tablaConsumiblesData : [["-", "-", "-", "-", "Sin faltantes", "-", "-", "0"]],
    theme: "grid",
    headStyles: {
      fillColor: [16, 110, 190],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
    },
    columnStyles: {
      3: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold", textColor: [209, 52, 56] },
    },
  });

  // SECCIÓN 3: DETALLE DE UPS FALTANTES
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 90, 158);
  doc.text("3. DETALLE DE DÉFICIT DE UPS POR AGENCIA", 14, currentY);

  const upsFaltantes = ups.filter((u) => u.upsFaltantes > 0);
  const tablaUpsData = upsFaltantes.map((u) => [
    u.agenciaNombre,
    u.departamento,
    u.modeloImpresora,
    u.cantidadImpresoras,
    `${u.upsRequeridaVa} VA${u.upsRequeridaVaAlt ? ` / ${u.upsRequeridaVaAlt} VA` : ""}`,
    u.upsExistentes,
    u.upsFaltantes,
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [["Agencia", "Depto", "Modelo Impresora", "Cant. Equipos", "UPS Req. (VA)", "Existentes", "Faltantes"]],
    body: tablaUpsData.length > 0 ? tablaUpsData : [["-", "-", "-", "-", "-", "-", "0"]],
    theme: "grid",
    headStyles: {
      fillColor: [16, 110, 190],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
    },
    columnStyles: {
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold", textColor: [209, 52, 56] },
    },
  });

  // SECCIÓN DE FIRMAS Y AUTORIZACIÓN
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);

  // Línea y firma Solicitante
  doc.line(20, currentY + 18, 80, currentY + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text("Solicitado Por:", 35, currentY + 23);
  doc.setFont("helvetica", "normal");
  doc.text(usuarioNombre, 32, currentY + 28);
  doc.text("Administración de IT / Operaciones", 24, currentY + 32);

  // Línea y firma Aprobador
  doc.line(125, currentY + 18, 185, currentY + 18);
  doc.setFont("helvetica", "bold");
  doc.text("Aprobado Por:", 142, currentY + 23);
  doc.setFont("helvetica", "normal");
  doc.text("Gerencia de Compras / Finanzas", 132, currentY + 28);
  doc.text("Firma y Sello de Autorización", 135, currentY + 32);

  // Pie de página en todas las hojas
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Página ${i} de ${totalPages} - Sistema Web de Gestión de Consumibles y UPS - Confidencial`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
