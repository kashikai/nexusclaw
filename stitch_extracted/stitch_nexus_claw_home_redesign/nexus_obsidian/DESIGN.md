```markdown
# Design System Specification: High-End Gaming & Tech Editorial

## 1. Overview & Creative North Star: "The Neon Monolith"
This design system is built to evoke the precision of high-end gaming hardware and the immersive depth of futuristic interfaces. The Creative North Star is **"The Neon Monolith"**—a philosophy that treats every screen as a singular, solid object carved from obsidian, illuminated by internal light sources.

We break the "template" look by rejecting standard grid-and-line layouts. Instead, we use **Intentional Asymmetry** and **Tonal Depth**. Elements should feel like they are floating in a void or embedded within a high-tech chassis. We prioritize breathing room and "Editorial Momentum"—using massive typography scales to pull the user through the experience, rather than pushing them with cluttered UI.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep blacks (`#070707`) and layered dark tones, punctuated by high-energy neon accents.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface_container_low` section should sit directly against a `surface` background to define its shape.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material Design surface tiers to create "nested" depth:
*   **Base Layer:** `surface` (#131313)
*   **Lowered Content:** `surface_container_low` (#1c1b1b) for background sections.
*   **Elevated Elements:** `surface_container_high` (#2a2a2a) or `highest` (#353534) for interactive cards.

### The "Glass & Gradient" Rule
To achieve a premium, custom feel, use **Glassmorphism** for floating overlays (e.g., Modals, Navigation Bars). Use semi-transparent surface colors with a `backdrop-blur` of 20px–40px. 
*   **Signature Textures:** Main CTAs should utilize a subtle linear gradient from `primary` (#abc7ff) to `primary_container` (#448fff) at a 135-degree angle to provide visual "soul."

---

## 3. Typography: Futuristic Precision
The typography system balances the aggressive, wide stance of **Space Grotesk** with the high-legibility "Inter-style" utility of **System-UI**.

*   **Display & Headlines (Space Grotesk):** Used for brand moments and high-impact messaging. These should be set with tight letter-spacing (-0.02em to -0.04em) to feel like a singular graphic unit.
*   **Body & Titles (Inter/System-UI):** Clean, neutral, and functional. 
*   **Labels & Technical Data (SF Mono):** Use for metadata, timestamps, or "tech-spec" callouts to lean into the gamer/hardware aesthetic.

**Hierarchy Intent:** Large `display-lg` headings create a "brutalist" anchor for the page, while `body-md` provides a sophisticated, readable contrast.

---

## 4. Elevation & Depth: Tonal Layering
We do not use structural lines. Hierarchy is achieved through the **Layering Principle**.

*   **Ambient Shadows:** When a floating effect is required (e.g., a primary card), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow should feel like a soft glow rather than a harsh drop-shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be a "Ghost Border": use `outline_variant` (#414754) at **15% opacity**. Never use 100% opaque borders.
*   **Depth through Blur:** Use `surface_tint` (#abc7ff) at 5% opacity on top of dark surfaces to create a "micro-glow" that simulates light hitting a premium matte surface.

---

## 5. Signature Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). `rounded-sm` (0.125rem) for a sharp, technical look. No border.
*   **Secondary:** Ghost style. Transparent background with a 1px `outline` (#8b919f) at 30% opacity. On hover, increase opacity to 100%.
*   **Tertiary:** All caps `label-md` using `secondary` (#4ddbc9) color with a subtle bottom-glow (2px height) on hover.

### Cards & Lists
*   **Rule:** Forbid divider lines. Use `spacing-8` (2rem) of vertical white space or a subtle shift to `surface_container_low` to separate items.
*   **Interaction:** On hover, a card should transition from `surface_container` to `surface_container_highest` with a `0.3s cubic-bezier(0.4, 0, 0.2, 1)` timing.

### Input Fields
*   **Base State:** `surface_container_lowest`. A simple bottom-bar using `outline_variant`.
*   **Focus State:** The bottom-bar transitions to `primary` (#abc7ff) with a soft outer glow (`box-shadow: 0 4px 12px rgba(171, 199, 255, 0.2)`).

### Additional "Gamer-Tech" Components
*   **Status Beacons:** Small circular indicators using `secondary` (Online/Healthy) or `tertiary` (Warning/Critical) with a CSS "pulse" animation to simulate live telemetry.
*   **Data Strips:** Thin horizontal containers using `SF Mono` for technical stats, utilizing `surface_container_high` backgrounds.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. Push a headline to the far left and the body text to a narrower column on the right.
*   **Do** use `primary_fixed_dim` for secondary text on dark backgrounds to maintain high-end contrast without pure-white harshness.
*   **Do** apply `backdrop-blur` to any element that overlaps another.

### Don't
*   **Don't** use `rounded-full` (pills) for buttons. Stick to `sm` (2px) or `md` (6px) to maintain a sleek, hardware-inspired edge.
*   **Don't** use pure white (#FFFFFF). Use `on_surface` (#e5e2e1) for a more sophisticated, slightly "receded" feel.
*   **Don't** use standard 12-column grids religiously. Let elements bleed off the edge or stagger them to create visual interest.

### Accessibility Note
Maintain a minimum contrast ratio of 4.5:1 for all functional text. While the theme is "dark," ensure the `on_surface_variant` is used sparingly and never for critical instructions.```