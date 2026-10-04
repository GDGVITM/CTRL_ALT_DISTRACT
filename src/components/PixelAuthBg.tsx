export function PixelAuthBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Still colored pixelated background image faded to 50% */}
      <img
        src="/assets/login-bg.png"
        alt=""
        className="h-full w-full object-cover"
        style={{
          opacity: 0.5,
          imageRendering: "pixelated",
        }}
      />
      {/* Subtle CRT scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0px, rgba(0, 0, 0, 0.4) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </div>
  );
}
