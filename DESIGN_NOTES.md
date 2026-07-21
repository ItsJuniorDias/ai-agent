# Design system — "Midnight Iris"

Base primary color: **#020625** (deep indigo, rgb 2,6,37). Anchors the whole app
as the canvas. Apple-grade dark aesthetic: layered navy surfaces, hairline
translucent separators, SF type, restrained chrome — with one signature: the
**agent aurora** (iris→violet→cyan) that reads as "the agent is thinking/acting",
carried by a real **liquid-glass composer** at the bottom.

## Surfaces (elevation ramp off #020625)
- canvas      #020625   base background / splash
- raised      #060B2E   scroll backgrounds
- surface     #0C1340   cards, grouped rows
- surface2    #131C52   inputs, elevated cards, chips
- surface3    #1B2666   pressed / active fills
- hairline    rgba(255,255,255,0.09)
- hairline2   rgba(255,255,255,0.14)

## Text
- label       #F4F5FF
- secondary   rgba(244,245,255,0.62)
- tertiary    rgba(244,245,255,0.40)
- quaternary  rgba(244,245,255,0.24)
- placeholder #6A6F9C (opaque, for TextInput)

## Accent — iris
- accent        #6E7BFF
- accentPressed #5A67F0
- accentSoft    rgba(110,123,255,0.16)
- aurora        #6E7BFF → #A06BFF → #37D0DE

## Semantic (dark-tuned)
- success #30D158 / danger #FF453A / warning #FF9F0A (+ *Soft rgba 0.16)

## Glass (liquid-glass bottom section)
BlurView tint="dark" + gradient fill rgba(12,19,64,.55)→rgba(27,38,102,.66),
1px top specular highlight rgba(255,255,255,.28), hairline border
rgba(255,255,255,.14), soft black shadow. Falls back to opaque surface2 when
Reduce Transparency is on.

## Signature
Aurora gradient send button + glass composer; faint aurora glow behind the
empty-state icon and the live agent trace. Boldness spent there; everything
else stays quiet Apple-dark.
