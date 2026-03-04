import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  // 1. Valores Iniciais
  // Começamos o slideAnim com o valor da largura da tela (fora da visão, à direita)
  const slideAnim = useRef(new Animated.Value(width)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2. Sequência de Animações
    Animated.sequence([
      // Primeira parte: Desliza da direita para o centro + Fade In
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0, // 0 é a posição original (centro)
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Segunda parte: Dá o Zoom (escala)
      Animated.spring(scaleAnim, {
        toValue: 1.5, // Aumenta 50% do tamanho
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Redirecionamento após o total das animações (aprox 2.5s a 3s)
    const timer = setTimeout(() => {
      router.replace("/(onboarding)");
    }, 3500);

    return () => clearTimeout(timer);
  }, [slideAnim, scaleAnim, fadeAnim, router]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/images/icon.png")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim }, // Movimento lateral
              { scale: scaleAnim }, // Zoom
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    resizeMode: "contain",
  },
});
