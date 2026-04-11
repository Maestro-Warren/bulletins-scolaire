import { getClassWithDetails, addStudent, getAllSubjectNames } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SubjectList } from "./SubjectList";
import { SubjectForm } from "./SubjectForm";
import { GradeTable } from "./GradeTable";
import { ClassHeader } from "./ClassHeader";

export const dynamic = "force-dynamic";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getClassWithDetails(id);
  if (!cls) notFound();

  const existingSubjectNames = await getAllSubjectNames();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Retour
          </Link>
          <ClassHeader classId={cls.id} name={cls.name} />
        </div>
        <Link
          href={`/classes/${cls.id}/bulletins`}
          className="w-full sm:w-auto sm:ml-auto text-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md text-sm"
        >
          🎓 Bulletins & Impression
        </Link>
      </div>

      {/* Subjects section — full width */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          📖 Matières & Coefficients
        </h2>
        <SubjectForm classId={cls.id} suggestions={existingSubjectNames} currentSubjects={cls.subjects.map(s => s.name)} />
        <SubjectList subjects={cls.subjects} classId={cls.id} students={cls.students} />
      </section>

      {/* Grades table with add student above */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            📝 Notes (/20)
          </h2>
          <form action={addStudent} className="flex gap-2 w-full sm:w-auto">
            <input type="hidden" name="classId" value={cls.id} />
            <input
              type="text"
              name="name"
              placeholder="Ajouter un élève..."
              required
              className="flex-1 sm:flex-none sm:w-56 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 sm:py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer whitespace-nowrap"
            >
              + Élève
            </button>
          </form>
        </div>

        {cls.subjects.length > 0 && cls.students.length > 0 ? (
          <GradeTable
            students={cls.students}
            subjects={cls.subjects}
            classId={cls.id}
            className={cls.name}
          />
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">
            {cls.subjects.length === 0 && cls.students.length === 0
              ? "Ajoutez des matières et des élèves pour commencer."
              : cls.subjects.length === 0
              ? "Ajoutez des matières pour commencer."
              : "Ajoutez des élèves pour commencer."}
          </p>
        )}
      </section>
    </div>
  );
}
