import { useState } from "react";
import { cheatsheets } from "./cheatsheets";

export default function App() {
  const [activeId, setActiveId] = useState(cheatsheets[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const ActiveSheet = cheatsheets.find((s) => s.id === activeId)?.component;
  const activeLabel = cheatsheets.find((s) => s.id === activeId)?.label;

  const selectSheet = (id) => {
    setActiveId(id);
    setMenuOpen(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Minimal top bar */}
      <nav
        style={{
          background: "#1a1a2e",
          borderBottom: "1px solid #2a2a4a",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none",
            border: "none",
            color: "#818cf8",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
          }}
          aria-label="Menu"
        >
          ☰
        </button>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            fontSize: 14,
            color: "#94a3b8",
          }}
        >
          {activeLabel}
        </span>
      </nav>

      {/* Slide-out menu overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
          }}
        />
      )}

      {/* Slide-out menu */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: 260,
          background: "#1a1a2e",
          borderRight: "1px solid #2a2a4a",
          zIndex: 300,
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a4a" }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: 18,
              color: "#818cf8",
            }}
          >
            SD Prep
          </span>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>System Design Cheatsheets</div>
        </div>

        <div style={{ padding: "12px 0", flex: 1 }}>
          {cheatsheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => selectSheet(sheet.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: activeId === sheet.id ? "#2a2a4a" : "transparent",
                color: activeId === sheet.id ? "#e2e8f0" : "#94a3b8",
                border: "none",
                borderLeft: activeId === sheet.id ? "3px solid #818cf8" : "3px solid transparent",
                padding: "14px 20px",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: activeId === sheet.id ? 600 : 400,
                fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {sheet.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMenuOpen(false)}
          style={{
            margin: "12px 16px",
            padding: "10px",
            background: "#2a2a4a",
            color: "#94a3b8",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Close
        </button>
      </div>

      {/* Active cheat sheet */}
      <div>{ActiveSheet && <ActiveSheet />}</div>
    </div>
  );
}
