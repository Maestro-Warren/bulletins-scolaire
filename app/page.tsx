import { getClasses, createClass, deleteClass } from "@/lib/actions";
import Link from "next/link";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const classes = await getClasses();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Mes Classes</h1>
      </div>

      {/* Create class form */}
      <form action={createClass} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            name="name"
            placeholder="Nom de la classe (ex: 6ème A, Terminale S...)"
            required
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            + Ajouter une classe
          </button>
        </div>
      </form>

      {/* Classes list */}
      {classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Aucune classe créée pour le moment.</p>
          <p className="text-sm mt-2">
            Commencez par ajouter une classe ci-dessus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {cls.name}
                </h2>
                <DeleteButton id={cls.id} action={deleteClass} />
              </div>
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <span>{cls._count.students} élève(s)</span>
                <span>{cls._count.subjects} matière(s)</span>
              </div>
              <Link
                href={`/classes/${cls.id}`}
                className="inline-block w-full text-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Gérer →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
