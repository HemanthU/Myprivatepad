"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Activity, Shield, FileText, Monitor, Server, Calendar, Filter, Clock } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminActivityPage() {
  const router = useRouter();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL, PADS, FILES, SECURITY, SESSIONS, SYSTEM
  const [dateFilter, setDateFilter] = useState("7 days"); // Today, Yesterday, 7 days, 30 days, Custom
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "sessions">("logs");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch audit logs via server API (requires admin JWT cookie)
        const [logsRes, sessionsRes] = await Promise.all([
          fetch('/api/admin/logs?type=logs&limit=200'),
          fetch('/api/admin/logs?type=sessions&limit=50'),
        ]);

        if (logsRes.status === 401 || sessionsRes.status === 401) {
          router.push('/');
          return;
        }

        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs || []);
        }

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          const fetchedSessions = data.sessions || [];

          // Evaluate session status (Heartbeat timeout is 5 minutes)
          const now = Date.now();
          const FIVE_MINUTES = 5 * 60 * 1000;
          fetchedSessions.forEach((s: any) => {
            if (s.status === 'active') {
              const lastActivity = new Date(s.lastActivity).getTime();
              if (now - lastActivity > FIVE_MINUTES) {
                s.status = 'expired';
              }
            }
          });
          setSessions(fetchedSessions);
        }
      } catch (e) {
        console.error('Failed to fetch admin history', e);
      }
      setLoading(false);
    };

    // Verify admin via server cookie (not sessionStorage)
    fetch('/api/admin/logs?type=logs&limit=1').then(res => {
      if (res.status === 401) {
        router.push('/');
      } else {
        fetchHistory();
      }
    }).catch(() => router.push('/'));
  }, [router]);


  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    // 1. Search Query
    if (searchQuery && !log.action.toLowerCase().includes(searchQuery.toLowerCase()) && !log.padId?.toLowerCase().includes(searchQuery.toLowerCase()) && !log.sessionId?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Category
    if (categoryFilter !== "ALL") {
      const act = log.action.toLowerCase();
      if (categoryFilter === "SYSTEM" && !act.includes("login") && !act.includes("logout") && !act.includes("system")) return false;
      if (categoryFilter === "SECURITY" && !act.includes("security") && !act.includes("locked") && !act.includes("password")) return false;
      if (categoryFilter === "PADS" && !act.includes("pad")) return false;
      if (categoryFilter === "FILES" && !act.includes("file")) return false;
      if (categoryFilter === "SESSIONS" && !act.includes("session")) return false;
    }

    // 3. Date
    const logTime = new Date(log.timestamp).getTime();
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    
    if (dateFilter === "Today") {
      const startOfDay = new Date().setHours(0,0,0,0);
      if (logTime < startOfDay) return false;
    } else if (dateFilter === "Yesterday") {
      const startOfYesterday = new Date(now - DAY).setHours(0,0,0,0);
      const endOfYesterday = new Date(now - DAY).setHours(23,59,59,999);
      if (logTime < startOfYesterday || logTime > endOfYesterday) return false;
    } else if (dateFilter === "7 days" && now - logTime > 7 * DAY) return false;
    else if (dateFilter === "30 days" && now - logTime > 30 * DAY) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-5xl bg-slate-900/70 backdrop-blur-3xl border border-white/10 rounded-3xl z-50 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="text-blue-400" size={24} /> Admin Activity
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 space-y-8 flex-shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Filter size={14} /> Views</h3>
              <div className="space-y-1">
                <button onClick={() => setActiveTab("logs")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === "logs" ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>Activity Logs</button>
                <button onClick={() => setActiveTab("sessions")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === "sessions" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>Session History</button>
              </div>
            </div>

            {activeTab === "logs" && (
              <>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Filter size={14} /> Category</h3>
                  <div className="space-y-1">
                    {["ALL", "PADS", "FILES", "SECURITY", "SESSIONS", "SYSTEM"].map(cat => (
                      <button key={cat} onClick={() => setCategoryFilter(cat)} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${categoryFilter === cat ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Calendar size={14} /> Date Range</h3>
                  <div className="space-y-1">
                    {["Today", "Yesterday", "7 days", "30 days", "All time"].map(range => (
                      <button key={range} onClick={() => setDateFilter(range)} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${dateFilter === range ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === "logs" ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-slate-300">
                  <Search size={18} className="text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search logs by action, pad ID, or session UUID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-sm"
                  />
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">Fetching persistent audit logs...</div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Shield className="text-slate-600 mb-4 mx-auto" size={48} />
                      <h4 className="text-xl font-bold text-white mb-2">No activity found</h4>
                      <p className="text-slate-400">Try adjusting your filters or date range.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest">
                            <th className="p-5 font-bold">Timestamp</th>
                            <th className="p-5 font-bold">Action</th>
                            <th className="p-5 font-bold">Target Pad</th>
                            <th className="p-5 font-bold">Session ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                          {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-5 text-slate-400">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-5 font-medium text-emerald-400 flex items-center gap-2">
                                {log.action}
                              </td>
                              <td className="p-5 text-indigo-300 font-mono">
                                {log.padId}
                              </td>
                              <td className="p-5 text-slate-500 font-mono text-xs">
                                {log.sessionId?.substring(0, 8)}...
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-2 mb-6"><Monitor size={24} className="text-indigo-400"/> Session History</h2>
                
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">Loading sessions...</div>
                  ) : sessions.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-slate-400">No session history recorded.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest">
                            <th className="p-5 font-bold">Session ID</th>
                            <th className="p-5 font-bold">Status</th>
                            <th className="p-5 font-bold">Started At</th>
                            <th className="p-5 font-bold">Last Activity</th>
                            <th className="p-5 font-bold">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                          {sessions.map(s => {
                            const start = new Date(s.startedAt).getTime();
                            const end = s.endedAt ? new Date(s.endedAt).getTime() : new Date(s.lastActivity).getTime();
                            const durationMins = Math.max(1, Math.round((end - start) / 60000));
                            
                            let statusColor = "text-slate-400";
                            if (s.status === "active") statusColor = "text-emerald-400";
                            else if (s.status === "expired") statusColor = "text-amber-400";
                            else if (s.status === "ended") statusColor = "text-slate-500";

                            return (
                              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-5 font-mono text-indigo-300">
                                  {s.sessionId}
                                </td>
                                <td className={`p-5 font-bold uppercase text-xs tracking-wider ${statusColor}`}>
                                  {s.status === "active" ? "● Active" : s.status}
                                </td>
                                <td className="p-5 text-slate-300">
                                  {new Date(s.startedAt).toLocaleString()}
                                </td>
                                <td className="p-5 text-slate-400 flex items-center gap-2">
                                  <Clock size={14}/> {new Date(s.lastActivity).toLocaleString()}
                                </td>
                                <td className="p-5 text-slate-400">
                                  {durationMins} min
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
