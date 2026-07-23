"use client";

import React, { useState, useEffect } from "react";
import { Shield, Smartphone, Key, AlertTriangle, Clock, Server, Monitor, Activity, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function SecurityCenter() {
  const { theme } = useAppStore();
  const router = useRouter();
  
  // Placeholder data simulating a secure session dashboard
  const activeSessions = [
    { id: 1, device: "MacBook Pro M2", location: "San Francisco, CA", ip: "192.168.1.45", lastActive: "Just now", current: true },
    { id: 2, device: "iPhone 14 Pro", location: "San Francisco, CA", ip: "172.56.21.9", lastActive: "2 hours ago", current: false },
    { id: 3, device: "Windows Desktop", location: "New York, NY", ip: "10.0.0.12", lastActive: "3 days ago", current: false }
  ];

  const loginHistory = [
    { id: 1, event: "Successful login", device: "MacBook Pro M2", time: "Today at 9:41 AM", status: "success" },
    { id: 2, event: "Failed attempt", device: "Unknown Device", time: "Yesterday at 11:20 PM", status: "failed" },
    { id: 3, event: "Password changed", device: "MacBook Pro M2", time: "Oct 12 at 4:30 PM", status: "warning" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Security Center</h1>
              <p className="text-sm text-gray-500">Manage your account security and active sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="text-sm font-medium hover:text-blue-500 transition-colors">
              Back to App
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Quick Actions & 2FA */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
              <Key size={24} />
            </div>
            <h2 className="text-lg font-semibold mb-2">Two-Factor Auth (2FA)</h2>
            <p className="text-sm text-gray-500 mb-6">Add an extra layer of security to your account by enabling 2FA via an authenticator app.</p>
            <button className="w-full py-2.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Enable 2FA
            </button>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-semibold mb-2">Brute Force Protection</h2>
            <p className="text-sm text-gray-500 mb-4">Your account is currently protected against automated password guessing attacks.</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-1 bg-green-500/10 text-green-500 font-medium rounded-lg">Active</span>
            </div>
          </section>
        </div>

        {/* Right Column: Sessions & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Sessions */}
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Activity size={20} className="text-blue-500" />
              Active Sessions
            </h2>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="bg-card border border-border rounded-2xl p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 transition-all hover:border-blue-500/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                      {session.device.includes("MacBook") || session.device.includes("Desktop") ? <Monitor size={24} className="text-gray-500" /> : <Smartphone size={24} className="text-gray-500" />}
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {session.device}
                        {session.current && <span className="text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold">Current</span>}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Server size={14} /> {session.ip} • {session.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <Clock size={12} /> {session.lastActive}
                    </span>
                    {!session.current && (
                      <button className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Revoke Session">
                        <LogOut size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-sm text-blue-500 font-medium hover:underline">
              Sign out of all other devices
            </button>
          </section>

          {/* Login History */}
          <section>
            <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {loginHistory.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500' : item.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{item.event}</p>
                        <p className="text-xs text-gray-500">{item.device}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
