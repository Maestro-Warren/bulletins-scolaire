"use client";

import { addSubject, addSubjectsBatch } from "@/lib/actions";
import { useState, useRef, useEffect } from "react";

type SubjectSuggestion = { name: string; coefficient: number };

export function SubjectForm({
  classId,
  suggestions,
  currentSubjects,
}: {
  classId: string;
  suggestions: SubjectSuggestion[];
  currentSubjects: string[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newCoef, setNewCoef] = useState("");
  const [adding, setAdding] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Available = suggestions not already in this class
  const available = suggestions.filter(
    (s) => !currentSubjects.some((cs) => cs.toLowerCase() === s.name.toLowerCase())
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map((s) => s.name)));
    }
  };

  const handleAddSelected = async () => {
    const toAdd = available.filter((s) => selected.has(s.name));
    if (toAdd.length === 0) return;
    setAdding(true);
    await addSubjectsBatch(classId, toAdd);
    setSelected(new Set());
    setShowPicker(false);
    setAdding(false);
  };

  const handleAddNew = async (formData: FormData) => {
    formData.set("classId", classId);
    formData.set("name", newName);
    formData.set("coefficient", newCoef);
    await addSubject(formData);
    setNewName("");
    setNewCoef("");
    setShowNewForm(false);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => { setShowPicker(!showPicker); setShowNewForm(false); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm cursor-pointer border border-indigo-200"
          >
            📋 Choisir matière(s) existante(s)
            <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {available.length}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => { setShowNewForm(!showNewForm); setShowPicker(false); }}
          className="flex items-center gap-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          ＋ Nouvelle matière
        </button>
      </div>

      {/* Existing subjects picker */}
      {showPicker && (
        <div ref={pickerRef} className="bg-white border border-indigo-200 rounded-xl shadow-lg overflow-hidden">
          {/* Header with select all */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.size === available.length && available.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span className="font-semibold text-indigo-800">Tout sélectionner</span>
            </label>
            {selected.size > 0 && (
              <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-semibold">
                {selected.size} sélectionnée(s)
              </span>
            )}
          </div>

          {/* Subject list */}
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {available.map((s) => (
              <li
                key={s.name}
                onClick={() => toggleSelect(s.name)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selected.has(s.name) ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.name)}
                  onChange={() => toggleSelect(s.name)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span className="flex-1 font-medium text-gray-800">{s.name}</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                  Coef. {s.coefficient}
                </span>
              </li>
            ))}
          </ul>

          {/* Add button */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selected.size === 0 || adding}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm cursor-pointer"
            >
              {adding
                ? "Ajout en cours..."
                : `Ajouter ${selected.size > 0 ? selected.size : ""} matière(s)`}
            </button>
          </div>
        </div>
      )}

      {/* New subject form */}
      {showNewForm && (
        <form action={handleAddNew} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
          <input type="hidden" name="classId" value={classId} />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la matière"
            required
            className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newCoef}
              onChange={(e) => setNewCoef(e.target.value)}
              placeholder="Coef."
              required
              min="1"
              step="1"
              inputMode="numeric"
              className="w-24 sm:w-20 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm"
            />
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer"
            >
              ✓ Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
