/**
 * Tab bar.
 *
 * Duas correções em relação ao original:
 *
 *  1. `Settings` ganhou trigger. A tela existia em `(tabs)/settings.tsx` desde
 *     sempre, mas nenhuma rota apontava para ela — era inalcançável. Agora é
 *     onde se escolhe o modelo, o teto de passos, aprovação de tools e memória,
 *     então precisa estar no ar.
 *  2. Saiu o prop `md` dos ícones. Ele não existe no `Icon` do expo-router 6 —
 *     as combinações válidas são `sf` (iOS) com `drawable` ou `androidSrc`
 *     (Android). O `md="smart_toy"` era erro de tipo e nunca desenhou nada.
 *     `drawable` exigiria resources nativos no projeto Android; como o app é
 *     iOS-first, ficou só o `sf`.
 */

import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs tintColor="#007AFF">
      {/* Conversa com o agente — a tela principal. */}
      <NativeTabs.Trigger name="index">
        <Label>Ask AI</Label>
        <Icon sf="sparkles" />
      </NativeTabs.Trigger>

      {/* Conversas salvas. */}
      <NativeTabs.Trigger name="history">
        <Label>History</Label>
        <Icon sf="clock.fill" />
      </NativeTabs.Trigger>

      {/* Geração de imagem. */}
      <NativeTabs.Trigger name="generate-image">
        <Label>Studio</Label>
        <Icon sf="paintbrush.fill" />
      </NativeTabs.Trigger>

      {/* Análise de documentos. */}
      <NativeTabs.Trigger name="convert-pdf">
        <Label>Files</Label>
        <Icon sf="doc.text.magnifyingglass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
