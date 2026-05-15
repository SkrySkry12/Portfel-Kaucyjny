import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { encodeCode128B, getTotalWidth } from '../utils/barcode';

interface Props {
  value: string;
  width?: number;
  height?: number;
}

export function BarcodeView({ value, width = 300, height = 100 }: Props) {
  const segments = useMemo(() => encodeCode128B(value ?? ''), [value]);
  const totalUnits = useMemo(() => getTotalWidth(segments), [segments]);

  if (!value || segments.length === 0 || totalUnits === 0) {
    return <View style={[styles.placeholder, { width, height }]} />;
  }

  const scale = width / totalUnits;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="white" />
        {segments.filter(s => s?.isBar).map((s, i) => (
          <Rect
            key={i}
            x={(s?.x ?? 0) * scale}
            y={0}
            width={Math.max((s?.width ?? 0) * scale, 1)}
            height={height}
            fill="black"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden', padding: 8 },
  placeholder: { backgroundColor: '#E5E5E5', borderRadius: 8 },
});
