import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow } from '../theme';

const HOUR_ITEMS = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];
const MINUTE_ITEMS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const ITEM_H = 48;
const VISIBLE_ROWS = 5;
const PICKER_H = ITEM_H * VISIBLE_ROWS;
const WHEEL_W = 72;
const FADE_H = ITEM_H * 1.35;
const CARD_PAD_TOP = 14;
const LABEL_BLOCK = 22;
const SELECTION_TOP = CARD_PAD_TOP + LABEL_BLOCK + 2 * ITEM_H;

function ScrollPickerColumn({
  items,
  selectedIndex,
  onSelect,
  onInteract,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onInteract?: () => void;
}) {
  const ref = useRef<ScrollView>(null);
  const snapping = useRef(false);
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_H)).current;
  const initialOffset = { x: 0, y: selectedIndex * ITEM_H };

  useEffect(() => {
    if (snapping.current) return;
    const y = selectedIndex * ITEM_H;
    ref.current?.scrollTo({ y, animated: false });
    scrollY.setValue(y);
  }, [selectedIndex, scrollY]);

  const commitIndex = (rawY: number) => {
    const clamped = Math.max(0, Math.min(Math.round(rawY / ITEM_H), items.length - 1));
    onSelect(clamped);
    return clamped;
  };

  const onMomentumEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (snapping.current) return;
    commitIndex(e.nativeEvent.contentOffset.y);
  };

  const onDragEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (snapping.current) return;
    snapping.current = true;
    const idx = commitIndex(e.nativeEvent.contentOffset.y);
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    setTimeout(() => { snapping.current = false; }, 150);
  };

  return (
    <View style={styles.wheelWrap}>
      <ScrollView
        ref={ref}
        style={styles.wheelScroll}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        contentOffset={initialOffset}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumEnd}
      onScrollEndDrag={onDragEnd}
      onScrollBeginDrag={onInteract}
      onTouchStart={onInteract}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        nestedScrollEnabled
      >
        {items.map((item, i) => {
          const center = i * ITEM_H;
          const scale = scrollY.interpolate({
            inputRange: [
              center - 2 * ITEM_H,
              center - ITEM_H,
              center,
              center + ITEM_H,
              center + 2 * ITEM_H,
            ],
            outputRange: [0.72, 0.88, 1.12, 0.88, 0.72],
            extrapolate: 'clamp',
          });
          const opacity = scrollY.interpolate({
            inputRange: [
              center - 2 * ITEM_H,
              center - ITEM_H,
              center,
              center + ITEM_H,
              center + 2 * ITEM_H,
            ],
            outputRange: [0.12, 0.42, 1, 0.42, 0.12],
            extrapolate: 'clamp',
          });
          const fontSize = scrollY.interpolate({
            inputRange: [center - ITEM_H, center, center + ITEM_H],
            outputRange: [17, 28, 17],
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              key={`${item}-${i}`}
              style={styles.item}
            onPress={() => {
              if (snapping.current) return;
              onInteract?.();
              snapping.current = true;
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                onSelect(i);
                setTimeout(() => { snapping.current = false; }, 350);
              }}
              activeOpacity={0.75}
            >
              <Animated.Text
                style={[
                  styles.itemText,
                  {
                    opacity,
                    fontSize,
                    transform: [{ scale }],
                  },
                ]}
              >
                {item}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={[Colors.surfaceContainerLow, 'transparent']}
        style={styles.fadeTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', Colors.surfaceContainerLow]}
        style={styles.fadeBottom}
      />
    </View>
  );
}

function toIndices(minutes: number, minMinutes: number, maxMinutes: number) {
  const clamped = Math.min(maxMinutes, Math.max(minMinutes, minutes));
  let hours = Math.floor(clamped / 60);
  let mins = Math.round((clamped % 60) / 5) * 5;
  if (mins === 60) {
    hours += 1;
    mins = 0;
  }
  if (hours >= 8) {
    hours = 8;
    mins = 0;
  }
  const minuteIndex = Math.max(0, MINUTE_ITEMS.indexOf(mins.toString().padStart(2, '0')));
  return {
    hourIndex: Math.min(hours, HOUR_ITEMS.length - 1),
    minuteIndex: minuteIndex >= 0 ? minuteIndex : 0,
  };
}

function fromIndices(hourIndex: number, minuteIndex: number, minMinutes: number, maxMinutes: number) {
  let total = hourIndex * 60 + minuteIndex * 5;
  if (hourIndex === 0 && minuteIndex === 0) total = minMinutes;
  if (hourIndex >= 8) total = maxMinutes;
  return Math.min(maxMinutes, Math.max(minMinutes, total));
}

type Props = {
  value: number;
  onChange: (minutes: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
  onInteract?: () => void;
};

export function DurationScrollPicker({
  value,
  onChange,
  minMinutes = 5,
  maxMinutes = 480,
  onInteract,
}: Props) {
  const { hourIndex, minuteIndex } = toIndices(value, minMinutes, maxMinutes);

  const setHour = (index: number) => {
    onChange(fromIndices(index, minuteIndex, minMinutes, maxMinutes));
  };

  const setMinute = (index: number) => {
    onChange(fromIndices(hourIndex, index, minMinutes, maxMinutes));
  };

  return (
    <View style={styles.card}>
      <View style={styles.selectionFrame} pointerEvents="none">
        <View style={styles.selectionLine} />
        <View style={styles.selectionBand} />
        <View style={styles.selectionLine} />
      </View>

      <View style={styles.columnsRow}>
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Hours</Text>
          <ScrollPickerColumn items={HOUR_ITEMS} selectedIndex={hourIndex} onSelect={setHour} onInteract={onInteract} />
        </View>

        <View style={styles.separator}>
          <Text style={styles.colon}>:</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnLabel}>Minutes</Text>
          <ScrollPickerColumn items={MINUTE_ITEMS} selectedIndex={minuteIndex} onSelect={setMinute} onInteract={onInteract} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '45',
    paddingTop: CARD_PAD_TOP,
    paddingBottom: 12,
    paddingHorizontal: 10,
    overflow: 'hidden',
    ...Shadow.card,
  },
  selectionFrame: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: SELECTION_TOP,
    height: ITEM_H,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  selectionLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.primary + '28',
  },
  selectionBand: {
    flex: 1,
    marginVertical: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryFixed + '55',
    borderWidth: 1,
    borderColor: Colors.primary + '18',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  column: {
    alignItems: 'center',
    gap: 8,
    width: WHEEL_W + 8,
    paddingTop: 0,
  },
  columnLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  separator: {
    width: 20,
    height: PICKER_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  colon: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    color: Colors.primary,
    opacity: 0.35,
    letterSpacing: -1,
  },
  wheelWrap: {
    width: WHEEL_W,
    height: PICKER_H,
    overflow: 'hidden',
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  wheelScroll: {
    width: WHEEL_W,
    height: PICKER_H,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: 'Manrope_800ExtraBold',
    color: Colors.primary,
    letterSpacing: -0.8,
    includeFontPadding: false,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FADE_H,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FADE_H,
  },
});
