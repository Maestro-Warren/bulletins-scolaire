"use client";

import { deleteSubject, updateSubject, saveGrade } from "@/lib/actions";
import { useState, useEffect, useRef } from "react";

type Subject = {
  id: string;
  name: string;
  coefficient: number;
  classId: string;
};

type Grade = { id: string; value: number; studentId: string; subjectId: string };
type Student = { id: string; name: string; grades: Grade[] };

export function SubjectList({
  subjects,
  classId,
  students,
}: {
  subjects: Subject[];
  classId: string;
  students: Student[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoef, setEditCoef] = useState(1);
  const [gradeSubject, setGradeSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape or outside click
  useEffect(() => {
    if (!gradeSubject) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setGradeSubject(null);
    }
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setGradeSubject(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [gradeSubject]);

  const handleSaveGrade = async (studentId: string, subjectId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 20) return;
    setSavingKey(studentId);
    await saveGrade(studentId, subjectId, num, classId);
    setSavingKey(null);
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (subjects.length === 0) {
    return <p className="text-gray-400 text-sm">Aucune matière ajoutée.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {subjects.map((subject) => (
          <div key={subject.id}>
            {editing === subject.id ? (
              <div className="flex flex-col gap-1.5 p-2.5 bg-white border-2 border-indigo-300 rounded-xl shadow-sm">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  value={editCoef}
                  onChange={(e) => setEditCoef(Number(e.target.value))}
                  min="1"
                  step="1"
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={async () => {
                      await updateSubject(subject.id, classId, editName, editCoef);
                      setEditing(null);
                    }}
                    className="flex-1 py-1 bg-green-600 text-white text-xs rounded-lg cursor-pointer hover:bg-green-700"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="flex-1 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg cursor-pointer hover:bg-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => { if (students.length > 0) setGradeSubject(subject); }}
                className={`group relative flex flex-col items-center p-3 bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl hover:shadow-md hover:border-indigo-300 transition-all ${students.length > 0 ? "cursor-pointer" : ""}`}
              >
                <span className="font-semibold text-gray-800 text-sm text-center leading-tight">
                  {subject.name}
                </span>
                <span className="mt-1 text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                  Coef. {subject.coefficient}
                </span>
                {students.length > 0 && (
                  <span className="mt-1.5 text-[10px] text-gray-400 group-hover:text-indigo-500 transition-colors">
                    Cliquer pour noter
                  </span>
                )}
                {/* Actions — always visible on mobile, hover on desktop */}
                <div
                  className="absolute top-1 right-1 flex sm:hidden group-hover:flex gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditing(subject.id);
                      setEditName(subject.name);
                      setEditCoef(subject.coefficient);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow text-gray-400 hover:text-indigo-600 text-xs cursor-pointer border border-gray-200"
                    title="Modifier"
                  >
                    ✎
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Supprimer cette matière ?")) {
                        await deleteSubject(subject.id, classId);
                      }
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow text-gray-400 hover:text-red-600 text-xs cursor-pointer border border-gray-200"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grade entry modal */}
      {gradeSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Modal header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white font-bold text-lg">{gradeSubject.name}</h3>
                <p className="text-indigo-200 text-xs">
                  Coef. {gradeSubject.coefficient} · {students.length} élève(s)
                </p>
              </div>
              <button
                onClick={() => { setGradeSubject(null); setSearch(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto px-5 py-1">
              {filteredStudents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Aucun résultat</p>
              ) : (
                filteredStudents.map((student, i) => {
                  const grade = student.grades.find(
                    (g) => g.subjectId === gradeSubject.id
                  );
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between py-3 gap-3 ${i > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-800 text-sm truncate">
                          {student.name}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        defaultValue={grade?.value ?? ""}
                        onBlur={(e) =>
                          handleSaveGrade(student.id, gradeSubject.id, e.target.value)
                        }
                        className={`w-20 px-3 py-2 border rounded-lg text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          savingKey === student.id
                            ? "border-indigo-400 bg-indigo-50"
                            : grade
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-gray-300"
                        }`}
                        placeholder="/20"
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400">
                {students.filter((s) => s.grades.some((g) => g.subjectId === gradeSubject.id)).length}/{students.length} notés
              </span>
              <button
                onClick={() => { setGradeSubject(null); setSearch(""); }}
                className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
