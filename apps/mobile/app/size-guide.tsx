import { ScrollView, Text, View } from 'react-native';
import { BRAND } from '@motive-fashion/config';
import {
  ABAYA_JILBAB_CHART,
  DRESS_CHART,
  HIJAB_SPECS,
  ONE_SIZE_COPY,
  SIZE_GUIDE_INTRO,
  SIZE_GUIDE_MEASURE_STEPS,
  cm,
  sizeGuideReturnsCopy,
} from '@motive-fashion/utils';

const heading = { fontSize: 18, marginTop: 8 };
const muted = { color: '#57534e', fontSize: 13 };
const row = { flexDirection: 'row' as const, gap: 8, paddingVertical: 6 };
const cell = { flex: 1, fontSize: 13 };
const headCell = { flex: 1, fontSize: 12, color: '#78716c' };

export default function SizeGuide() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Size guide</Text>
      <Text>{SIZE_GUIDE_INTRO}</Text>

      <Text style={heading}>How to measure</Text>
      {SIZE_GUIDE_MEASURE_STEPS.map((step, index) => (
        <Text key={step}>
          {index + 1}. {step}
        </Text>
      ))}

      <Text style={heading}>Abayas and jilbabs</Text>
      <Text style={muted}>Garment measurements in centimetres. Floor-length overlay.</Text>
      <View style={row}>
        <Text style={headCell}>Size</Text>
        <Text style={headCell}>Bust</Text>
        <Text style={headCell}>Length</Text>
        <Text style={headCell}>Sleeve</Text>
        <Text style={headCell}>Height</Text>
      </View>
      {ABAYA_JILBAB_CHART.map((item) => (
        <View key={item.size} style={row}>
          <Text style={cell}>{item.size}</Text>
          <Text style={cell}>{cm(item.bust)}</Text>
          <Text style={cell}>{cm(item.length)}</Text>
          <Text style={cell}>{cm(item.sleeve)}</Text>
          <Text style={cell}>{item.height}</Text>
        </View>
      ))}

      <Text style={heading}>Dresses</Text>
      <Text style={muted}>Garment measurements in centimetres. Modest calf length.</Text>
      <View style={row}>
        <Text style={headCell}>Size</Text>
        <Text style={headCell}>Bust</Text>
        <Text style={headCell}>Hip</Text>
        <Text style={headCell}>Length</Text>
        <Text style={headCell}>Sleeve</Text>
      </View>
      {DRESS_CHART.map((item) => (
        <View key={item.size} style={row}>
          <Text style={cell}>{item.size}</Text>
          <Text style={cell}>{cm(item.bust)}</Text>
          <Text style={cell}>{cm(item.hip)}</Text>
          <Text style={cell}>{cm(item.length)}</Text>
          <Text style={cell}>{cm(item.sleeve)}</Text>
        </View>
      ))}

      <Text style={heading}>Hijabs</Text>
      {HIJAB_SPECS.map((item) => (
        <Text key={item.name}>
          {item.name}: {item.detail}
        </Text>
      ))}

      <Text style={heading}>One size</Text>
      <Text>{ONE_SIZE_COPY}</Text>
      <Text>{sizeGuideReturnsCopy(BRAND.city, BRAND.returnDays)}</Text>
    </ScrollView>
  );
}
