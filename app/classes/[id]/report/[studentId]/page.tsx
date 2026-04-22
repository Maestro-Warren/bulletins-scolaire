import { getStudentReport } from "@/lib/actions";
import { LOGO_IMAGE, SCHOOL_NAME } from "@/lib/reportBranding";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReportPDF } from "./ReportPDF";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

function computeStudentAverage(
  studentGrades: { subjectId: string; value: number }[],
  subjects: { id: string; coefficient: number }[]
) {
  let totalWeighted = 0;
  let totalCoef = 0;
  for (const subject of subjects) {
    const grade = studentGrades.find((g) => g.subjectId === subject.id);
    if (grade) {
      totalWeighted += grade.value * subject.coefficient;
      totalCoef += subject.coefficient;
    }
  }
  return totalCoef > 0 ? totalWeighted / totalCoef : null;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
  const student = await getStudentReport(studentId);
  if (!student || student.classId !== id) notFound();

  const subjects = student.class.subjects.map((subject) => {
    const grade = student.grades.find((g) => g.subjectId === subject.id);
    return {
      name: subject.name,
      coefficient: subject.coefficient,
      grade: grade?.value ?? null,
      noteTimesCoef:
        grade ? grade.value * subject.coefficient : null,
    };
  });

  // Totals
  let totalNotes = 0;
  let totalCoef = 0;
  let totalNotesTimesCoef = 0;
  for (const s of subjects) {
    if (s.grade !== null) {
      totalNotes += s.grade;
      totalCoef += s.coefficient;
      totalNotesTimesCoef += s.grade * s.coefficient;
    }
  }
  const average = totalCoef > 0 ? totalNotesTimesCoef / totalCoef : null;

  // Decision
  const decision = average !== null ? (average >= 10 ? "ADMIS" : "REFUSÉ") : null;

  // Rank: compute all students averages
  const allStudents = student.class.students;
  const classSubjects = student.class.subjects;
  const averages: { studentId: string; avg: number }[] = [];
  for (const s of allStudents) {
    const avg = computeStudentAverage(s.grades, classSubjects);
    if (avg !== null) {
      averages.push({ studentId: s.id, avg });
    }
  }
  averages.sort((a, b) => b.avg - a.avg);
  const rank = averages.findIndex((a) => a.studentId === studentId) + 1;
  const totalStudents = allStudents.length;

  // Class best & worst average
  const classAvgBest = averages.length > 0 ? averages[0].avg : null;
  const classAvgWorst = averages.length > 0 ? averages[averages.length - 1].avg : null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/classes/${id}`}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Retour à la classe
        </Link>
      </div>

      {/* Report Card Preview */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-3xl mx-auto overflow-hidden mb-6">
        {/* Header band */}
        <div className="bg-indigo-700 text-white px-8 py-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <Image
                src={LOGO_IMAGE}
                alt={`Logo ${SCHOOL_NAME}`}
                width={72}
                height={72}
                className="h-16 w-16"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200">
                {SCHOOL_NAME}
              </p>
              <h1 className="text-2xl font-bold tracking-wide">
                BULLETIN SCOLAIRE
              </h1>
              <p className="text-indigo-200 mt-1 text-sm">
                Année scolaire {new Date().getFullYear() - 1}–{new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Student info bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-500 uppercase font-semibold">Élève</p>
              <p className="text-lg font-bold text-indigo-900">{student.name}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-500 uppercase font-semibold">Classe</p>
              <p className="text-lg font-bold text-indigo-900">{student.class.name}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-500 uppercase font-semibold">Effectif</p>
              <p className="text-lg font-bold text-indigo-900">{totalStudents} élève(s)</p>
            </div>
          </div>

          {/* Grades table */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-indigo-700 text-white">
                <th className="text-left py-3 px-4 font-semibold rounded-tl-lg">Matière</th>
                <th className="text-center py-3 px-3 font-semibold">Note /20</th>
                <th className="text-center py-3 px-3 font-semibold">Coef.</th>
                <th className="text-center py-3 px-3 font-semibold rounded-tr-lg">Note × Coef.</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr
                  key={s.name}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                >
                  <td className="py-2.5 px-4 font-medium text-gray-700">{s.name}</td>
                  <td className={`py-2.5 px-3 text-center font-semibold ${
                    s.grade !== null && s.grade < 10 ? "text-red-600" : "text-gray-800"
                  }`}>
                    {s.grade !== null ? s.grade.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-600">{s.coefficient}</td>
                  <td className="py-2.5 px-3 text-center font-medium text-gray-700">
                    {s.noteTimesCoef !== null ? s.noteTimesCoef.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-100 border-t-2 border-indigo-300">
                <td className="py-3 px-4 font-bold text-indigo-800">TOTAUX</td>
                <td className="py-3 px-3 text-center font-bold text-indigo-800">
                  {totalNotes.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-center font-bold text-indigo-800">
                  {totalCoef}
                </td>
                <td className="py-3 px-3 text-center font-bold text-indigo-800">
                  {totalNotesTimesCoef.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-600 text-white rounded-xl p-4 text-center shadow">
              <p className="text-xs uppercase font-semibold opacity-80">Moyenne</p>
              <p className="text-2xl font-bold mt-1">
                {average !== null ? average.toFixed(2) : "—"}
              </p>
              <p className="text-xs opacity-70">/20</p>
            </div>
            <div className="bg-indigo-500 text-white rounded-xl p-4 text-center shadow">
              <p className="text-xs uppercase font-semibold opacity-80">Rang</p>
              <p className="text-2xl font-bold mt-1">
                {rank > 0 ? `${rank}${rank === 1 ? "er" : "ème"}` : "—"}
              </p>
              <p className="text-xs opacity-70">/ {totalStudents}</p>
            </div>
            <div className={`rounded-xl p-4 text-center shadow text-white ${
              decision === "ADMIS" ? "bg-green-600" : decision === "REFUSÉ" ? "bg-red-600" : "bg-gray-400"
            }`}>
              <p className="text-xs uppercase font-semibold opacity-80">Décision</p>
              <p className="text-2xl font-bold mt-1">{decision ?? "—"}</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-xs uppercase font-semibold text-gray-500">Moy. classe</p>
              <p className="text-xs mt-2 text-green-600 font-semibold">
                Max : {classAvgBest !== null ? classAvgBest.toFixed(2) : "—"}
              </p>
              <p className="text-xs mt-1 text-red-500 font-semibold">
                Min : {classAvgWorst !== null ? classAvgWorst.toFixed(2) : "—"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              {SCHOOL_NAME} — {new Date().toLocaleDateString("fr-FR")}
            </p>
            <div className="text-center">
              <div className="w-40 border-b border-gray-300 mb-1"></div>
              <p className="text-xs text-gray-400">Signature du Directeur</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <PrintButton />
        <ReportPDF
          studentName={student.name}
          className={student.class.name}
          subjects={subjects}
          average={average}
          rank={rank}
          totalStudents={totalStudents}
          decision={decision}
          totalNotes={totalNotes}
          totalCoef={totalCoef}
          totalNotesTimesCoef={totalNotesTimesCoef}
          classAvgBest={classAvgBest}
          classAvgWorst={classAvgWorst}
        />
      </div>
    </div>
  );
}
