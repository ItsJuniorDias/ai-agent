/**
 * Liquid glass — the app's one signature material.
 *
 * A BlurView is only the starting point. Real "liquid glass" needs three layers
 * the system blur doesn't give you: a translucent color fill so text stays
 * legible over busy content, a bright specular edge along the top, and a hairline
 * border that catches light. We compose those on top of expo-blur and fall back
 * to an opaque surface when the user has Reduce Transparency on — a blur nobody
 * can see through is just a fuzzy, low-contrast panel.
 *
 * On Android the default blur is a no-op; `experimentalBlurMethod` turns on the
 * real thing.
 */

import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { Color, Glass, Radius } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
  /** Corner radius for the glass and its clip mask. */
  radius?: number;
  /** Overrides the blur strength (0–100). */
  intensity?: number;
  /** Draw the bright specular line along the top edge. */
  highlight?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function GlassSurface({
  children,
  radius = Radius.xxl,
  intensity = Glass.intensity,
  highlight = true,
  style,
}: Props) {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => {
      if (mounted) setReduceTransparency(!!v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (v) => setReduceTransparency(!!v),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const shape = { borderRadius: radius };

  // Accessible fallback: an opaque panel, same geometry and border.
  if (reduceTransparency) {
    return (
      <View
        style={[
          styles.container,
          shape,
          { backgroundColor: Glass.fillSolid, borderColor: Glass.border },
          style,
        ]}
      >
        {highlight && <TopHighlight radius={radius} />}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, shape, { borderColor: Glass.border }, style]}>
      <BlurView
        tint={Glass.tint}
        intensity={intensity}
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        style={[StyleSheet.absoluteFill, shape]}
      />
      {/* Color fill so foreground contrast holds over any background. */}
      <LinearGradient
        colors={Glass.fill as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, shape]}
      />
      {/* Faint downward sheen — the "wet" look. */}
      <LinearGradient
        colors={[Color.hairlineStrong, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={[StyleSheet.absoluteFill, shape, { opacity: 0.5 }]}
        pointerEvents="none"
      />
      {highlight && <TopHighlight radius={radius} />}
      {children}
    </View>
  );
}

/** Bright specular line across the top edge, fading at the corners. */
function TopHighlight({ radius }: { radius: number }) {
  return (
    <LinearGradient
      colors={["transparent", Glass.highlight, "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.topHighlight,
        { borderTopLeftRadius: radius, borderTopRightRadius: radius },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
});
