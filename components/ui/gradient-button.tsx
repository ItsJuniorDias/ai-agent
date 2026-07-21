/**
 * Primary action button — the aurora CTA.
 *
 * An iris gradient fill with a soft glow, plus a top specular line so it reads as
 * the same material family as the glass. Disabled state drops to a flat, quiet
 * surface. This is the only "loud" control; everything else stays restrained.
 */

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Color, Radius, Shadow, Type, alpha, Palette } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Renders left of the label. */
  icon?: React.ReactNode;
  height?: number;
  style?: ViewStyle | ViewStyle[];
};

export function GradientButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  height = 52,
  style,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { height, borderRadius: Radius.lg },
        !inactive && Shadow.glow,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {inactive ? (
        <View style={[styles.fill, styles.disabled, { borderRadius: Radius.lg }]}>
          {loading ? (
            <ActivityIndicator color={Color.secondary} />
          ) : (
            <Text style={[styles.label, { color: Color.tertiary }]}>{label}</Text>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={Color.auroraButton as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: Radius.lg }]}
        >
          <View
            style={[styles.topLine, { borderRadius: Radius.lg }]}
            pointerEvents="none"
          />
          <View style={styles.content}>
            {icon}
            <Text style={styles.label}>{label}</Text>
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "visible" },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  disabled: { backgroundColor: Color.surface2 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: alpha(Palette.white, 0.35),
  },
  label: { ...Type.headline, color: Color.onAccent },
});
