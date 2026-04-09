"use client";

import { saveGrade, updateStudent, deleteStudent } from "@/lib/actions";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Grade = { id: string; value: number; studentId: string; subjectId: string };
type Student = { id: string; name: string; grades: Grade[] };
type Subject = { id: string; name: string; coefficient: number };

export function GradeTable({
  students,
  subjects,
  classId,
  className: clsName,
}: {
  students: Student[];
  subjects: Subject[];
  classId: string;
  className?: string;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const getGrade = useCallback(
    (student: Student, subjectId: string) => {
      return student.grades.find((g) => g.subjectId === subjectId);
    },
    []
  );

  const handleGradeChange = async (
    studentId: string,
    subjectId: string,
    value: string
  ) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 20) return;
    const key = `${studentId}-${subjectId}`;
    setSaving(key);
    await saveGrade(studentId, subjectId, num, classId);
    setSaving(null);
  };

  const computeAverageNum = (student: Student): number | null => {
    let totalWeighted = 0;
    let totalCoef = 0;
    for (const subject of subjects) {
      const grade = getGrade(student, subject.id);
      if (grade) {
        totalWeighted += grade.value * subject.coefficient;
        totalCoef += subject.coefficient;
      }
    }
    return totalCoef > 0 ? totalWeighted / totalCoef : null;
  };

  // Compute averages & rankings
  const studentData = students.map((s) => ({
    student: s,
    average: computeAverageNum(s),
  }));
  const ranked = studentData
    .filter((d) => d.average !== null)
    .sort((a, b) => b.average! - a.average!);

  const getRank = (studentId: string) => {
    const idx = ranked.findIndex((d) => d.student.id === studentId);
    return idx >= 0 ? idx + 1 : 0;
  };

  const getDecision = (avg: number | null) => {
    if (avg === null) return "—";
    return avg >= 10 ? "ADMIS" : "REFUSÉ";
  };

  // Print table
  const handlePrint = () => {
    const printContent = tableRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Tableau Général - ${clsName ?? ""}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h2 { text-align: center; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: center; }
        th { background: #4f46e5; color: white; }
        .admis { color: #16a34a; font-weight: bold; }
        .refuse { color: #dc2626; font-weight: bold; }
      </style></head><body>
      <h2>Tableau Général des Notes — ${clsName ?? ""}</h2>
      <table>
        <thead><tr>
          <th style="text-align:left">Élève</th>
          ${subjects.map((s) => `<th>${s.name}<br><small>Coef. ${s.coefficient}</small></th>`).join("")}
          <th>Moyenne</th><th>Rang</th><th>Décision</th>
        </tr></thead>
        <tbody>
          ${studentData.map((d) => {
            const avg = d.average;
            const r = getRank(d.student.id);
            const dec = getDecision(avg);
            return `<tr>
              <td style="text-align:left">${d.student.name}</td>
              ${subjects.map((sub) => {
                const g = getGrade(d.student, sub.id);
                return `<td>${g ? g.value.toFixed(2) : "—"}</td>`;
              }).join("")}
              <td><strong>${avg !== null ? avg.toFixed(2) : "—"}</strong></td>
              <td>${r > 0 ? `${r}${r === 1 ? "er" : "ème"}` : "—"}</td>
              <td class="${dec === "ADMIS" ? "admis" : dec === "REFUSÉ" ? "refuse" : ""}">${dec}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <p style="text-align:right;font-size:11px;color:#999;margin-top:20px">
        Groupe d'étude Les Leaders — ${new Date().toLocaleDateString("fr-FR")}
      </p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // PDF export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const indigo = [79, 70, 229] as const;

    doc.setFillColor(...indigo);
    doc.rect(0, 0, 297, 28, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Tableau Général des Notes — ${clsName ?? ""}`, 148.5, 18, { align: "center" });

    const head = [["Élève", ...subjects.map((s) => `${s.name} (${s.coefficient})`), "Moyenne", "Rang", "Décision"]];

    const body = studentData.map((d) => {
      const avg = d.average;
      const r = getRank(d.student.id);
      const dec = getDecision(avg);
      return [
        d.student.name,
        ...subjects.map((sub) => {
          const g = getGrade(d.student, sub.id);
          return g ? g.value.toFixed(2) : "—";
        }),
        avg !== null ? avg.toFixed(2) : "—",
        r > 0 ? `${r}${r === 1 ? "er" : "ème"}/${students.length}` : "—",
        dec,
      ];
    });

    autoTable(doc, {
      startY: 35,
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: [...indigo], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { halign: "left" } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: (data) => {
        if (data.section === "body") {
          const colCount = subjects.length + 3;
          // Decision column
          if (data.column.index === colCount) {
            if (data.cell.raw === "ADMIS") {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = "bold";
            } else if (data.cell.raw === "REFUSÉ") {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
          // Moyenne column
          if (data.column.index === colCount - 2) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [79, 70, 229];
          }
        }
      },
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Groupe d'étude Les Leaders — ${new Date().toLocaleDateString("fr-FR")}`,
      14,
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    );

    doc.save(`tableau_general_${(clsName ?? "classe").replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div ref={tableRef}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-600 min-w-[140px]">
                Élève
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="text-center py-3 px-2 font-semibold text-gray-600"
                >
                  <div className="text-xs sm:text-sm">{subject.name}</div>
                  <div className="text-xs text-indigo-500 font-normal">
                    Coef. {subject.coefficient}
                  </div>
                </th>
              ))}
              <th className="text-center py-3 px-2 font-semibold text-indigo-700">
                Moy.
              </th>
              <th className="text-center py-3 px-2 font-semibold text-indigo-700">
                Rang
              </th>
              <th className="text-center py-3 px-2 font-semibold text-indigo-700">
                Décision
              </th>
              <th className="text-center py-3 px-2 font-semibold text-gray-500 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {studentData.map((d) => {
              const avg = d.average;
              const r = getRank(d.student.id);
              const dec = getDecision(avg);
              return (
                <tr key={d.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    {editingStudent === d.student.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              await updateStudent(d.student.id, classId, editName);
                              setEditingStudent(null);
                            }
                            if (e.key === "Escape") setEditingStudent(null);
                          }}
                          autoFocus
                          className="w-full px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={async () => {
                            await updateStudent(d.student.id, classId, editName);
                            setEditingStudent(null);
                          }}
                          className="text-green-600 text-sm cursor-pointer hover:text-green-800"
                        >✓</button>
                      </div>
                    ) : (
                      <span
                        className="font-medium text-gray-700 cursor-pointer hover:text-indigo-600"
                        onClick={() => { setEditingStudent(d.student.id); setEditName(d.student.name); }}
                        title="Cliquer pour modifier le nom"
                      >
                        {d.student.name}
                      </span>
                    )}
                  </td>
                  {subjects.map((subject) => {
                    const grade = getGrade(d.student, subject.id);
                    const key = `${d.student.id}-${subject.id}`;
                    return (
                      <td key={subject.id} className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          defaultValue={grade?.value ?? ""}
                          onBlur={(e) =>
                            handleGradeChange(d.student.id, subject.id, e.target.value)
                          }
                          className={`w-14 sm:w-16 px-1 sm:px-2 py-1 border rounded text-center text-sm
                            ${saving === key ? "border-indigo-400 bg-indigo-50" : "border-gray-300"}
                            focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          placeholder="—"
                        />
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-center font-bold text-indigo-700 text-sm">
                    {avg !== null ? avg.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold text-gray-700 text-sm">
                    {r > 0 ? `${r}${r === 1 ? "er" : "è"}` : "—"}
                  </td>
                  <td className={`py-2 px-2 text-center font-bold text-sm ${
                    dec === "ADMIS" ? "text-green-600" : dec === "REFUSÉ" ? "text-red-600" : "text-gray-400"
                  }`}>
                    {dec}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <Link
                        href={`/classes/${classId}/report/${d.student.id}`}
                        className="text-indigo-500 hover:text-indigo-700 text-xs font-medium cursor-pointer"
                        title="Voir le bulletin"
                      >
                        Bulletin
                      </Link>
                      <button
                        onClick={async () => {
                          if (confirm(`Supprimer ${d.student.name} ?`)) {
                            await deleteStudent(d.student.id, classId);
                          }
                        }}
                        className="text-red-400 hover:text-red-600 text-xs cursor-pointer"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mt-6 justify-end">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm cursor-pointer shadow"
        >
          🖨️ Imprimer le tableau
        </button>
        <button
          onClick={handleExportPDF}
          className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer shadow"
        >
          📥 Télécharger PDF
        </button>
      </div>
    </div>
  );
}
