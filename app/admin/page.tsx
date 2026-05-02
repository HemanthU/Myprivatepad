"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Private Admin Panel</h1>

      <div className="flex flex-col gap-4 max-w-md">
        <button
          onClick={() => router.push("/")}
          className="p-4 rounded-xl bg-white text-black font-semibold"
        >
          Homepage
        </button>

        <button
          onClick={() => alert("Pad management system coming next.")}
          className="p-4 rounded-xl bg-gray-900"
        >
          Manage Pads
        </button>

        <button
          onClick={() => alert("Security controls coming next.")}
          className="p-4 rounded-xl bg-gray-900"
        >
          Security Settings
        </button>

        <button
          onClick={() => alert("Self-delete management coming next.")}
          className="p-4 rounded-xl bg-gray-900"
        >
          Self-Delete Controls
        </button>
      </div>
    </main>
  );
}