# Design System Documentation: High-End Editorial Technical System

## 1. Overview & Creative North Star

### Creative North Star: "The Obsidian Architect"
This design system moves away from the "friendly SaaS" aesthetic toward a high-fidelity, technical editorial experience. It is inspired by the precision of a command-line interface merged with the luxury of high-end gaming hardware. The goal is to feel authoritative, futuristic, and deeply layered.

We break the standard "template" look through:
*   **Intentional Asymmetry:** Leveraging large `display-lg` typography that purposefully offsets the central grid.
*   **Sharp Geometry:** A strict 0px border-radius policy to convey precision and aggressive modernity.
*   **Atmospheric Depth:** Using "glow-logic" where light doesn't just sit on a surface but emanates from the structural bones of the UI.

---

## 2. Colors

The palette is rooted in ultra-deep voids, accented by high-energy electric pulses.

### Surface Hierarchy & Nesting
Traditional borders are replaced by tonal layering. 
*   **Background (`#131313`)**: The absolute base.
*   **Surface-Container-Lowest (`#0e0e0e`)**: Used for deep, recessed areas like code blocks or data logs.
*   **Surface-Container-High (`#2a2a2a`)**: Used for primary interactive cards.
*   **The "No-Line" Rule:** 1px solid borders for sectioning are strictly prohibited. Boundaries are defined by shifting from `surface` to `surface-container-low` or via subtle gradient transitions.

### Signature Accents & Textures
*   **Electric Accents:** `primary` (`#abc7ff`) and `secondary_container` (`#00eefc`) provide the "neon" energy. Use these for micro-interactions and critical data points.
*   **Glass & Gradient Rule:** To achieve a premium feel, floating panels must use a background-blur (20px+) paired with a semi-transparent `surface_container` color. 
*   **Linear Glows:** Main CTAs should transition from `primary` to `primary_container` via a 45-degree linear gradient, mimicking the iridescent shell of a futuristic lobster.

---

## 3. Typography

The system utilizes a dual-font strategy to balance editorial impact with technical legibility.

*   **Headers & Display (Space Grotesk):** This is our "Editorial" voice. Use `display-lg` and `headline-lg` with tight letter spacing (-2%) to create a dense, high-impact presence. It should feel like a premium tech magazine header.
*   **Technical Readouts (SF Mono / Inter):** While Space Grotesk handles the narrative, `label-md` and technical data should utilize mono-spaced or highly legible sans-serifs for a "high-fidelity terminal" vibe. 
*   **Hierarchy Note:** Always lead with high contrast. A `display-lg` header should sit near a `body-sm` descriptor to emphasize the "wide-angle" scale of the design.

---

## 4. Elevation & Depth

We eschew traditional "shadows" in favor of **Tonal Layering** and **Atmospheric Lighting**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-highest` panel sits on top of a `surface` background. This creates a soft, natural lift through color value rather than structural lines.
*   **The "Ghost Border" Fallback:** If visual separation is required in high-density areas, use a "Ghost Border": the `outline-variant` token at 15% opacity. It should feel like a faint light reflecting off a sharp edge.
*   **Ambient Glows:** Instead of drop shadows, use `primary` tinted glows. For a floating card, apply a large blur (40px+) shadow with only 5% opacity, using the `primary` color value to simulate a glowing core.
*   **Sharp Angles:** Every container is a perfect rectangle (`radius: 0px`). Precision is the priority.

---

## 5. Components

### Buttons
*   **Primary:** A hard-edged rectangle. Background: `primary_container` gradient. Text: `on_primary_fixed`. No border. On hover, add a `primary` outer glow.
*   **Secondary:** Ghost style. Transparent background with a `primary` "Ghost Border." On hover, the background fills to 10% opacity.

### Input Fields
*   **Styling:** Background uses `surface_container_lowest`. No bottom border—instead, use a 2px `primary` accent line that only appears on `:focus`. 
*   **Labels:** Use `label-sm` in `SF Mono` for a technical, data-entry feel.

### Cards & Lists
*   **Structure:** Forbid divider lines. Use `0.9rem` (`spacing.4`) of vertical white space to separate list items.
*   **Hover State:** A list item should shift from `surface` to `surface_container_low` on hover, creating a recessed "docking" effect.

### Selection Chips
*   **Visuals:** Sharp-edged boxes. `secondary_container` background with `on_secondary_container` text. When unselected, they should be `surface_container_highest` with no border.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme typographic scales. Make headers massive and labels tiny.
*   **Do** use Lobster-themed imagery as background textures—highly stylized, glowing vector art or deep-sea-inspired bioluminescent photography.
*   **Do** embrace the void. Leave significant "dead space" (`spacing.20` or `24`) to let the glowing elements breathe.

### Don't
*   **Don't** use rounded corners. Even a 2px radius breaks the technical "Obsidian" aesthetic.
*   **Don't** use standard grey shadows. Shadows should always be a low-opacity tint of the brand's blue or magenta.
*   **Don't** use 100% opaque borders. They flatten the UI and make it look like a legacy enterprise application.