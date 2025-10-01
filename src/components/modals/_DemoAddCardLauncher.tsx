"use client";

import React from "react";

import AddCardModal from "./AddCardModal";

export default function DemoAddCardLauncher() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-violet-600/80 px-4 py-2 text-white shadow transition hover:bg-violet-500"
      >
        Open Add Card
      </button>

      <AddCardModal
        open={open}
        onClose={() => setOpen(false)}
        initialUrl="https://example.com"
        onSave={(data) => console.log("Saved card:", data)}
      />
    </div>
  );
}
