"use client";

import { deleteSubject, updateSubject } from "@/lib/actions";
import { useState } from "react";

type Subject = {
  id: string;
  name: string;
  coefficient: number;
  classId: string;
};

export function SubjectList({
  subjects,
  classId,
}: {
  subjects: Subject[];
  classId: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoef, setEditCoef] = useState(1);

  if (subjects.length === 0) {
    return <p className="text-gray-400 text-sm">Aucune matière ajoutée.</p>;
  }

  return (
    <ul className="space-y-2">
      {subjects.map((subject) => (
        <li
          key={subject.id}
          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
        >
          {editing === subject.id ? (
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                value={editCoef}
                onChange={(e) => setEditCoef(Number(e.target.value))}
                min="1"
                step="1"
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={async () => {
                  await updateSubject(subject.id, classId, editName, editCoef);
                  setEditing(null);
                }}
                className="text-green-600 text-sm font-medium cursor-pointer"
              >
                ✓
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div>
                <span className="font-medium text-gray-700">
                  {subject.name}
                </span>
                <span className="ml-2 text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Coef. {subject.coefficient}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(subject.id);
                    setEditName(subject.name);
                    setEditCoef(subject.coefficient);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
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
                  className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
