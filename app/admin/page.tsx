"use client";

import { useRouter } from "next/navigation";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminPage() {
  const router = useRouter();

  const managePad = async () => {
    const padName = prompt("Enter pad keyword:");

    if (padName) {
      router.push(`/${padName}`);
    }
  };

  const securitySettings = async () => {
    const padName = prompt("Enter pad keyword for security settings:");

    if (!padName) return;

    const action = prompt(
      "Type:\nlock → Set password lock\nunlock → Remove lock"
    );

    if (action === "lock") {
      const password = prompt("Enter new password:");

      if (!password) return;

      await setDoc(doc(db, "padSettings", padName), {
        ...(await getDoc(doc(db, "padSettings", padName))).data(),
        locked: true,
        password,
      });

      alert("Pad locked successfully.");
    }

    if (action === "unlock") {
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));

      if (!settingsSnap.exists()) {
        alert("No settings found.");
        return;
      }

      const settings = settingsSnap.data();

      await setDoc(doc(db, "padSettings", padName), {
        ...settings,
        locked: false,
        password: "",
      });

      alert("Pad unlocked successfully.");
    }
  };

  const selfDeleteControls = async () => {
    const padName = prompt("Enter pad keyword:");

    if (!padName) return;

    const action = prompt(
      "Type:\nset → Set self-delete timer\nremove → Remove self-delete"
    );

    if (action === "set") {
      const minutes = prompt("Delete after how many minutes?");

      if (!minutes) return;

      const deleteAt = new Date(Date.now() + Number(minutes) * 60000);

      await setDoc(doc(db, "padSettings", padName), {
        ...(await getDoc(doc(db, "padSettings", padName))).data(),
        selfDelete: true,
        deleteAt: deleteAt.toISOString(),
      });

      alert("Self-delete timer updated.");
    }

    if (action === "remove") {
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));

      if (!settingsSnap.exists()) {
        alert("No settings found.");
        return;
      }

      const settings = settingsSnap.data();

      await setDoc(doc(db, "padSettings", padName), {
        ...settings,
        selfDelete: false,
        deleteAt: "",
      });

      alert("Self-delete removed.");
    }
  };

  const deletePad = async () => {
    const padName = prompt("Enter pad keyword to delete permanently:");

    if (!padName) return;

    const confirmDelete = confirm(
      `Delete "${padName}" permanently? This cannot be undone.`
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "notes", padName));
    await deleteDoc(doc(db, "padSettings", padName));

    alert("Pad deleted permanently.");
  };

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
          onClick={managePad}
          className="p-4 rounded-xl bg-gray-900"
        >
          Manage Pads
        </button>

        <button
          onClick={securitySettings}
          className="p-4 rounded-xl bg-gray-900"
        >
          Security Settings
        </button>

        <button
          onClick={selfDeleteControls}
          className="p-4 rounded-xl bg-gray-900"
        >
          Self-Delete Controls
        </button>

        <button
          onClick={deletePad}
          className="p-4 rounded-xl bg-red-900"
        >
          Delete Pad Permanently
        </button>
      </div>
    </main>
  );
}