"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SubjectData = {
  name: string;
  coefficient: number;
  grade: number | null;
};

export function ReportPDF({
  studentName,
  className,
  subjects,
  average,
}: {
  studentName: string;
  className: string;
  subjects: SubjectData[];
  average: number | null;
}) {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Bulletin Scolaire", 105, 25, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Classe : ${className}`, 105, 35, { align: "center" });

    // Student info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Élève : ${studentName}`, 20, 50);

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(
      `Date : ${now.toLocaleDateString("fr-FR")}`,
      20,
      58
    );

    // Grades table
    const tableData = subjects.map((s) => [
      s.name,
      s.coefficient.toString(),
      s.grade !== null ? s.grade.toFixed(2) : "—",
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Matière", "Coefficient", "Note /20"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center", fontStyle: "bold" },
      },
      styles: { fontSize: 11, cellPadding: 4 },
    });

    // Average
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFillColor(238, 242, 255);
    doc.rect(14, finalY - 2, 182, 14, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("Moyenne Générale :", 20, finalY + 8);
    doc.text(
      average !== null ? `${average.toFixed(2)} /20` : "—",
      180,
      finalY + 8,
      { align: "right" }
    );

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Groupe d'étude Les Leaders",
      105,
      finalY + 30,
      { align: "center" }
    );

    // Signature line
    doc.setDrawColor(200, 200, 200);
    doc.line(120, finalY + 50, 190, finalY + 50);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Signature du Directeur", 155, finalY + 56, { align: "center" });

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
