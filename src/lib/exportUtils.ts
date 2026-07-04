import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Excel-compatible export with zero extra dependencies. Writes SpreadsheetML
 * 2003 XML (Excel's own open, documented format) rather than pulling in a
 * binary .xlsx writer - the standard library for that (xlsx/SheetJS) has a
 * known high-severity vulnerability with no patched release on npm.
 * Excel, Google Sheets, and LibreOffice all open this format natively.
 */
export function exportToExcel<T extends Record<string, any>>(data: T[], filename: string, columns: { key: keyof T; label: string }[]) {
  if (!data || !data.length) return;

  const headerCells = columns
    .map((col) => `<Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`)
    .join("");

  const rows = data
    .map((item) => {
      const cells = columns
        .map((col) => {
          const val = item[col.key];
          const isNumeric = typeof val === "number";
          return `<Cell><Data ss:Type="${isNumeric ? "Number" : "String"}">${escapeXml(val)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>${headerCells}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string, columns: { key: keyof T, label: string }[]) {
  if (!data || !data.length) return;

  const header = columns.map(col => col.label).join(",");
  const rows = data.map(item => {
    return columns.map(col => {
      let val = item[col.key];
      if (typeof val === 'string') {
        // Escape quotes
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }
      return val;
    }).join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToPDF<T extends Record<string, any>>(data: T[], filename: string, title: string, columns: { key: keyof T, label: string }[]) {
  if (!data || !data.length) return;

  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const head = [columns.map(col => col.label)];
  const body = data.map(item => columns.map(col => {
      const val = item[col.key];
      return val !== null && val !== undefined ? String(val) : "";
  }));

  autoTable(doc, {
    head,
    body,
    startY: 36,
    theme: 'grid',
    headStyles: { fillColor: [10, 169, 173] }, // Primary brand color
    styles: { fontSize: 9 },
  });

  doc.save(`${filename}.pdf`);
}
