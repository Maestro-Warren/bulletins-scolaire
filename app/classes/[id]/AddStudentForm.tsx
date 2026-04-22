"use client";

import { createStudentInClass } from "@/lib/actions";
import { useState, useTransition, type FormEvent } from "react";

export function AddStudentForm({ classId }: { classId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createStudentInClass(classId, name);

      if (!result.ok) {
        setError(
          result.error === "duplicate"
            ? "Ce nom existe deja dans cette classe."
            : "Le nom de l'eleve est requis."
        );
        return;
      }

      setName("");
      setError(null);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full sm:w-auto">
      <div className="flex gap-2 w-full sm:w-auto">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Ajouter un eleve..."
          required
          disabled={isPending}
          className="flex-1 sm:flex-none sm:w-56 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2.5 sm:py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer whitespace-nowrap disabled:bg-green-300 disabled:cursor-not-allowed"
        >
          {isPending ? "Ajout..." : "+ Eleve"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-700">{error}</p>}
    </form>
  );
}