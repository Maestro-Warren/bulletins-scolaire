import { getClassWithDetails, addSubject, addStudent } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SubjectList } from "./SubjectList";
import { GradeTable } from "./GradeTable";

export const dynamic = "force-dynamic";
import { StudentActions } from "./StudentActions";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getClassWithDetails(id);
  if (!cls) notFound();

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Retour
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">{cls.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Subjects section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📖 Matières & Coefficients
          </h2>
          <form action={addSubject} className="mb-4">
            <input type="hidden" name="classId" value={cls.id} />
            <div className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="Matière"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input
                type="number"
                name="coefficient"
                placeholder="Coef."
                required
                min="1"
                step="1"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </form>
          <SubjectList subjects={cls.subjects} classId={cls.id} />
        </section>

        {/* Students section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            👥 Élèves
          </h2>
          <form action={addStudent} className="mb-4">
            <input type="hidden" name="classId" value={cls.id} />
            <div className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="Nom de l'élève"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </form>
          {cls.students.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun élève ajouté.</p>
          ) : (
            <ul className="space-y-2">
              {cls.students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-700">
                    {student.name}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/classes/${cls.id}/report/${student.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      📄 Bulletin
                    </Link>
                    <StudentActions studentId={student.id} classId={cls.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Grades table */}
      {cls.subjects.length > 0 && cls.students.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📝 Notes (/20)
          </h2>
          <GradeTable
            students={cls.students}
            subjects={cls.subjects}
            classId={cls.id}
          />
        </section>
      )}
    </div>
  );
}
