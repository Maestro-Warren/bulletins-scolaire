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
            <div className="group relative flex flex-col items-center p-3 bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl hover:shadow-md hover:border-indigo-300 transition-all">
              <span className="font-semibold text-gray-800 text-sm text-center leading-tight">
                {subject.name}
              </span>
              <span className="mt-1 text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                Coef. {subject.coefficient}
              </span>
              {/* Actions on hover */}
              <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
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
  );
}
