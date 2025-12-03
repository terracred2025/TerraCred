'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function AnimatedBrickBackground() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Brick color from theme
  const brickColor = '#C85A3D';

  // Pattern dimensions
  const brickWidth = 120;
  const brickHeight = 40;
  const rows = 30;
  const cols = 30;
  const totalWidth = cols * brickWidth;
  const totalHeight = rows * brickHeight;
  const lineLength = totalWidth;
  const jointLength = brickHeight;

  // Seeded random for consistent thickness variation
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const horizontalLines = svgRef.current.querySelectorAll('.h-line');
    const verticalLines = svgRef.current.querySelectorAll('.v-line');
    const allLines = svgRef.current.querySelectorAll('.h-line, .v-line');

    if (horizontalLines.length === 0) return;

    // Set initial state - lines invisible
    gsap.set(horizontalLines, {
      strokeDasharray: lineLength,
      strokeDashoffset: lineLength,
    });

    gsap.set(verticalLines, {
      strokeDasharray: jointLength,
      strokeDashoffset: jointLength,
    });

    // Create master timeline for infinite loop
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });

    // Animate horizontal lines drawing in with stagger
    tl.to(horizontalLines, {
      strokeDashoffset: 0,
      duration: 4,
      stagger: {
        each: 0.08,
        from: 'random',
      },
      ease: 'power1.out',
    });

    // Animate vertical lines (brick joints) with stagger
    tl.to(
      verticalLines,
      {
        strokeDashoffset: 0,
        duration: 2.5,
        stagger: {
          each: 0.01,
          from: 'random',
        },
        ease: 'power1.out',
      },
      '-=3'
    );

    // Breathing pulse effect while lines are visible
    tl.to(
      allLines,
      {
        opacity: 0.18,
        duration: 2,
        ease: 'sine.inOut',
      },
      '-=1'
    );

    tl.to(allLines, {
      opacity: 0.1,
      duration: 2,
      ease: 'sine.inOut',
    });

    tl.to(allLines, {
      opacity: 0.15,
      duration: 2,
      ease: 'sine.inOut',
    });

    // Hold for a moment
    tl.to({}, { duration: 1 });

    // Fade out by drawing lines in reverse
    tl.to(horizontalLines, {
      strokeDashoffset: -lineLength,
      duration: 3,
      stagger: {
        each: 0.04,
        from: 'random',
      },
      ease: 'power1.in',
    });

    tl.to(
      verticalLines,
      {
        strokeDashoffset: -jointLength,
        duration: 2,
        stagger: {
          each: 0.008,
          from: 'random',
        },
        ease: 'power1.in',
      },
      '-=2.5'
    );

    return () => {
      tl.kill();
    };
  }, [mounted, lineLength, jointLength]);

  // Generate brick pattern lines with thickness variation
  const generateBrickPattern = () => {
    const lines: React.ReactElement[] = [];

    // Horizontal lines (brick courses)
    for (let row = 0; row <= rows; row++) {
      const y = row * brickHeight;
      // Thickness variation: 0.5 to 1.5px based on seeded random
      const thickness = 0.5 + seededRandom(row * 7) * 1;
      const baseOpacity = 0.08 + seededRandom(row * 13) * 0.06;

      lines.push(
        <line
          key={`h-${row}`}
          className="h-line"
          x1={0}
          y1={y}
          x2={totalWidth}
          y2={y}
          stroke={brickColor}
          strokeWidth={thickness}
          opacity={baseOpacity}
        />
      );
    }

    // Vertical lines (brick joints) - staggered pattern with variation
    for (let row = 0; row < rows; row++) {
      const isOffset = row % 2 === 1;
      const startX = isOffset ? brickWidth / 2 : 0;
      const y1 = row * brickHeight;
      const y2 = (row + 1) * brickHeight;

      for (let col = 0; col <= cols; col++) {
        const x = startX + col * brickWidth;
        if (x <= totalWidth && x >= 0) {
          const seed = row * 100 + col;
          const thickness = 0.5 + seededRandom(seed * 11) * 1;
          const baseOpacity = 0.08 + seededRandom(seed * 17) * 0.06;

          lines.push(
            <line
              key={`v-${row}-${col}`}
              className="v-line"
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke={brickColor}
              strokeWidth={thickness}
              opacity={baseOpacity}
            />
          );
        }
      }
    }

    return lines;
  };

  // Don't render on server to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Edge fade mask */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 0%, transparent 50%, var(--background) 100%),
            linear-gradient(to right, var(--background) 0%, transparent 15%, transparent 85%, var(--background) 100%),
            linear-gradient(to bottom, var(--background) 0%, transparent 10%, transparent 90%, var(--background) 100%)
          `,
          zIndex: 1,
        }}
      />

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ display: 'block' }}
      >
        {generateBrickPattern()}
      </svg>
    </div>
  );
}
