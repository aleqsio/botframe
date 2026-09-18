# Interfaces

AGENTS.md gives the rules for the code. This file gives the rules for a control on the screen. Each rule applies to each panel, bar, and menu.

## Selectors

A selector is a control that shows a set of options and holds one picked option. A segmented control, a row of glyph buttons, and a chip row are selectors.

1. A horizontal selector does not change its size when the picked option changes. The width of the selector and the width of each option come from CSS, not from the content of the picked option.
2. A control beside a selector, on the same row, stays on the screen for each option. If an option makes the control not applicable, disable the control and dim it. Do not remove it. Do not let the selector grow into its space.
3. A control below a selector is a nested control. It can change or go away when the picked option changes.
4. The text of each option fits its option at the width of the panel, in the light and in the dark color scheme. If the text does not fit, change the layout or the width of the panel. Do not remove an icon or a word that the design gives.

## Rows

5. A row of controls has one height. A field, a selector, and a button on one row are all 26 px tall.
6. A control that a state disables stays in its place, keeps its size, and shows a dimmed state. Its value stays visible.
7. A toggle stays in its place while it is on and while it is off, and shows a pressed state while it is on.

## Sections

8. A section starts with a heading in the group label style. A 1 px rule in the panel border color, with 8 px of space above and below, separates it from the section before it.
9. A sub-label under a heading has a lighter style than the heading. It does not use uppercase letters.

## Scale

10. Each distance, size, radius, and type size comes from the scale in `src/renderer/layout.css`. A value that is not on the scale is a `calc()` of scale values, or a 1 px line.
11. Colors come from the tokens in `src/renderer/style.css`. A new color is a `light-dark()` token.

## Proof

12. Prove a change to a panel on the application that runs, at the width of the panel, in both color schemes. Measure the text fit with a script. A screenshot is the record.
