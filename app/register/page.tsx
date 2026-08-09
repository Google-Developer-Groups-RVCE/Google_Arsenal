"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const addMemberRow = () => setMembers([...members, ""]);
  
  const removeMemberRow = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index);
    setMembers(newMembers.length > 0 ? newMembers : [""]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validMembers = members.filter((m) => m.trim().length > 0);
    if (!teamName.trim() || validMembers.length === 0) {
      setError("Team name and at least one member are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim(), members: validMembers }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to register team");
      }

      setTeamCode(data.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (teamCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6 text-white font-sans">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Registration Complete!</h1>
          <p className="text-gray-400">Save this code. You will need it to join the auction and bid.</p>
          <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-2">Your Team Code</p>
            <div className="text-6xl font-black font-mono tracking-[0.2em] text-white">
              {teamCode}
            </div>
          </div>
          <p className="text-sm text-yellow-500 bg-yellow-500/10 p-4 rounded-lg font-medium border border-yellow-500/20">
            Take a screenshot or write this down. It cannot be recovered later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 text-white font-sans">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Team Registration</h1>
          <p className="text-gray-400 text-sm">Register your team for Google Arsenal to start bidding.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Team Name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              placeholder="Enter team name"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 flex justify-between items-center">
              <span>Team Members</span>
              <button 
                type="button" 
                onClick={addMemberRow}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                + Add Member
              </button>
            </label>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {members.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    required={index === 0}
                    value={member}
                    onChange={(e) => handleMemberChange(index, e.target.value)}
                    className="flex-1 bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                    placeholder={`Member ${index + 1} name`}
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberRow(index)}
                      className="p-3 text-gray-500 hover:text-red-400 bg-black/50 border border-gray-800 rounded-xl transition-colors shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors active:scale-[0.98]"
          >
            {loading ? "Registering..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
