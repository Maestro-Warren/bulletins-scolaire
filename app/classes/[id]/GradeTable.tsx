"use client";

import { saveGrade } from "@/lib/actions";
import { useState, useCallback } from "react";

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

  const computeAverage = (student: Student) => {
    let totalWeighted = 0;
    let totalCoef = 0;
    for (const subject of subjects) {
      const grade = getGrade(student, subject.id);
      if (grade) {
        totalWeighted += grade.value * subject.coefficient;
        totalCoef += subject.coefficient;
      }
    }
    return totalCoef > 0 ? (totalWeighted / totalCoef).toFixed(2) : "—";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-semibold text-gray-600">
              Élève
            </th>
            {subjects.map((subject) => (
              <th
                key={subject.id}
                className="text-center py-3 px-2 font-semibold text-gray-600"
              >
                <div>{subject.name}</div>
                <div className="text-xs text-indigo-500 font-normal">
                  Coef. {subject.coefficient}
                </div>
              </th>
            ))}
            <th className="text-center py-3 px-2 font-semibold text-indigo-700">
              Moyenne
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">
                {student.name}
              </td>
              {subjects.map((subject) => {
                const grade = getGrade(student, subject.id);
                const key = `${student.id}-${subject.id}`;
                return (
                  <td key={subject.id} className="py-3 px-2 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      defaultValue={grade?.value ?? ""}
                      onBlur={(e) =>
                        handleGradeChange(student.id, subject.id, e.target.value)
                      }
                      className={`w-16 px-2 py-1 border rounded text-center text-sm
                        ${saving === key ? "border-indigo-400 bg-indigo-50" : "border-gray-300"}
                        focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="—"
                    />
                  </td>
                );
              })}
              <td className="py-3 px-2 text-center font-bold text-indigo-700">
                {computeAverage(student)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
