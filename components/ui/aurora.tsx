/**
 * Aurora glow — the visual shorthand for "the agent is intelligent / working".
 *
 * Two overlapping soft gradient orbs in the iris→violet→cyan family. Used behind
 * the empty-state mark and the live execution trace so activity feels lit from
 * within rather than flat. Purely decorative; never wraps interactive content.
 */

import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Palette, alpha } from "@/constants/theme";

export function AuroraGlow({
  size = 220,
  style,
}: {
  size?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ width: size, height: size }, styles.wrap, style]}
    >
      <LinearGradient
        colors={[alpha(Palette.iris, 0.55), alpha(Palette.violet, 0.0)]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
      />
      <LinearGradient
        colors={[alpha(Palette.cyan, 0.4), alpha(Palette.iris, 0.0)]}
        start={{ x: 0.9, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={[
          styles.orb,
          {
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size,
            top: size * 0.16,
            left: size * 0.18,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  orb: { position: "absolute" },
});
