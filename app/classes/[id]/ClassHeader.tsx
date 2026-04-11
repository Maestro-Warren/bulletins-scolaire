"use client";

import { updateClass } from "@/lib/actions";
import { useState } from "react";

export function ClassHeader({ classId, name }: { classId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim() || value.trim() === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    setSaving(true);
    await updateClass(classId, value.trim());
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setValue(name); setEditing(false); }
          }}
          autoFocus
          className="text-2xl sm:text-3xl font-bold text-gray-800 px-2 py-1 border-2 border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-xs"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-2 text-green-600 hover:text-green-800 text-xl cursor-pointer disabled:opacity-50"
        >
          ✓
        </button>
        <button
          onClick={() => { setValue(name); setEditing(false); }}
          className="p-2 text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <h1
      className="text-2xl sm:text-3xl font-bold text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors"
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier le nom"
    >
      {name}
      <span className="ml-2 text-sm text-gray-300 font-normal">✎</span>
    </h1>
  );
}
