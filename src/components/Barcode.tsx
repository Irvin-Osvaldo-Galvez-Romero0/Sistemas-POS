import React, { useMemo } from 'react';

// Code 128 (Subset B) encoding patterns (values 0-106)
// Each string is 6 digits (or 7 for STOP), representing widths of alternating bars and spaces.
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104: Start B, 106: Stop)
];

const START_B_CODE = 104;
const STOP_CODE = 106;

interface BarcodeProps {
  /** The value to encode (SKU, barcode numbers, folios) */
  value: string;
  /** Custom text to display under the barcode (defaults to value) */
  text?: string;
  /** Height in pixels of the barcode bars */
  height?: number;
  /** Whether to show the human-readable text below */
  showText?: boolean;
  /** Custom color for the bars (defaults to #1a1a1a) */
  barColor?: string;
  /** Custom CSS classes for the outer wrapper */
  className?: string;
  /** Quiet zone margin in modules (default 10) */
  quietZone?: boolean;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  text,
  height = 42,
  showText = true,
  barColor = '#1a1a1a',
  className = '',
  quietZone = true,
}) => {
  const cleanValue = useMemo(() => {
    return (value || '000000').trim();
  }, [value]);

  const { bars, totalWidth } = useMemo(() => {
    // Collect printable ASCII characters (codes 32 to 126)
    const charValues: number[] = [];
    for (let i = 0; i < cleanValue.length; i++) {
      const code = cleanValue.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        charValues.push(code - 32);
      } else {
        // Fallback for non-ASCII: map to simple modulo
        charValues.push(Math.abs(code) % 95);
      }
    }

    if (charValues.length === 0) {
      charValues.push(16); // '0'
    }

    // Calculate Code 128 checksum: (StartB + sum(val * pos)) % 103
    let checkSum = START_B_CODE;
    for (let i = 0; i < charValues.length; i++) {
      checkSum += charValues[i] * (i + 1);
    }
    const checkValue = checkSum % 103;

    // Build the pattern sequence: StartB -> Chars -> Checksum -> Stop
    const sequence = [START_B_CODE, ...charValues, checkValue, STOP_CODE];
    const patternString = sequence.map((idx) => CODE128_PATTERNS[idx] || '212222').join('');

    const quietMargin = quietZone ? 10 : 2;
    let currentX = quietMargin;
    const computedBars: { x: number; width: number }[] = [];

    // Parse the pattern string: even indices are bars, odd indices are spaces
    for (let i = 0; i < patternString.length; i++) {
      const moduleWidth = parseInt(patternString[i], 10);
      const isBar = i % 2 === 0;

      if (isBar) {
        computedBars.push({ x: currentX, width: moduleWidth });
      }
      currentX += moduleWidth;
    }

    const calculatedTotalWidth = currentX + quietMargin;
    return { bars: computedBars, totalWidth: calculatedTotalWidth };
  }, [cleanValue, quietZone]);

  const displayText = text ?? cleanValue;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-14 block"
        style={{ minWidth: '120px' }}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill={barColor}
          />
        ))}
      </svg>
      {showText && (
        <span
          className="font-mono-code text-[11px] font-bold tracking-wider mt-1 text-[#1a1a1a]"
          style={{ letterSpacing: '0.15em' }}
        >
          {displayText}
        </span>
      )}
    </div>
  );
};
