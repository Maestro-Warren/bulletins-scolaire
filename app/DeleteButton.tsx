"use client";

export function DeleteButton({
  id,
  action,
  label = "✕",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label?: string;
}) {
  return (
    <button
      onClick={async () => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ?")) {
          await action(id);
        }
      }}
      className="text-red-400 hover:text-red-600 text-sm font-medium cursor-pointer"
      title="Supprimer"
    >
      {label}
    </button>
  );
}
