"use client";

import { useState } from "react";
import GlassSurface from "@/components/GlassSurface";

/* ── Animated background defined OUTSIDE the page component so it
   never remounts when form state (typing/scrolling) triggers a re-render ── */
function AnimatedBackground() {
  return (
    <div className="register-bg-wrapper">
      <div className="register-bg" />
    </div>
  );
}

export default function RegisterPage() {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMemberChange = (index: number, value: string) => {
    setMembers((prev) => {
      const newMembers = [...prev];
      newMembers[index] = value;
      return newMembers;
    });
  };

  const addMemberRow = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMembers((prev) => [...prev, ""]);
  };

  const removeMemberRow = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMembers((prev) => {
      const newMembers = prev.filter((_, i) => i !== index);
      return newMembers.length > 0 ? newMembers : [""];
    });
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

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}) — please try again or contact an admin`);
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to register team");
      }

      // Save session so /bid skips the code-entry screen entirely
      localStorage.setItem(
        "arsenal_session",
        JSON.stringify({
          teamId: data.teamId,
          teamCode: data.code,
          teamName: teamName.trim(),
        })
      );

      // Route directly into the marketplace — code is stored in session, no display screen
      window.location.href = "/market";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-4 font-sans overflow-hidden" style={{ background: "#1e1e1e", color: "#f0f0f0" }}>
      <AnimatedBackground />
      {/* Dark veil over the moving bg */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(30,30,30,0.82)", zIndex: 1, pointerEvents: "none" }} />

      {/* Registration form */}
      <div className="relative w-full max-w-md" style={{ zIndex: 10 }}>
        <GlassSurface
          width={"100%" as any}
          height={"auto" as any}
          borderRadius={28}
          distortionScale={-160}
          redOffset={0}
          greenOffset={8}
          blueOffset={18}
          brightness={55}
          opacity={0.9}
          blur={12}
          backgroundOpacity={0.4}
          saturation={1.1}
          mixBlendMode="screen"
          style={{
            transform: "perspective(1200px) rotateX(2deg) rotateY(-1deg)",
            transition: "transform 0.35s cubic-bezier(0.23,1,0.32,1)",
            boxShadow: "0 4px 24px rgba(66,133,244,0.12), 0 16px 48px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.4)",
          }}
        >
          {/* Google-dark interior */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "rgba(30,30,30,0.88)", zIndex: 0, pointerEvents: "none" }} />

          <div className="p-6 sm:p-8 space-y-7 w-full" style={{ position: "relative", zIndex: 1 }}>
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#f0f0f0", textShadow: "0 2px 16px rgba(66,133,244,0.35)" }}>
                Team Registration
              </h1>
            </div>

            {/* Error — Google Red */}
            {error && (
              <div className="p-4 rounded-xl text-sm font-medium" style={{ color: "#ea4335", background: "rgba(234,67,53,0.1)", border: "1px solid rgba(234,67,53,0.3)" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Team Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "#f0f0f0" }}>Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#f0f0f0",
                    caretColor: "#4285f4",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#4285f4")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  placeholder="Enter team name"
                />
              </div>

              {/* Team Members */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold" style={{ color: "#f0f0f0" }}>Team Members</label>
                  <button
                    type="button"
                    onClick={addMemberRow}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 touch-manipulation cursor-pointer select-none flex items-center gap-1"
                    style={{
                      background: "rgba(52,168,83,0.12)",
                      border: "1px solid rgba(52,168,83,0.35)",
                      color: "#5cdb6d",
                    }}
                  >
                    <span>+</span> Add Member
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {members.map((member, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required={index === 0}
                        value={member}
                        onChange={(e) => handleMemberChange(index, e.target.value)}
                        className="flex-1 rounded-xl px-4 py-3 focus:outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#f0f0f0",
                          caretColor: "#4285f4",
                        }}
                        onFocus={e => (e.target.style.borderColor = "#4285f4")}
                        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                        placeholder={`Member ${index + 1} name`}
                      />
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberRow(index)}
                          className="p-3 rounded-xl transition-all shrink-0 active:scale-95 touch-manipulation cursor-pointer"
                          style={{
                            background: "rgba(234,67,53,0.12)",
                            border: "1px solid rgba(234,67,53,0.3)",
                            color: "#ea4335",
                          }}
                          aria-label="Remove member"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit — Moderately prominent Google 4-color gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-base py-4 px-6 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                style={{
                  background: loading
                    ? "rgba(66,133,244,0.4)"
                    : "linear-gradient(110deg, rgba(66,133,244,0.65) 0%, rgba(52,168,83,0.58) 33%, rgba(249,171,0,0.58) 66%, rgba(234,67,53,0.65) 100%), rgba(20,20,20,0.5)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#ffffff",
                  boxShadow: "0 4px 18px rgba(66,133,244,0.25), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background =
                      "linear-gradient(110deg, rgba(66,133,244,0.8) 0%, rgba(52,168,83,0.72) 33%, rgba(249,171,0,0.72) 66%, rgba(234,67,53,0.8) 100%), rgba(20,20,20,0.5)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 24px rgba(66,133,244,0.35), 0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35)";
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.background =
                      "linear-gradient(110deg, rgba(66,133,244,0.65) 0%, rgba(52,168,83,0.58) 33%, rgba(249,171,0,0.58) 66%, rgba(234,67,53,0.65) 100%), rgba(20,20,20,0.5)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 18px rgba(66,133,244,0.25), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)";
                  }
                }}
              >
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </form>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
}

