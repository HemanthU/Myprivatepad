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
          Go to Homepage
        </button>

        <button
          onClick={() => alert("Pad management features coming next.")}
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
      </div>
    </main>
  );
}