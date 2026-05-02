"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  const openPad = () => {
    if (!keyword.trim()) return;
    router.push(`/${keyword.trim()}`);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert mb-8"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Private Pad By HEMU
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Enter a keyword to create or open your private cloud pad.
          </p>

          <div className="w-full max-w-md flex flex-col gap-4 mt-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openPad()}
              placeholder="Enter pad keyword"
              className="w-full p-4 rounded-xl bg-gray-900 text-white outline-none text-lg"
            />

            <button
              onClick={openPad}
              className="w-full p-4 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold"
            >
              Open Pad
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}