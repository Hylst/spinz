import type { FC } from "react";

/* ------------------------------------------------------------------ */
/*  Common primitives                                                 */
/* ------------------------------------------------------------------ */

type DesignProps = {
  primary: string;
  secondary: string;
  accent: string;
  id: string;
};

/** Central bearing cap shared by all designs. */
const Bearing = ({ accent }: { accent: string }) => (
  <g>
    <circle r={34} fill="url(#shadowGrad)" />
    <circle r={28} fill={accent} stroke="#0b1020" strokeWidth={2} />
    <circle r={20} fill="#0b1020" />
    <circle r={10} fill={accent} opacity={0.85} />
    <circle r={4} fill="#0b1020" />
  </g>
);

/** Weight cap at end of an arm. */
const Weight = ({
  primary,
  r = 34,
}: {
  primary: string;
  r?: number;
}) => (
  <g>
    <circle r={r} fill="url(#shadowGrad)" />
    <circle r={r - 4} fill={primary} stroke="#0b1020" strokeWidth={2} />
    <circle r={r - 14} fill="#0b1020" opacity={0.55} />
    <circle r={r - 20} fill={primary} opacity={0.9} />
  </g>
);

/* ------------------------------------------------------------------ */
/*  Shared SVG defs (gradients, filters)                              */
/* ------------------------------------------------------------------ */

export const Defs = () => (
  <defs>
    <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stopColor="transparent" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
    </radialGradient>
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/* ------------------------------------------------------------------ */
/*  1. Classic Tri-lobe                                               */
/* ------------------------------------------------------------------ */

export const TriSpinner: FC<DesignProps> = ({ primary, secondary, accent }) => (
  <svg viewBox="-150 -150 300 300" className="h-full w-full">
    <Defs />
    <g filter="url(#softGlow)">
      {[0, 120, 240].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <rect
            x={-18}
            y={-100}
            width={36}
            height={100}
            rx={18}
            fill={secondary}
            stroke="#0b1020"
            strokeWidth={2}
          />
          <g transform="translate(0,-100)">
            <Weight primary={primary} />
          </g>
        </g>
      ))}
      <Bearing accent={accent} />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  2. Hex (6-lobe)                                                   */
/* ------------------------------------------------------------------ */

export const HexSpinner: FC<DesignProps> = ({ primary, secondary, accent }) => (
  <svg viewBox="-150 -150 300 300" className="h-full w-full">
    <Defs />
    <g filter="url(#softGlow)">
      {/* Hex plate */}
      <polygon
        points={Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3 - Math.PI / 2;
          return `${Math.cos(a) * 70},${Math.sin(a) * 70}`;
        }).join(" ")}
        fill={secondary}
        stroke="#0b1020"
        strokeWidth={2}
      />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <g transform="translate(0,-95)">
            <Weight primary={primary} r={26} />
          </g>
        </g>
      ))}
      <Bearing accent={accent} />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  3. Quad (4-lobe)                                                  */
/* ------------------------------------------------------------------ */

export const QuadSpinner: FC<DesignProps> = ({ primary, secondary, accent }) => (
  <svg viewBox="-150 -150 300 300" className="h-full w-full">
    <Defs />
    <g filter="url(#softGlow)">
      {[0, 90, 180, 270].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <rect
            x={-16}
            y={-95}
            width={32}
            height={95}
            rx={16}
            fill={secondary}
            stroke="#0b1020"
            strokeWidth={2}
          />
          <g transform="translate(0,-95)">
            <Weight primary={primary} r={30} />
          </g>
        </g>
      ))}
      <circle r={52} fill={secondary} stroke="#0b1020" strokeWidth={2} />
      <Bearing accent={accent} />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  4. Barbell (2-lobe)                                               */
/* ------------------------------------------------------------------ */

export const BarbellSpinner: FC<DesignProps> = ({ primary, secondary, accent }) => (
  <svg viewBox="-150 -150 300 300" className="h-full w-full">
    <Defs />
    <g filter="url(#softGlow)">
      {[0, 180].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <rect
            x={-22}
            y={-115}
            width={44}
            height={115}
            rx={22}
            fill={secondary}
            stroke="#0b1020"
            strokeWidth={2}
          />
          <g transform="translate(0,-115)">
            <Weight primary={primary} r={42} />
          </g>
        </g>
      ))}
      <circle r={46} fill={secondary} stroke="#0b1020" strokeWidth={2} />
      <Bearing accent={accent} />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  5. Wheel (disc with spokes + holes)                               */
/* ------------------------------------------------------------------ */

export const WheelSpinner: FC<DesignProps> = ({ primary, secondary, accent }) => (
  <svg viewBox="-150 -150 300 300" className="h-full w-full">
    <Defs />
    <g filter="url(#softGlow)">
      <circle r={130} fill={secondary} stroke="#0b1020" strokeWidth={2} />
      <circle r={122} fill="none" stroke={primary} strokeWidth={3} opacity={0.6} />
      {/* Cut-out holes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const cx = Math.cos(a) * 85;
        const cy = Math.sin(a) * 85;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={22}
            fill="#0b1020"
            opacity={0.85}
          />
        );
      })}
      {/* Spokes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x={-6}
          y={-62}
          width={12}
          height={62}
          rx={6}
          fill={primary}
          stroke="#0b1020"
          strokeWidth={1.5}
          transform={`rotate(${i * 45})`}
        />
      ))}
      <circle r={62} fill={secondary} stroke="#0b1020" strokeWidth={2} />
      <Bearing accent={accent} />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Catalog                                                           */
/* ------------------------------------------------------------------ */

export type SpinnerDesign = {
  id: string;
  name: string;
  tagline: string;
  component: FC<DesignProps>;
  primary: string;
  secondary: string;
  accent: string;
};

export const DESIGNS: SpinnerDesign[] = [
  {
    id: "tri",
    name: "Tri Classique",
    tagline: "L'icône légendaire à trois branches",
    component: TriSpinner,
    primary: "#6366f1",
    secondary: "#a5b4fc",
    accent: "#e0e7ff",
  },
  {
    id: "hex",
    name: "Hexa",
    tagline: "Six points d'équilibre parfait",
    component: HexSpinner,
    primary: "#ec4899",
    secondary: "#f9a8d4",
    accent: "#fce7f3",
  },
  {
    id: "quad",
    name: "Quad",
    tagline: "Symétrie carrée robuste",
    component: QuadSpinner,
    primary: "#10b981",
    secondary: "#6ee7b7",
    accent: "#d1fae5",
  },
  {
    id: "barbell",
    name: "Barbell",
    tagline: "Deux contrepoids massifs",
    component: BarbellSpinner,
    primary: "#f59e0b",
    secondary: "#fcd34d",
    accent: "#fef3c7",
  },
  {
    id: "wheel",
    name: "Turbine",
    tagline: "Roue ajourée aérodynamique",
    component: WheelSpinner,
    primary: "#06b6d4",
    secondary: "#67e8f9",
    accent: "#cffafe",
  },
];
