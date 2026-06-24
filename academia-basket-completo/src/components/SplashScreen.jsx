export default function SplashScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0f1f17",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "20px", zIndex: 9999
    }}>
      <div style={{
        fontSize: "64px",
        animation: "bounce 0.9s ease-in-out infinite alternate"
      }}>
        🏀
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          color: "#fff", fontSize: "20px",
          fontWeight: "700", letterSpacing: "0.02em"
        }}>
          Academia
          <span style={{ color: "#f97316" }}> Basket</span>
        </div>
        <div style={{
          color: "#4a7a60", fontSize: "13px", marginTop: "4px"
        }}>
          Castellón · Internacional
        </div>
      </div>

      <div style={{
        width: "140px", height: "3px",
        background: "#1e4030", borderRadius: "2px",
        overflow: "hidden"
      }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, #1a7a4a, #f97316)",
          borderRadius: "2px",
          animation: "loadbar 1.4s ease-in-out infinite"
        }} />
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-14px) rotate(5deg); }
        }
        @keyframes loadbar {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
