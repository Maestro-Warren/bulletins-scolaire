"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-lg cursor-pointer shadow-md"
    >
      🖨️ Imprimer le bulletin
    </button>
  );
}
