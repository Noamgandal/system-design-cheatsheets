import { useState } from "react";
import { cheatsheets } from "./cheatsheets";

export default function App() {
  const [activeId, setActiveId] = useState(cheatsheets[0]?.id);
  const ActiveSheet = cheatsheets.find((s) => s.id === activeId)?.component;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Top nav */}
      <nav
        style={{
          background: "#1a1a2e",
          borderBottom: "1px solid #2a2a4a",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 15,
            color: "#818cf8",
            whiteSpace: "nowrap",
          }}
        >
          SD Prep
        </span>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {cheatsheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => setActiveId(sheet.id)}
              style={{
                background: activeId === sheet.id ? "#818cf8" : "#2a2a4a",
                color: activeId === sheet.id ? "#0f0f23" : "#94a3b8",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: activeId === sheet.id ? 700 : 400,
                fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {sheet.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Active cheat sheet */}
      <div>{ActiveSheet && <ActiveSheet />}</div>
    </div>
  );
}
