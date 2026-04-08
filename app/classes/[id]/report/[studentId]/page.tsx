import { getStudentReport } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReportPDF } from "./ReportPDF";

export const dynamic = "force-dynamic";

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
    };
  });

  let totalWeighted = 0;
  let totalCoef = 0;
  for (const s of subjects) {
    if (s.grade !== null) {
      totalWeighted += s.grade * s.coefficient;
      totalCoef += s.coefficient;
    }
  }
  const average = totalCoef > 0 ? totalWeighted / totalCoef : null;

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

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Bulletin Scolaire
          </h1>
          <p className="text-gray-500 mt-1">Classe : {student.class.name}</p>
        </div>

        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <p className="text-lg font-semibold text-indigo-800">
            Élève : {student.name}
          </p>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-semibold">Matière</th>
              <th className="text-center py-2 font-semibold">Coefficient</th>
              <th className="text-center py-2 font-semibold">Note /20</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.name} className="border-b border-gray-100">
                <td className="py-2">{s.name}</td>
                <td className="py-2 text-center">{s.coefficient}</td>
                <td className="py-2 text-center font-medium">
                  {s.grade !== null ? s.grade.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-indigo-200 bg-indigo-50">
              <td className="py-3 font-bold text-indigo-800" colSpan={2}>
                Moyenne Générale
              </td>
              <td className="py-3 text-center font-bold text-indigo-800 text-lg">
                {average !== null ? average.toFixed(2) : "—"} /20
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="text-xs text-gray-400 text-center">
          Groupe d&apos;étude Les Leaders
        </div>
      </div>

      <div className="text-center">
        <ReportPDF
          studentName={student.name}
          className={student.class.name}
          subjects={subjects}
          average={average}
        />
      </div>
    </div>
  );
}
