import { getClassBulletinData } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BulletinManager } from "./BulletinManager";

export const dynamic = "force-dynamic";

export default async function BulletinsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getClassBulletinData(id);
  if (!cls) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/classes/${id}`}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Retour à la classe
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          🎓 Bulletins — {cls.name}
        </h1>
      </div>

      <BulletinManager
        classId={cls.id}
        className={cls.name}
        students={cls.students}
        subjects={cls.subjects}
      />
    </div>
  );
}
