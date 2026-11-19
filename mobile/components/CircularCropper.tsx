import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Gesture, GestureDetector, GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

type CropAsset = {
  uri: string;
  width: number;
  height: number;
};

function coveredSize(width: number, height: number, cropSize: number) {
  if (width <= 0 || height <= 0) return { displayW: cropSize, displayH: cropSize };
  if (width >= height) {
    return { displayW: cropSize * (width / height), displayH: cropSize };
  }
  return { displayW: cropSize, displayH: cropSize * (height / width) };
}

export function CircularCropper({
  asset,
  onCancel,
  onConfirm,
}: {
  asset: CropAsset;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const cropSize = Math.max(120, Math.min(stage.width - 48, stage.height - 48, 320));
  const cropLeft = (stage.width - cropSize) / 2;
  const cropTop = (stage.height - cropSize) / 2;
  const { displayW, displayH } = coveredSize(asset.width, asset.height, cropSize);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const startRef = useRef({ scale: 1, x: 0, y: 0 });
  const metrics = useRef({ displayW, displayH, cropSize });
  metrics.current = { displayW, displayH, cropSize };

  function apply(nextScale: number, x: number, y: number) {
    const { displayW: width, displayH: height, cropSize: size } = metrics.current;
    const limited = Math.min(4, Math.max(1, nextScale));
    const maxX = Math.max(0, (width * limited - size) / 2);
    const maxY = Math.max(0, (height * limited - size) / 2);
    const next = {
      scale: limited,
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
    scaleRef.current = next.scale;
    translateRef.current = { x: next.x, y: next.y };
    setScale(next.scale);
    setTranslate({ x: next.x, y: next.y });
  }

  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pan()
          .runOnJS(true)
          .onBegin(() => {
            startRef.current = { scale: scaleRef.current, x: translateRef.current.x, y: translateRef.current.y };
          })
          .onUpdate((event) => {
            apply(scaleRef.current, startRef.current.x + event.translationX, startRef.current.y + event.translationY);
          }),
        Gesture.Pinch()
          .runOnJS(true)
          .onBegin(() => {
            startRef.current = { scale: scaleRef.current, x: translateRef.current.x, y: translateRef.current.y };
          })
          .onUpdate((event) => {
            apply(startRef.current.scale * event.scale, translateRef.current.x, translateRef.current.y);
          }),
      ),
    [],
  );

  async function confirm() {
    if (working || stage.width === 0) return;
    setWorking(true);
    try {
      const loaded = await ImageManipulator.manipulate(asset.uri).renderAsync();
      const pixelW = loaded.width;
      const pixelH = loaded.height;
      const currentScale = scaleRef.current;
      const scaledW = displayW * currentScale;
      const scaledH = displayH * currentScale;
      const imageLeft = (cropSize - scaledW) / 2 + translateRef.current.x;
      const imageTop = (cropSize - scaledH) / 2 + translateRef.current.y;
      const frame = squareInside(pixelW, pixelH, {
        originX: (-imageLeft / scaledW) * pixelW,
        originY: (-imageTop / scaledH) * pixelH,
        width: (cropSize / scaledW) * pixelW,
        height: (cropSize / scaledH) * pixelH,
      });
      const cropped = await ImageManipulator.manipulate(loaded)
        .crop(frame)
        .resize({ width: 1024, height: 1024 })
        .renderAsync();
      const saved = await cropped.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
      onConfirm(saved.uri);
    } catch (error) {
      setWorking(false);
      Alert.alert('Fotoğraf hazırlanamadı', error instanceof Error ? error.message : 'Kırpma tamamlanamadı.');
    }
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.stage}
          collapsable={false}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setStage((current) => (current.width === width && current.height === height ? current : { width, height }));
          }}
        >
          {stage.width > 0 ? (
            <Image
              source={{ uri: asset.uri }}
              style={{
                position: 'absolute',
                width: displayW,
                height: displayH,
                left: cropLeft + (cropSize - displayW) / 2,
                top: cropTop + (cropSize - displayH) / 2,
                transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
              }}
            />
          ) : null}
          {stage.width > 0 ? (
            <Svg width={stage.width} height={stage.height} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <Mask id="circle-hole">
                  <Rect width={stage.width} height={stage.height} fill="white" />
                  <Circle cx={cropLeft + cropSize / 2} cy={cropTop + cropSize / 2} r={cropSize / 2} fill="black" />
                </Mask>
              </Defs>
              <Rect width={stage.width} height={stage.height} fill="rgba(0,0,0,0.72)" mask="url(#circle-hole)" />
              <Circle
                cx={cropLeft + cropSize / 2}
                cy={cropTop + cropSize / 2}
                r={cropSize / 2 - 1}
                fill="none"
                stroke={colors.cream}
                strokeWidth={2}
              />
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.hint}>Fotoğrafı daireye yerleştir</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={onCancel} disabled={working} style={styles.secondary}>
            <Text style={styles.secondaryText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirm} disabled={working} style={styles.primary}>
            {working ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.primaryText}>Kullan</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

function squareInside(
  pixelW: number,
  pixelH: number,
  frame: { originX: number; originY: number; width: number; height: number },
) {
  const side = Math.max(1, Math.min(frame.width, frame.height, pixelW, pixelH));
  const originX = Math.max(0, Math.min(Math.round(frame.originX), pixelW - side));
  const originY = Math.max(0, Math.min(Math.round(frame.originY), pixelH - side));
  const width = Math.max(1, Math.min(Math.round(side), pixelW - originX));
  const height = Math.max(1, Math.min(Math.round(side), pixelH - originY));
  const fitted = Math.min(width, height);
  return { originX, originY, width: fitted, height: fitted };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  stage: { flex: 1, overflow: 'hidden' },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#000000',
  },
  hint: { color: colors.goldSoft, textAlign: 'center', fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  secondaryText: { color: colors.cream, fontWeight: '700' },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.wine,
  },
  primaryText: { color: colors.cream, fontWeight: '700' },
});
