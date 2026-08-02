import { useEffect, useRef, useState, useCallback } from "react";
import { DESIGNS } from "./spinnerDesigns";
import { initAudio, updateHum, playFlick, playBrake, playClick, setDesign } from "./audio";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type DragSample = { angle: number; time: number };

type DragState = {
  active: boolean;
  pointerId: number | null;
  samples: DragSample[];
  lastPointerAngle: number;
  accumulatedAngle: number; // absolute spinner angle driven by drag
};

type Stats = {
  rpm: number;
  maxRpm: number;
  rotations: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const TWO_PI = Math.PI * 2;

/** Wrap delta-angle into [-π, π] so rotation across the -π/π seam is correct. */
function wrapAngle(delta: number) {
  while (delta > Math.PI) delta -= TWO_PI;
  while (delta < -Math.PI) delta += TWO_PI;
  return delta;
}

/* ------------------------------------------------------------------ */
/*  App                                                               */
/* ------------------------------------------------------------------ */

export default function App() {
  const [designId, setDesignId] = useState<string>(DESIGNS[0].id);
  const [friction, setFriction] = useState<number>(0.992); // per frame @ 60fps
  const [isDragging, setIsDragging] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [stats, setStats] = useState<Stats>({ rpm: 0, maxRpm: 0, rotations: 0 });

  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[0];
  const DesignComp = design.component;

  /* --- Refs for physics state (don't trigger re-render) --- */
  const angleRef = useRef<number>(0); // radians, absolute
  const omegaRef = useRef<number>(0); // rad/s
  const frictionRef = useRef<number>(friction);
  const spinnerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* --- Drag refs --- */
  const dragRef = useRef<DragState>({
    active: false,
    pointerId: null,
    samples: [],
    lastPointerAngle: 0,
    accumulatedAngle: 0,
  });

  /* --- Keep friction ref synced --- */
  useEffect(() => {
    frictionRef.current = friction;
  }, [friction]);

  /* ----------------------------------------------------------------
     Animation loop — runs the physics every frame.
     Updates the spinner's CSS transform directly (bypassing React).
     Also pushes UI stats ~10 times per second.
  ---------------------------------------------------------------- */
  useEffect(() => {
    let last = performance.now();
    let lastUI = last;
    let totalRotations = 0;
    let maxRpm = 0;
    let prevAngle = angleRef.current;
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!dragRef.current.active) {
        // Exponential decay, dt-corrected so it's independent of frame rate.
        // frictionRef is per-frame @60fps; convert: omega *= friction^(60*dt)
        const k = Math.pow(frictionRef.current, 60 * dt);
        omegaRef.current *= k;

        // Stop jitter at tiny speeds
        if (Math.abs(omegaRef.current) < 0.0005) omegaRef.current = 0;

        angleRef.current += omegaRef.current * dt;
        updateHum(omegaRef.current * 60 / TWO_PI, dt);
      } else {
        updateHum(0, dt);
      }

      // Count rotations from whatever source moved the angle (drag or physics)
      const delta = angleRef.current - prevAngle;
      totalRotations += Math.abs(delta) / TWO_PI;
      prevAngle = angleRef.current;

      if (spinnerRef.current) {
        spinnerRef.current.style.transform = `rotate(${angleRef.current}rad)`;
      }

      // Throttled UI update (~10Hz)
      if (now - lastUI > 100) {
        lastUI = now;
        const rpm = (Math.abs(omegaRef.current) * 60) / TWO_PI;
        if (rpm > maxRpm) maxRpm = rpm;
        setStats({ rpm, maxRpm, rotations: totalRotations });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ----------------------------------------------------------------
     Swipe interaction
  ---------------------------------------------------------------- */
  const getPointerAngle = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      initAudio();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const pointerAngle = getPointerAngle(e.clientX, e.clientY);
      dragRef.current = {
        active: true,
        pointerId: e.pointerId,
        samples: [{ angle: pointerAngle, time: performance.now() }],
        lastPointerAngle: pointerAngle,
        accumulatedAngle: angleRef.current,
      };
      omegaRef.current = 0; // stop any residual spin while grabbing
      setIsDragging(true);
    },
    [getPointerAngle]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
      const pointerAngle = getPointerAngle(e.clientX, e.clientY);
      const drag = dragRef.current;

      // Accumulate delta so we can spin through the ±π seam continuously
      const delta = wrapAngle(pointerAngle - drag.lastPointerAngle);
      drag.lastPointerAngle = pointerAngle;
      drag.accumulatedAngle += delta;
      angleRef.current = drag.accumulatedAngle;

      // Record samples for release-velocity calculation
      const samples = drag.samples;
      const last = samples[samples.length - 1];
      if (
        !last ||
        Math.abs(wrapAngle(pointerAngle - last.angle)) > 0.005 ||
        performance.now() - last.time > 40
      ) {
        samples.push({ angle: pointerAngle, time: performance.now() });
        if (samples.length > 12) samples.shift();
      }
    },
    [getPointerAngle]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      if (
        dragRef.current.pointerId !== null &&
        dragRef.current.pointerId !== e.pointerId
      ) {
        return;
      }

      // Compute angular velocity from last ~120ms of samples
      const samples = dragRef.current.samples;
      const now = performance.now();
      const cutoff = now - 120;
      const recent = samples.filter((s) => s.time >= cutoff);

      let releaseOmega = 0;
      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt > 0.005) {
          let totalDelta = 0;
          for (let i = 1; i < recent.length; i++) {
            totalDelta += wrapAngle(recent[i].angle - recent[i - 1].angle);
          }
          releaseOmega = totalDelta / dt;
        }
      }

      // Cap to a reasonable max (about 2400 RPM)
      const MAX_OMEGA = 250; // rad/s
      releaseOmega = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, releaseOmega));

      omegaRef.current = releaseOmega;
      if (Math.abs(releaseOmega) > 1) playFlick(releaseOmega);
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      dragRef.current.samples = [];
      setIsDragging(false);
    },
    []
  );

  /* --- Keyboard: spacebar gives a spin boost --- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        initAudio();
        const dir = Math.random() > 0.5 ? 1 : -1;
        omegaRef.current += dir * 40;
        playClick();
      } else if (e.code === "KeyB") {
        omegaRef.current = 0;
        playBrake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ----------------------------------------------------------------
     Render
  ---------------------------------------------------------------- */
  const rpmRounded = Math.round(stats.rpm);
  const maxRounded = Math.round(stats.maxRpm);
  const rotRounded = stats.rotations.toFixed(1);

  // A subtle hue for the "speed aura" based on rpm
  const speedFactor = Math.min(stats.rpm / 1500, 1);

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse at top, #1b1e4b 0%, #0f142a 45%, #020417 100%)",
      }}
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${design.primary}33 0%, transparent 40%)`,
          transition: "background 0.6s ease",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex flex-col items-center justify-between gap-4 px-6 pt-6 sm:flex-row sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="4" r="1.5" />
              <circle cx="5" cy="20" r="1.5" />
              <circle cx="19" cy="20" r="1.5" />
              <path d="M12 7v2M7 17l1.5-1M17 17l-1.5-1" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Spin</h1>
            <p className="text-xs text-white/50">Simulateur de Fidget · Glissez pour tourner</p>
          </div>
        </div>

        {/* Creator badge in header */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.15em]">Créateur</span>
          <span className="text-xs font-semibold text-white">Hylst - Geoffroy, avec IA</span>
          <button
            onClick={() => setShowInfo(true)}
            title="Comment ce jeu a été fait"
            className="ml-1 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition-colors"
          >
            ℹ️
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur sm:gap-4 sm:p-3">
          <Stat label="TR/MIN" value={rpmRounded.toLocaleString()} highlight />
          <Stat label="MAX" value={maxRounded.toLocaleString()} />
          <Stat label="TOURS" value={rotRounded} />
        </div>
      </header>

      {/* Stage */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-6 pb-4 sm:pt-10">
        <div
          ref={containerRef}
          className="relative flex items-center justify-center select-none"
          style={{ width: "min(72vh, 560px)", height: "min(72vh, 560px)" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Speed aura */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full blur-3xl transition-opacity"
            style={{
              background: `radial-gradient(circle, ${design.primary}aa 0%, transparent 60%)`,
              opacity: speedFactor * 0.5,
            }}
          />

          {/* Ground shadow */}
          <div
            className="pointer-events-none absolute bottom-4 h-8 w-3/4 rounded-full bg-black/40 blur-xl"
          />

          {/* The spinner */}
          <div
            ref={spinnerRef}
            className="relative z-10 h-full w-full"
            style={{
              cursor: isDragging ? "grabbing" : "grab",
              willChange: "transform",
              transform: `rotate(${angleRef.current}rad)`,
              filter: `drop-shadow(0 20px 25px rgba(0,0,0,0.55))`,
              transition: isDragging ? "none" : undefined,
            }}
          >
            <DesignComp
              id={design.id}
              primary={design.primary}
              secondary={design.secondary}
              accent={design.accent}
            />
          </div>
        </div>

        {/* RPM big readout */}
        <div className="mt-2 flex flex-col items-center">
          <div
            className="text-6xl font-black tabular-nums tracking-tighter sm:text-7xl"
            style={{
              background: `linear-gradient(180deg, #fff 0%, ${design.primary} 120%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 18px ${design.primary}88)`,
            }}
          >
            {rpmRounded}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            tours par minute
          </div>
        </div>
      </main>

      {/* Controls */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-8">
        {/* Design picker */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Modèle
            </span>
            <span className="text-xs text-white/40">{design.tagline}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {DESIGNS.map((d) => {
              const C = d.component;
              const active = d.id === designId;
              return (
                <button
                  key={d.id}
                  onClick={() => { setDesignId(d.id); setDesign(d.id); playClick(); }}
                  className={`group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border transition ${
                    active
                      ? "border-white/40 bg-white/10 shadow-lg"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                  style={
                    active
                      ? { boxShadow: `0 0 24px ${d.primary}55` }
                      : undefined
                  }
                >
                  <div className="h-16 w-16">
                    <C
                      id={d.id}
                      primary={d.primary}
                      secondary={d.secondary}
                      accent={d.accent}
                    />
                  </div>
                  <span className="absolute -bottom-5 text-[10px] font-medium uppercase tracking-wider text-white/60">
                    {d.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Friction slider + buttons */}
        <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:grid-cols-3 sm:items-center">
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Qualité du Roulement
              </label>
              <span className="text-xs tabular-nums text-white/50">
                {frictionLabel(friction)}
              </span>
            </div>
            <input
              type="range"
              min={0.97}
              max={0.999}
              step={0.001}
              value={friction}
              onChange={(e) => { setFriction(parseFloat(e.target.value)); playClick(); }}
              className="w-full accent-white"
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/40">
              <span>Rugueux</span>
              <span>Céramique</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                initAudio();
                const dir = Math.random() > 0.5 ? 1 : -1;
                omegaRef.current += dir * 60;
                playClick();
              }}
              className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
            >
              ⚡ Lancer
            </button>
            <button
              onClick={() => {
                omegaRef.current = 0;
                playBrake();
              }}
              className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
            >
              ■ Freiner
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-4 text-xs text-white/40 sm:flex-row">
          <p className="text-center sm:text-left">
            Glissez le spinner pour tourner · Relâchez pour lancer ·{" "}
            <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono">Espace</kbd> pour propulser ·{" "}
            <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono">B</kbd> pour freiner
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
            <span>Créé par</span>
            <span className="font-semibold text-white">Hylst - Geoffroy</span>
            <span className="text-white/40">avec l'aide de l'IA</span>
          </div>
        </div>
      </section>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111318] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-3.5 text-sm leading-relaxed text-white/80">
              <h3 className="text-xl font-bold text-white">Comment ce jeu a été fait</h3>
              <p><strong className="text-white">Stack :</strong> React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7, compilé en un seul fichier HTML, aucune dépendance chargée depuis l'extérieur.</p>
              <p><strong className="text-white">Graphismes :</strong> le spinner et ses 5 designs (Tri Classique, Hexa, Quad, Barbell, Turbine) sont dessinés en SVG/DOM, avec une aura de vitesse et des effets visuels qui réagissent à la rotation.</p>
              <p><strong className="text-white">Musique &amp; sons :</strong> synthétisés en direct avec l'API Web Audio, aucun fichier audio chargé.</p>
              <p><strong className="text-white">Interactions :</strong> glisser pour lancer le spinner (la vitesse de lancer est déduite du mouvement), touche Espace pour propulser, touche B pour freiner.</p>
              <p><strong className="text-white">Architecture :</strong> une seule boucle d'animation met à jour la vitesse angulaire à chaque image et l'applique à la rotation affichée.</p>
              <p><strong className="text-white">Algorithmes notables :</strong> la vitesse de lancer est calculée à partir de l'historique des ~120 dernières millisecondes de mouvement du doigt, pas juste la dernière position. Le ralentissement suit une friction exponentielle réglable (du « Céramique » très glissant au « Rugueux »), calculée pour rester cohérente quel que soit le nombre d'images par seconde réellement affichées.</p>
            </div>
            <div className="border-t border-white/10 p-4 text-center">
              <button onClick={() => setShowInfo(false)} className="px-6 py-2.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small components / helpers                                        */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-3 py-1 sm:px-5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span
        className={`tabular-nums ${
          highlight ? "text-xl font-bold text-white" : "text-lg font-semibold text-white/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function frictionLabel(f: number) {
  if (f < 0.98) return "Rugueux";
  if (f < 0.99) return "Standard";
  if (f < 0.996) return "Fluide";
  return "Céramique";
}
