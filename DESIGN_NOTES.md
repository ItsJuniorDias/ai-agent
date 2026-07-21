# Design system — "Daylight Iris"

The product has a **fixed light appearance**, independent of the system setting.
Its cool-white canvas keeps the focused, Apple-inspired restraint of the original
identity, while iris and the aurora gradient remain the agent signature.

## Surfaces
- canvas #F7F8FC — application and splash background
- raised / surface #FFFFFF — scroll areas, cards and grouped rows
- surface2 #F0F2F8 — inputs, chips and secondary actions
- surface3 #E5E8F2 — pressed and selected neutral states
- separators use translucent cool indigo, never opaque black

## Type and colour
- label #171A2C; secondary #5D647A; tertiary #7F879C
- accent #5364E8; pressed #4654CB; soft accent at 12% opacity
- aurora #5364E8 → #8757E8 → #149EAF
- semantic colours are contrast-safe for light surfaces: success #16803B,
  danger #C9342C and warning #B85B00

## Glass
`BlurView` uses `tint="light"`, a white/cool-white fill and a subtle indigo
border. The accessible opaque fallback is white. Shadows are low-opacity slate,
keeping elevation visible without dirtying the canvas.

## Implementation rule
Use `Color`, `Palette`, `Glass`, `Shadow`, `Spacing` and `Type` from
`constants/theme.ts`. Do not introduce dark-mode conditionals or hardcoded UI
colours; the light token set is the single source of truth.
