"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoPngDataUrl, SCHOOL_NAME } from "@/lib/reportBranding";

type SubjectData = {
  name: string;
  coefficient: number;
  grade: number | null;
  noteTimesCoef: number | null;
};

export function ReportPDF({
  studentName,
  className,
  subjects,
  average,
  rank,
  totalStudents,
  decision,
  totalNotes,
  totalCoef,
  totalNotesTimesCoef,
  classAvgBest,
  classAvgWorst,
}: {
  studentName: string;
  className: string;
  subjects: SubjectData[];
  average: number | null;
  rank: number;
  totalStudents: number;
  decision: string | null;
  totalNotes: number;
  totalCoef: number;
  totalNotesTimesCoef: number;
  classAvgBest: number | null;
  classAvgWorst: number | null;
}) {
  const generatePDF = async () => {
    const doc = new jsPDF();
    const indigo = [79, 70, 229] as const;
    const now = new Date();
    const logoDataUrl = await getLogoPngDataUrl(256).catch(() => "");

    // ── Header band ──
    doc.setFillColor(...indigo);
    doc.rect(0, 0, 210, 38, "F");
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 16, 7, 23, 23);
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(224, 231, 255);
    doc.text(SCHOOL_NAME, 105, 10, { align: "center" });
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("BULLETIN SCOLAIRE", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Année scolaire ${now.getFullYear() - 1}–${now.getFullYear()}`,
      105,
      28,
      { align: "center" }
    );

    // ── Student info boxes ──
    const boxY = 45;
    doc.setFillColor(238, 242, 255);

    // Box 1: Élève
    doc.roundedRect(14, boxY, 58, 20, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(...indigo);
    doc.setFont("helvetica", "bold");
    doc.text("ÉLÈVE", 18, boxY + 6);
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text(studentName, 18, boxY + 15);

    // Box 2: Classe
    doc.roundedRect(76, boxY, 58, 20, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(...indigo);
    doc.setFont("helvetica", "bold");
    doc.text("CLASSE", 80, boxY + 6);
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text(className, 80, boxY + 15);

    // Box 3: Effectif
    doc.roundedRect(138, boxY, 58, 20, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(...indigo);
    doc.setFont("helvetica", "bold");
    doc.text("EFFECTIF", 142, boxY + 6);
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text(`${totalStudents} élève(s)`, 142, boxY + 15);

    // ── Grades table ──
    const tableData = subjects.map((s) => [
      s.name,
      s.grade !== null ? s.grade.toFixed(2) : "—",
      s.coefficient.toString(),
      s.noteTimesCoef !== null ? s.noteTimesCoef.toFixed(2) : "—",
    ]);

    autoTable(doc, {
      startY: boxY + 28,
      head: [["Matière", "Note /20", "Coef.", "Note × Coef."]],
      body: tableData,
      foot: [["TOTAUX", totalNotes.toFixed(2), totalCoef.toString(), totalNotesTimesCoef.toFixed(2)]],
      theme: "grid",
      headStyles: {
        fillColor: [...indigo],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      footStyles: {
        fillColor: [224, 231, 255],
        textColor: [30, 27, 75],
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 70 },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: (data) => {
        // Red text for grades < 10
        if (data.section === "body" && data.column.index === 1) {
          const val = parseFloat(data.cell.raw as string);
          if (!isNaN(val) && val < 10) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // ── Summary boxes ──
    const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    const cardW = 44;
    const cardH = 28;
    const gap = 3;

    // Card 1: Moyenne
    doc.setFillColor(...indigo);
    doc.roundedRect(14, tableEndY, cardW, cardH, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("MOYENNE", 14 + cardW / 2, tableEndY + 7, { align: "center" });
    doc.setFontSize(16);
    doc.text(
      average !== null ? average.toFixed(2) : "—",
      14 + cardW / 2,
      tableEndY + 18,
      { align: "center" }
    );
    doc.setFontSize(8);
    doc.text("/20", 14 + cardW / 2, tableEndY + 24, { align: "center" });

    // Card 2: Rang
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(14 + cardW + gap, tableEndY, cardW, cardH, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("RANG", 14 + cardW + gap + cardW / 2, tableEndY + 7, { align: "center" });
    doc.setFontSize(16);
    doc.text(
      rank > 0 ? `${rank}${rank === 1 ? "er" : "ème"}` : "—",
      14 + cardW + gap + cardW / 2,
      tableEndY + 18,
      { align: "center" }
    );
    doc.setFontSize(8);
    doc.text(`/ ${totalStudents}`, 14 + cardW + gap + cardW / 2, tableEndY + 24, { align: "center" });

    // Card 3: Décision
    if (decision === "ADMIS") {
      doc.setFillColor(22, 163, 74);
    } else if (decision === "REFUSÉ") {
      doc.setFillColor(220, 38, 38);
    } else {
      doc.setFillColor(156, 163, 175);
    }
    doc.roundedRect(14 + (cardW + gap) * 2, tableEndY, cardW, cardH, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("DÉCISION", 14 + (cardW + gap) * 2 + cardW / 2, tableEndY + 7, {
      align: "center",
    });
    doc.setFontSize(14);
    doc.text(decision ?? "—", 14 + (cardW + gap) * 2 + cardW / 2, tableEndY + 19, {
      align: "center",
    });

    // Card 4: Moyennes classe
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(14 + (cardW + gap) * 3, tableEndY, cardW, cardH, 3, 3, "FD");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "bold");
    doc.text("MOY. CLASSE", 14 + (cardW + gap) * 3 + cardW / 2, tableEndY + 7, {
      align: "center",
    });
    doc.setFontSize(9);
    doc.setTextColor(22, 163, 74);
    doc.text(
      `Max: ${classAvgBest !== null ? classAvgBest.toFixed(2) : "—"}`,
      14 + (cardW + gap) * 3 + cardW / 2,
      tableEndY + 16,
      { align: "center" }
    );
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Min: ${classAvgWorst !== null ? classAvgWorst.toFixed(2) : "—"}`,
      14 + (cardW + gap) * 3 + cardW / 2,
      tableEndY + 23,
      { align: "center" }
    );

    // ── Footer ──
    const footerY = tableEndY + cardH + 20;
    doc.setDrawColor(229, 231, 235);
    doc.line(14, footerY, 196, footerY);

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${SCHOOL_NAME} — ${now.toLocaleDateString("fr-FR")}`,
      14,
      footerY + 8
    );

    // Signature line
    doc.setDrawColor(200, 200, 200);
    doc.line(140, footerY + 25, 196, footerY + 25);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Signature du Directeur", 168, footerY + 31, { align: "center" });

    // Save
    doc.save(`bulletin_${studentName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-lg cursor-pointer shadow-md"
    >
      📥 Télécharger le bulletin PDF
    </button>
  );
}
