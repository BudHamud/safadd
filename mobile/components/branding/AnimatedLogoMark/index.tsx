import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { styles } from './styles';

type Props = {
  size?: number;
  animate?: boolean;
  showHalo?: boolean;
};

const TOTAL_TICKS = 12;

export function AnimatedLogoMark({ size = 88, animate = true, showHalo = true }: Props) {
  const { theme: C } = useTheme();
  const rotation = useRef(new Animated.Value(animate ? 0 : 510)).current;
  const glow = useRef(new Animated.Value(showHalo ? 0.18 : 0)).current;
  const pulse = useRef(new Animated.Value(0.94)).current;

  const ticks = useMemo(() => {
    return Array.from({ length: TOTAL_TICKS }, (_, index) => {
      const angle = (index * 360) / TOTAL_TICKS;
      const rad = (angle - 90) * (Math.PI / 180);
      const outerR = 47;
      const innerR = 38;

      return {
        key: `tick-${index}`,
        x1: 50 + outerR * Math.cos(rad),
        y1: 50 + outerR * Math.sin(rad),
        x2: 50 + innerR * Math.cos(rad),
        y2: 50 + innerR * Math.sin(rad),
      };
    });
  }, []);

  useEffect(() => {
    if (!animate) {
      rotation.stopAnimation();
      glow.stopAnimation();
      pulse.stopAnimation();
      rotation.setValue(510);
      glow.setValue(showHalo ? 0.18 : 0);
      pulse.setValue(1);
      return;
    }

    const haloAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glow, {
            toValue: showHalo ? 0.34 : 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glow, {
            toValue: showHalo ? 0.16 : 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.94,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const runAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 720,
          duration: 960,
          easing: Easing.bezier(0.4, 0, 0.15, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 830,
          duration: 600,
          easing: Easing.bezier(0.8, 0, 0.1, 1),
          useNativeDriver: true,
        }),
        Animated.delay(240),
        Animated.timing(rotation, {
          toValue: 430,
          duration: 1080,
          easing: Easing.bezier(0.15, 0, 0.1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 400,
          duration: 480,
          easing: Easing.bezier(0.8, 0, 0.1, 1),
          useNativeDriver: true,
        }),
        Animated.delay(240),
        Animated.timing(rotation, {
          toValue: 490,
          duration: 840,
          easing: Easing.bezier(0.15, 0, 0.1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 510,
          duration: 240,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(720),
        Animated.timing(rotation, {
          toValue: 720,
          duration: 600,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );

    haloAnimation.start();
    runAnimation.start();
    return () => {
      runAnimation.stop();
      haloAnimation.stop();
    };
  }, [animate, glow, pulse, rotation, showHalo]);

  const spin = rotation.interpolate({
    inputRange: [0, 830],
    outputRange: ['0deg', '830deg'],
  });

  return (
    <View style={[styles.root, { width: size, height: size }]}> 
      {showHalo ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: size * 2.9,
              height: size * 2.9,
              borderRadius: size * 1.45,
              backgroundColor: C.primary,
              opacity: glow,
              transform: [{ scale: pulse }],
            },
          ]}
        />
      ) : null}

      <View style={[styles.logoShell, { backgroundColor: C.surface, borderColor: C.border }]}> 
        <View style={[styles.circleBg, { borderColor: C.textMain }]}> 
          <Svg viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
            {ticks.map((tick) => (
              <Line
                key={tick.key}
                x1={`${tick.x1}%`}
                y1={`${tick.y1}%`}
                x2={`${tick.x2}%`}
                y2={`${tick.y2}%`}
                stroke={C.textMain}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}
            <Circle cx="50" cy="50" r="49" stroke="transparent" fill="none" />
          </Svg>

          <Animated.View style={[styles.circlePicker, { backgroundColor: C.textMain, transform: [{ rotate: spin }] }]}> 
            <View style={[styles.numberPicker, { backgroundColor: C.surface }]} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
