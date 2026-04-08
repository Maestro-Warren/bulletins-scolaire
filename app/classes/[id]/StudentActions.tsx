"use client";

import { deleteStudent } from "@/lib/actions";

export function StudentActions({
  studentId,
  classId,
}: {
  studentId: string;
  classId: string;
}) {
  return (
    <button
      onClick={async () => {
        if (confirm("Supprimer cet élève ?")) {
          await deleteStudent(studentId, classId);
        }
      }}
      className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
      title="Supprimer"
    >
      ✕
    </button>
  );
}
