# Scrapifie UI Standards & Design System

## 1. Design Philosophy
**Theme:** "Futuristic Black & Silver" (Inspired by Resend, Cyberpunk, and High-End SaaS)
**Core Concept:** A "Dark Mode First" aesthetic that prioritizes depth, contrast, and premium visual fidelity over flat colors. The interface mimics polished metal (chrome/silver) and glass against a pitch-black void.

### Key Principles:
*   **Pitch Black Canvas:** The background is always pure black (`#000000` / `bg-black`), never dark gray. This maximizes contrast for lighting effects.
*   **Silver & Chrome Accents:** Text, borders, and icons use varying shades of silver and white to mimic metallic reflection.
*   **Glassmorphism:** Layers are defined by `backdrop-blur`, varying opacity of white/black backgrounds, and subtle white borders (`border-white/10`).
*   **Depth & Light:** Use "glows" (gradients with blur), shadows, and 3D perspective to create a sense of space.
*   **No Emojis:** All iconography must use **Lucide React** SVG icons.
*   **No Colored Status Blocks:** Avoid large blocks of green/red/yellow. Use thin borders, glowing dots, or subtle tinted backgrounds (e.g., `bg-green-500/10`) instead.

---

## 2. Color Palette (Tailwind v4 and not V3)

### Backgrounds
*   **Main Canvas:** `bg-black` (Pure #000000)
*   **Card / Layer 1:** `bg-white/5` (5% White opacity)
*   **Card / Layer 2:** `bg-black/40` (Semi-transparent black overlay)
*   **Dropdowns/Modals:** `bg-black/90` with `backdrop-blur-xl`

### Text & Typography
*   **Headlines (High Impact):** `text-white`
*   **Headlines (Chrome Effect):** `text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-200 to-silver-500`
*   **Body Text:** `text-silver-400` (#A1A1AA)
*   **Muted Text:** `text-silver-500` (#71717A)
*   **Links/Accents:** `text-white` with `hover:text-silver-200` or `underline`

### Borders & Dividers
*   **Subtle:** `border-white/5`
*   **Standard:** `border-white/10`
*   **Highlight/Hover:** `border-white/20` or `border-silver-400/30`

### Status Colors (Accents)
*   **Success:** `text-green-400`, `bg-green-500` (for dots/glows)
*   **Error:** `text-red-400`, `bg-red-500`
*   **Warning:** `text-yellow-400`, `bg-yellow-500`
*   **Info:** `text-blue-400`, `bg-blue-500`

---

## 3. Component Guidelines

### Buttons
**Primary (CTA):**
*   Background: `bg-white`
*   Text: `text-black`
*   Font Weight: `font-bold`
*   Shape: `rounded-full` or `rounded-xl`
*   Effect: `hover:bg-silver-200`, `hover:scale-105`, `shadow-[0_0_20px_rgba(255,255,255,0.3)]`

**Secondary:**
*   Background: `bg-white/5` or `bg-transparent`
*   Border: `border border-white/10`
*   Text: `text-white`
*   Effect: `hover:bg-white/10`, `backdrop-blur-md`

### Cards & Panels
*   **Structure:** `rounded-2xl` or `rounded-3xl`
*   **Base Style:** `bg-white/5 border border-white/10 backdrop-blur-md`
*   **Hover Effect:** `hover:border-white/20 transition-all duration-300`
*   **Glass Hierarchy:** Use darker glass (`bg-black/50`) for content that needs to recede, and lighter glass (`bg-white/10`) for floating elements.

### Inputs & Forms
*   **Background:** `bg-white/5` or `bg-black/50`
*   **Border:** `border-white/10`
*   **Text:** `text-white`
*   **Placeholder:** `placeholder:text-silver-600`
*   **Focus State:** `focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20`
*   **Shape:** `rounded-xl`

### Navigation (Navbar)
*   **State:** Sticky (`fixed top-0`)
*   **Style:** `bg-black/80 backdrop-blur-xl border-b border-white/10`
*   **Logo:** White text, potentially with a glowing icon.

---

## 4. Special Effects & Utilities

### Glows
Use absolute positioned `div` elements with high blur for background ambience.
```tsx
<div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />
```

### 3D Perspective (Hero)
For hero images or feature showcases, use CSS 3D transforms.
*   **Container:** `perspective-1000`
*   **Element:** `transform-style-3d rotate-x-12` (add `hover:rotate-x-0` for interactivity)

### Text Gradients (Chrome)
```tsx
<span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-200 to-silver-500">
  Chrome Text
</span>
```

### Sticky Headers (Tables)
For comparison tables, ensure headers stick to the top for usability.
```tsx
<thead className="sticky top-[80px] z-40 bg-black/95 backdrop-blur-xl shadow-lg border-b border-white/10">
```

---

## 5. Typography
*   **Font Family:** System sans-serif (`Inter`, `SF Pro Display`, etc.)
*   **Headings:** Tight tracking (`tracking-tight` or `tracking-tighter`) for a modern, impactful look.
*   **Monospace:** Use `font-mono` for code snippets, API keys, and technical data.

## 6. Icons
*   **Library:** Lucide React (`lucide-react`)
*   **Style:** Stroke width 1.5px or 2px.
*   **Color:** `text-white` or `text-silver-400`
*   **Container:** Often placed inside a glassmorphic square (`w-10 h-10 rounded-xl bg-white/10`).

---

## 7. Anti-Patterns (STRICTLY PROHIBITED)

The following elements compromise the premium "Black & Silver" aesthetic and are **strictly forbidden**:

### ❌ Visual Elements
*   **Emojis:** Never use emojis (🚀, ✨, etc.) in UI text, headers, or buttons. Use **Lucide React** icons only with no bg colour.
*   **Colored SVGs:** Icons must be monochrome (white, silver, or specific status colors like green/red for errors). No multi-colored illustrations.
*   **Material Design Blue:** Avoid generic `bg-blue-600` or purple together with their gradients unless told so. Use white/black contrast or silver accents.
*   **Gray Backgrounds:** Never use `bg-gray-50`, `bg-gray-100`, or `bg-gray-900`. Use `bg-black` or transparent layers.
*   **Drop Shadows without Glow:** Standard shadows are invisible on black. Use colored shadows (glows) or borders.
*   **Badges with Solid Colors:** Avoid badges of all types. No badges should be spotted in the UI.

### ❌ Component Patterns
*   **Stats Cards:** Do not use "dashboard style" cards with a single number and label (e.g., "Total Users: 500").
*   **Horizontal Cards:** Avoid generic horizontal card layouts. Use vertical lists, tables, or grid layouts.
*   **Quick Action Mini-Sections:** Do not create small "Quick Actions" grids with a few cards. Integrate actions contextually.
*   **Hardcoded Analytics:** Never include fake or hardcoded charts/graphs in the UI. If real data isn't available, don't show a placeholder.

### ❌ Typography
*   **Em Dashes:** Avoid em dashes (—) for separation. Use normal spacing.

---

## 8. Layouts & Structure (AI Guide)

**Goal:** Avoid the "generic SaaS" or "vibecoded" look. Every view must feel intentional, cinematic, and high-end.

### ✅ Preferred Layouts
*   **Split Screen (Auth/Forms):** Use 50/50 splits. One side for the functional form (minimal), the other for high-impact visuals (abstract 3D, testimonials, or code snippets).
*   **Bento Grids (Features/Dashboard):** Use irregular grid spans (`col-span-2`, `row-span-2`) to create visual interest. Avoid uniform rows of identical cards.
*   **Sticky Scrolling (Landing/Docs):** Keep key navigation or context (like table headers or doc sidebars) sticky (`sticky top-0`) to maintain utility while scrolling.
*   ** layered Depth:** Place content over subtle, large-scale background glows or "orbs" to create depth without clutter.

### ❌ Layout Anti-Patterns
*   **"Card Walls":** Do not simply dump content into a grid of identical `div`s.
*   **Centered "Form in Void":** Avoid lonely forms in the middle of a blank page. Anchoring them to a side or visual element feels more premium.
*   **Full-Width Walls of Text:** Constrain readability with `max-w-prose` or `max-w-4xl`.

---

## 9. Animation & Interaction

*   **Subtle Entry:** Use `animate-in fade-in slide-in-from-bottom-4 duration-700` for hero elements.
*   **Micro-Interactions:** Buttons should scale slightly (`active:scale-95`) or glow brighter on hover.
*   **Glass Reflection:** Use `group-hover` to trigger subtle white gradients moving across glass cards.
*   **Sticky Elements:** Ensure sticky headers have a `backdrop-blur-xl` and a subtle bottom border that only appears when scrolled (if possible via JS, or always-on for simplicity).

---

## 10. AI Model Instructions (Prompt Guide)

**When generating code for this project, STRICTLY follow these rules:**

1.  **Tailwind Version:** Use **v4.1 syntax** (e.g., `@theme`, standard CSS variables). Do NOT use `tailwind.config.js` theme extensions.
2.  **Color Mode:** Build for **Dark Mode First** (`bg-black`, `text-white`). Light mode support is secondary but should map correctly if used (e.g., using CSS variables).
    *   **Blacks:** Must be **Pitch Black** (`#000000`), not Dark Gray (`#1a1a1a`).
3.  **Premium Feel:**
    *   **NO** Generic Horizontal Cards.
    *   **NO** Emojis (🚀, 🔥) in UI. Use Lucide Icons.
    *   **NO** Coloured SVGs (unless strictly status indicators).
    *   **NO** "Vibecoded" (cookie-cutter, low-effort) aesthetic.
4.  **Components:**
    *   **Modals:** Must be "Modern" (backdrop blur, subtle border, snappy animation).
    *   **Flash Notices:** Must use semantic colors (Green for Success, Red for Error) but styled with glassmorphism (e.g., `bg-red-500/10 border-red-500/20 text-red-500`).
    *   **Emails:** Must be nicely styled HTML emails matching the brand (Black/Silver), not plain text.
5.  **Layouts:** Prioritize "Great Layouts" with images in views, split panels, and sticky scrolling elements.

---

## 11. Tailwind v4 CSS Architecture (CRITICAL)

This project uses **Tailwind CSS v4** with the `@tailwindcss/vite` plugin. All configuration lives in `src/frontend/styles/globals.css` -- there is NO `tailwind.config.js` file.

### File: `globals.css` Structure

The CSS file MUST contain these blocks in order. **Removing or rewriting any of them will break the entire application.**

#### 1. Dark Mode Variant (MANDATORY)
```css
@custom-variant dark (&:where(.dark, .dark *));
```
- `ThemeContext.tsx` toggles dark mode by adding/removing `.dark` on `<html>`.
- Without this line, Tailwind v4 defaults to `@media (prefers-color-scheme: dark)`, meaning **all 429+ `dark:` classes in the codebase only respond to the OS setting**, and the in-app theme toggle does nothing.

#### 2. `@theme` Block (MANDATORY)
```css
@theme {
  --color-silver-50: #fafafa;
  /* ... silver-100 through silver-900 ... */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  /* ... all semantic tokens ... */
}
```
- The `silver` palette is used in **100+ class references** (`text-silver-400`, `bg-silver-200`, etc.) across 16+ component files. If removed, those classes produce zero CSS output and text becomes invisible.
- Semantic tokens (`--color-background`, `--color-primary`, `--color-primary-foreground`, etc.) are referenced by 9+ component files using classes like `bg-background`, `text-primary-foreground`. If removed, those components lose all styling.

#### 3. `.dark` Override Block (MANDATORY)
```css
.dark {
  --color-background: hsl(222.2 84% 4.9%);
  /* ... dark overrides for all semantic tokens ... */
}
```
- Swaps light semantic tokens for dark values when `.dark` class is present on `<html>`.

#### 4. `@layer base` (MANDATORY)
```css
@layer base {
  * { border-color: var(--color-border); }
  body { background-color: var(--color-background); color: var(--color-foreground); }
}
```
- MUST be inside `@layer base` to work WITH Tailwind's preflight, not AGAINST it.
- **NEVER** write raw `* { margin: 0; padding: 0; box-sizing: border-box; }` outside a layer -- Tailwind's preflight already does this, and duplicating it outside the layer creates specificity conflicts.

### Anti-Patterns (DO NOT DO)

| DO NOT | REASON |
|--------|--------|
| Delete `@custom-variant dark` | Breaks theme toggle for 429+ classes |
| Delete `@theme` block | Breaks `silver-*` palette (100+ usages) and semantic token classes (9+ files) |
| Write `body { background: #000000; }` outside `@layer base` | Overrides Tailwind's own base and prevents theme switching |
| Write `* { margin: 0; }` outside `@layer` | Fights with Tailwind's preflight, causing specificity issues |
| Create a `tailwind.config.js` | TW v4 uses CSS-based config; a JS config will be ignored |
| Use `bg-gray-50`, `bg-gray-100`, or `bg-gray-900` on public pages | UI standard requires pitch black (`#000000`) canvas |

---

## 12. Landing Page Color Rules

### Background Hierarchy
- **PublicLayout wrapper**: Uses `bg-background text-foreground` (semantic tokens) so the theme toggle works
- **Dark mode base canvas**: `--color-background` resolves to `#000000` (pure black) -- NOT navy, NOT dark gray
- **Hero section only (dark mode)**: Navy-blue gradient via `dark:from-[#0a1628] dark:via-[#060e1a] dark:to-black`
- **Hero section (light mode)**: Light gradient via `from-gray-100 via-white to-white`
- **All other sections**: Inherit from `bg-background` (white in light, `#000000` in dark)

### Theme Toggle Must Always Work
- **NEVER** hardcode `bg-black text-white` on layout wrappers -- this kills the theme toggle
- **ALWAYS** use `dark:` variants for dark-mode-specific styles
- Public pages, dashboard, admin -- ALL must respect the `.dark` class toggle on `<html>`


