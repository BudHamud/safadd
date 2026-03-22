import React from "react";
import "./Logo.css";

interface LogoProps {
  size?: number;
  className?: string;
  loading?: boolean;
}

const TOTAL_NUMBERS = 12; // solo marcas grandes
const formatCoord = (value: number) => `${value.toFixed(4)}%`;

export const Logo = ({ size = 80, className = "", loading = false }: LogoProps) => {
  return (
    <div
      className={`logo-root ${className}`}
      style={{ "--logo-size": `${size}px` } as React.CSSProperties}
    >
      <div className="circle_bg">

        {/* Solo marcas grandes en el anillo */}
        {Array.from({ length: TOTAL_NUMBERS }, (_, i) => {
          const angle = (i * 360) / TOTAL_NUMBERS;
          const rad = (angle - 90) * (Math.PI / 180);
          const outerR = 47;
          const innerR = 38;
          const x1 = 50 + outerR * Math.cos(rad);
          const y1 = 50 + outerR * Math.sin(rad);
          const x2 = 50 + innerR * Math.cos(rad);
          const y2 = 50 + innerR * Math.sin(rad);

          return (
            <svg
              key={i}
              viewBox="0 0 100 100"
              className="ticks-svg"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
            >
              <line
                x1={formatCoord(x1)} y1={formatCoord(y1)}
                x2={formatCoord(x2)} y2={formatCoord(y2)}
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          );
        })}

        {/* Picker giratorio */}
        <div className={`circle-picker${loading ? " circle-picker--spinning" : ""}`}>
          <div className="number-picker" />
        </div>

      </div>
    </div>
  );
};
