'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import gsap from 'gsap';

export default function AnimatedBrickBackground() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  const brickColor = '#C85A3D';
  const brickWidth = 140;
  const brickHeight = 50;
  const rows = 30;
  const cols = 35;
  const totalWidth = cols * brickWidth;
  const totalHeight = rows * brickHeight;

  const seededRandom = useCallback((seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate brick-tracing snake path - traces complete bricks (all 4 sides)
  // Connects bricks via mortar lines (no diagonals)
  const generateSnakePath = useCallback((
    startRow: number,
    startCol: number,
    numBricks: number,
    direction: 'right' | 'left' = 'right'
  ): string => {
    const pathSegments: string[] = [];
    let currentRow = startRow;
    let currentCol = startCol;
    let movingRight = direction === 'right';

    for (let b = 0; b < numBricks && currentRow < rows - 1; b++) {
      const isOffsetRow = currentRow % 2 === 1;
      const rowOffset = isOffsetRow ? brickWidth / 2 : 0;
      const brickX = rowOffset + currentCol * brickWidth;
      const brickY = currentRow * brickHeight;

      if (b === 0) {
        pathSegments.push(`M ${brickX} ${brickY}`);
      }

      // Trace complete brick: top → right → bottom → left
      pathSegments.push(`L ${brickX + brickWidth} ${brickY}`);
      pathSegments.push(`L ${brickX + brickWidth} ${brickY + brickHeight}`);
      pathSegments.push(`L ${brickX} ${brickY + brickHeight}`);
      pathSegments.push(`L ${brickX} ${brickY}`);

      // Calculate next brick position
      currentRow++;
      const nextIsOffset = currentRow % 2 === 1;

      if (movingRight) {
        if (!nextIsOffset) currentCol = Math.min(currentCol + 1, cols - 2);
      } else {
        if (nextIsOffset) currentCol = Math.max(currentCol - 1, 0);
      }

      // Connect to next brick along mortar lines (not diagonal)
      if (b < numBricks - 1 && currentRow < rows - 1) {
        const nextRowOffset = nextIsOffset ? brickWidth / 2 : 0;
        const nextBrickX = nextRowOffset + currentCol * brickWidth;
        const nextBrickY = currentRow * brickHeight;

        // Go down the left edge to bottom of current brick row
        pathSegments.push(`L ${brickX} ${brickY + brickHeight}`);
        // Go horizontally along the mortar line to align with next brick
        pathSegments.push(`L ${nextBrickX} ${brickY + brickHeight}`);
        // We're now at the top-left of the next brick (since nextBrickY = brickY + brickHeight)
      }

      if (b > 0 && b % 3 === 0) movingRight = !movingRight;
    }

    return pathSegments.join(' ');
  }, [brickWidth, brickHeight, rows, cols]);

  // Generate mortar-flowing snake path
  const generateMortarSnake = useCallback((
    startRow: number,
    startCol: number,
    segments: number
  ): string => {
    const pathSegments: string[] = [];
    let currentRow = startRow;
    let currentCol = startCol;
    let goingRight = true;

    const isOffsetRow = (row: number) => row % 2 === 1;
    const startOffset = isOffsetRow(currentRow) ? brickWidth / 2 : 0;
    const startX = startOffset + currentCol * brickWidth;
    const startY = currentRow * brickHeight;

    pathSegments.push(`M ${startX} ${startY}`);

    for (let s = 0; s < segments && currentRow < rows - 1; s++) {
      const rowOffset = isOffsetRow(currentRow) ? brickWidth / 2 : 0;
      const bricksToTraverse = 2 + Math.floor(seededRandom(s * 13 + startRow) * 3);

      let newCol = goingRight
        ? Math.min(currentCol + bricksToTraverse, cols - 1)
        : Math.max(currentCol - bricksToTraverse, 0);

      const newX = (isOffsetRow(currentRow) ? brickWidth / 2 : 0) + newCol * brickWidth;
      const currentY = currentRow * brickHeight;

      pathSegments.push(`L ${newX} ${currentY}`);
      pathSegments.push(`L ${newX} ${currentY + brickHeight}`);

      currentCol = newCol;
      currentRow++;
      goingRight = !goingRight;
    }

    return pathSegments.join(' ');
  }, [brickWidth, brickHeight, rows, cols, seededRandom]);

  // Snakes mostly on edges, less in center
  const snakeConfigs = useMemo(() => [
    // Left edge area
    { startRow: 1, startCol: 1, numBricks: 6, speed: 8, delay: 0, type: 'brick' as const },
    { startRow: 6, startCol: 2, segments: 5, speed: 9, delay: 2, type: 'mortar' as const },
    { startRow: 12, startCol: 1, numBricks: 5, speed: 9, delay: 4, type: 'brick' as const },
    { startRow: 18, startCol: 2, numBricks: 4, speed: 8, delay: 1, type: 'brick' as const },

    // Right edge area
    { startRow: 2, startCol: 28, numBricks: 5, speed: 8, delay: 1.5, type: 'brick' as const },
    { startRow: 8, startCol: 30, segments: 4, speed: 8, delay: 3.5, type: 'mortar' as const },
    { startRow: 14, startCol: 29, numBricks: 4, speed: 8, delay: 0.5, type: 'brick' as const },
    { startRow: 20, startCol: 28, segments: 4, speed: 7, delay: 5, type: 'mortar' as const },

    // Top area (spread)
    { startRow: 1, startCol: 10, numBricks: 4, speed: 9, delay: 3, type: 'brick' as const },
    { startRow: 2, startCol: 22, segments: 4, speed: 8, delay: 6, type: 'mortar' as const },

    // Bottom area (spread)
    { startRow: 22, startCol: 8, numBricks: 4, speed: 8, delay: 2.5, type: 'brick' as const },
    { startRow: 21, startCol: 24, segments: 3, speed: 7, delay: 4.5, type: 'mortar' as const },
  ], []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const snakePaths = svgRef.current.querySelectorAll('.snake-path');
    if (snakePaths.length === 0) return;

    const timelines: gsap.core.Timeline[] = [];

    snakePaths.forEach((path, index) => {
      const pathElement = path as SVGPathElement;
      const length = pathElement.getTotalLength();
      const config = snakeConfigs[index];

      gsap.set(pathElement, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0,
      });

      const tl = gsap.timeline({
        repeat: -1,
        delay: config.delay,
        repeatDelay: 2 + seededRandom(index * 23) * 3, // Faster repeat: 2-5s
      });

      // Fade in quickly
      tl.to(pathElement, {
        opacity: 0.2,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Draw the snake
      tl.to(pathElement, {
        strokeDashoffset: 0,
        duration: config.speed,
        ease: 'none',
      }, '<');

      // Brief slightly brighter pulse
      tl.to(pathElement, {
        opacity: 0.25,
        duration: 0.2,
        ease: 'sine.out',
      });

      // Fade out
      tl.to(pathElement, {
        opacity: 0,
        duration: 1.5,
        ease: 'power2.in',
      });

      // Reset
      tl.set(pathElement, {
        strokeDashoffset: length,
      });

      timelines.push(tl);
    });

    return () => {
      timelines.forEach(tl => tl.kill());
    };
  }, [mounted, snakeConfigs, seededRandom]);

  // Base pattern with higher opacity
  const generateBasePattern = useCallback(() => {
    const lines: React.ReactElement[] = [];

    // Horizontal lines - clearly visible
    for (let row = 0; row <= rows; row++) {
      const y = row * brickHeight;
      const thickness = 0.5 + seededRandom(row * 7) * 0.5;
      const opacity = 0.12 + seededRandom(row * 13) * 0.06; // 12-18% opacity

      lines.push(
        <line
          key={`h-${row}`}
          x1={0}
          y1={y}
          x2={totalWidth}
          y2={y}
          stroke={brickColor}
          strokeWidth={thickness}
          opacity={opacity}
        />
      );
    }

    // Vertical joints - clearly visible
    for (let row = 0; row < rows; row++) {
      const isOffset = row % 2 === 1;
      const startX = isOffset ? brickWidth / 2 : 0;
      const y1 = row * brickHeight;
      const y2 = (row + 1) * brickHeight;

      for (let col = 0; col <= cols; col++) {
        const x = startX + col * brickWidth;
        if (x <= totalWidth && x > 0) {
          const seed = row * 100 + col;
          const thickness = 0.5 + seededRandom(seed * 11) * 0.5;
          const opacity = 0.12 + seededRandom(seed * 17) * 0.06; // 12-18% opacity

          lines.push(
            <line
              key={`v-${row}-${col}`}
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke={brickColor}
              strokeWidth={thickness}
              opacity={opacity}
            />
          );
        }
      }
    }

    return lines;
  }, [rows, cols, brickWidth, brickHeight, totalWidth, brickColor, seededRandom]);

  const generateSnakePaths = useCallback(() => {
    return snakeConfigs.map((config, index) => {
      let pathData: string;

      if (config.type === 'brick') {
        pathData = generateSnakePath(
          config.startRow,
          config.startCol,
          config.numBricks!,
          index % 2 === 0 ? 'right' : 'left'
        );
      } else {
        pathData = generateMortarSnake(
          config.startRow,
          config.startCol,
          config.segments!
        );
      }

      return (
        <path
          key={`snake-${index}`}
          className="snake-path"
          d={pathData}
          fill="none"
          stroke={brickColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0}
        />
      );
    });
  }, [snakeConfigs, generateSnakePath, generateMortarSnake, brickColor]);

  const basePattern = useMemo(() => generateBasePattern(), [generateBasePattern]);
  const snakePaths = useMemo(() => generateSnakePaths(), [generateSnakePaths]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Softer edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 90% at center, transparent 0%, transparent 40%, var(--background) 75%),
            linear-gradient(to right, var(--background) 0%, transparent 5%, transparent 95%, var(--background) 100%),
            linear-gradient(to bottom, var(--background) 0%, transparent 3%, transparent 97%, var(--background) 100%)
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
        <g className="base-pattern">{basePattern}</g>
        <g className="snake-paths">{snakePaths}</g>
      </svg>
    </div>
  );
}
