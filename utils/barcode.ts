// Code128B encoder - generates bar patterns for SVG rendering
const PATTERNS: string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312',
  '132212','221213','221312','231212','112232','122132','122231','113222',
  '123122','123221','223211','221132','221231','213212','223112','312131',
  '311222','321122','321221','312212','322112','322211','212123','212321',
  '232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121',
  '313121','211331','231131','213113','213311','213131','311123','311321',
  '331121','312113','312311','332111','314111','221411','431111','111224',
  '111422','121124','121421','141122','141221','112214','112412','122114',
  '122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112',
  '421211','212141','214121','412121','111143','111341','131141','114113',
  '114311','411113','411311','113141','114131','311141','411131',
  '211412','211214','211232',
  '2331112', // Stop
];

const START_B = 104;
const STOP = 106;

export interface BarSegment {
  x: number;
  width: number;
  isBar: boolean;
}

export function encodeCode128B(text: string): BarSegment[] {
  if (!text || text.length === 0) return [];

  const values: number[] = [START_B];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 126) continue;
    values.push(code - 32);
  }

  // Checksum
  let checksum = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    checksum += i * (values[i] ?? 0);
  }
  checksum = checksum % 103;
  values.push(checksum);
  values.push(STOP);

  // Convert to bar segments
  const segments: BarSegment[] = [];
  let x = 0;

  // Quiet zone
  segments.push({ x, width: 10, isBar: false });
  x += 10;

  for (const val of values) {
    const pattern = PATTERNS[val];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const w = parseInt(pattern[j] ?? '1', 10);
      segments.push({ x, width: w, isBar: j % 2 === 0 });
      x += w;
    }
  }

  // Quiet zone
  segments.push({ x, width: 10, isBar: false });

  return segments;
}

export function getTotalWidth(segments: BarSegment[]): number {
  if (!segments || segments.length === 0) return 0;
  const last = segments[segments.length - 1];
  return (last?.x ?? 0) + (last?.width ?? 0);
}
