"use client";

import { saveGrade, updateStudent, deleteStudent } from "@/lib/actions";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";

type Grade = { id: string; value: number; studentId: string; subjectId: string };
type Student = { id: string; name: string; grades: Grade[] };
type Subject = { id: string; name: string; coefficient: number };

export function GradeTable({
  students,
  subjects,
  classId,
}: {
  students: Student[];
  subjects: Subject[];
  classId: string;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const normalizeStudentName = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");

  const duplicateNameCounts = new Map<string, number>();
  for (const student of students) {
    const normalizedName = normalizeStudentName(student.name);
    duplicateNameCounts.set(
      normalizedName,
      (duplicateNameCounts.get(normalizedName) ?? 0) + 1
    );
  }

  const subjectEmptyCounts = new Map<string, number>();
  for (const subject of subjects) {
    const emptyCount = students.reduce((count, student) => {
      const hasGrade = student.grades.some((grade) => grade.subjectId === subject.id);
      return count + (hasGrade ? 0 : 1);
    }, 0);

    subjectEmptyCounts.set(subject.id, emptyCount);
  }

  const getEmptyGradeCount = (student: Student) =>
    subjects.reduce((count, subject) => {
      const hasGrade = student.grades.some((grade) => grade.subjectId === subject.id);
      return count + (hasGrade ? 0 : 1);
    }, 0);

  const saveStudentName = async (studentId: string) => {
    const result = await updateStudent(studentId, classId, editName);

    if (!result.ok) {
      setNameError(
        result.error === "duplicate"
          ? "Nom deja utilise dans cette classe."
          : "Le nom de l'eleve est requis."
      );
      return;
    }

    setNameError(null);
    setEditingStudent(null);
  };

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
    setToast(true);
    setTimeout(() => setToast(false), 2000);
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

  return (
    <div ref={tableRef}>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-xl shadow-lg animate-bounce">
          <span className="text-lg">✓</span>
          Note enregistrée avec succès
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-600 min-w-[120px] sm:min-w-[140px] sticky left-0 bg-white z-10">
                Élève
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="text-center py-3 px-2 font-semibold text-gray-600"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="rounded-full border border-slate-200/80 bg-white/65 px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur-sm">
                      {subjectEmptyCounts.get(subject.id) ?? 0} vide(s)
                    </span>
                    <div className="text-xs sm:text-sm">{subject.name}</div>
                    <div className="text-xs text-indigo-500 font-normal">
                      Coef. {subject.coefficient}
                    </div>
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
              const duplicateCount =
                duplicateNameCounts.get(normalizeStudentName(d.student.name)) ?? 0;
              const emptyGradeCount = getEmptyGradeCount(d.student);
              return (
                <tr key={d.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 sticky left-0 bg-white z-10">
                    {editingStudent === d.student.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              if (nameError) {
                                setNameError(null);
                              }
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                await saveStudentName(d.student.id);
                              }
                              if (e.key === "Escape") {
                                setNameError(null);
                                setEditingStudent(null);
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={async () => {
                              await saveStudentName(d.student.id);
                            }}
                            className="text-green-600 text-base p-1 cursor-pointer hover:text-green-800"
                          >✓</button>
                        </div>
                        {nameError && <p className="text-xs text-amber-700">{nameError}</p>}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 py-1">
                        <span
                          className="block font-medium text-gray-700 cursor-pointer hover:text-indigo-600 text-sm"
                          onClick={() => {
                            setEditingStudent(d.student.id);
                            setEditName(d.student.name);
                            setNameError(null);
                          }}
                          title="Cliquer pour modifier le nom"
                        >
                          {d.student.name}
                        </span>
                        {duplicateCount > 1 && (
                          <span className="rounded-full border border-amber-300/60 bg-amber-100/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 backdrop-blur-sm">
                            Doublon x{duplicateCount}
                          </span>
                        )}
                        <span className="rounded-full border border-slate-200/80 bg-white/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur-sm">
                          {emptyGradeCount} vide(s)
                        </span>
                      </div>
                    )}
                  </td>
                  {subjects.map((subject) => {
                    const grade = getGrade(d.student, subject.id);
                    const key = `${d.student.id}-${subject.id}`;
                    return (
                      <td key={subject.id} className="py-2 px-1 sm:px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          inputMode="decimal"
                          defaultValue={grade?.value ?? ""}
                          onBlur={(e) =>
                            handleGradeChange(d.student.id, subject.id, e.target.value)
                          }
                          className={`w-16 sm:w-16 px-1.5 sm:px-2 py-1.5 sm:py-1 border rounded text-center text-base sm:text-sm
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
    </div>
  );
}
