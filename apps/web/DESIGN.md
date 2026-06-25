---
name: Neutrino Web
description: Restrained product UI for picoAI's composable AI service platform.
colors:
  background: "oklch(0.982 0.002 247.858)"
  foreground: "oklch(0.208 0.028 247.858)"
  muted: "oklch(0.962 0.004 247.858)"
  muted-foreground: "oklch(0.504 0.018 248.235)"
  panel: "oklch(0.993 0.002 255.56 / 0.92)"
  sidebar: "oklch(0.968 0.003 247.858 / 0.92)"
  sidebar-foreground: "oklch(0.23 0.022 247.858)"
  composer: "oklch(0.996 0.002 255.56 / 0.96)"
  border: "oklch(0.902 0.008 248.29)"
  border-strong: "oklch(0.855 0.01 248.29)"
  input: "oklch(0.902 0.008 248.29)"
  ring: "oklch(0.58 0.1 249.55)"
  accent: "oklch(0.56 0.1 243.2)"
  accent-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.948 0.005 250.1)"
  secondary-foreground: "oklch(0.255 0.02 248)"
  destructive: "oklch(0.61 0.22 27.5)"
typography:
  headline:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.22em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.5rem"
  xl: "2rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.25rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.25rem"
    height: "2.75rem"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
---

# Design System: Neutrino Web

## 1. Overview

**Creative North Star: "The Quiet Control Room"**

Neutrino Web is a restrained product interface for developers operating a composable AI platform. It should feel precise, calm, and intuitive: a surface where platform state is legible, runtime actions are controlled, and every visible affordance earns its place.

The system is cool-toned, low-chroma, and task-first. It uses familiar product UI primitives, pill controls, light panels, tonal borders, and soft blur only where structure or focus requires it. It rejects the visual weight of enterprise admin suites and the generic rhythm of SaaS dashboards.

**Key Characteristics:**
- Cool near-white surfaces with one measured blue accent.
- Geist-led typography with compact hierarchy and readable body rhythm.
- Pill controls and gently rounded panels, used consistently.
- Tonal layering before shadow; elevation is rare and structural.
- Direct, operational copy that names platform state and user action.

## 2. Colors

The palette is a restrained cool-neutral system with a single blue accent reserved for primary action, focus, and important platform state.

### Primary
- **Measured Runtime Blue** (`accent`): Use for primary actions, selected states, focus-adjacent emphasis, and icons that need to identify the active execution path.
- **White on Runtime Blue** (`accent-foreground`): Use only on top of the primary accent.

### Neutral
- **Cool Console Field** (`background`): The default page and content field. It should stay quiet enough for dense platform data.
- **Primary Ink** (`foreground`): Main text, headings, labels, and high-confidence state.
- **Soft Muted Plane** (`muted`): Secondary filled surfaces, inactive states, and quiet structural grouping.
- **Muted Ink** (`muted-foreground`): Secondary copy, hints, descriptions, and metadata. Verify contrast whenever it sits on tinted or translucent surfaces.
- **Translucent Panel** (`panel`): Sheet and raised panel material. Use sparingly where a layer must sit over the main field.
- **Sidebar Wash** (`sidebar`): Navigation and persistent control surfaces.
- **Sidebar Ink** (`sidebar-foreground`): Text on sidebar surfaces.
- **Composer Surface** (`composer`): Chat composer and high-touch input surfaces.
- **Tonal Border** (`border`): Default divider and control stroke.
- **Strong Tonal Border** (`border-strong`): Composer shells, high-touch fields, and boundaries that must survive blur or translucency.
- **Input Stroke** (`input`): Field borders.
- **Focus Ring Blue** (`ring`): Keyboard focus and ring treatment.
- **Secondary Plane** (`secondary`): Secondary button fill, assistant message fill, and hover backgrounds.
- **Secondary Ink** (`secondary-foreground`): Text on secondary planes.
- **Destructive Red** (`destructive`): Errors and destructive state. Do not use it as decoration.

### Named Rules

**The One Accent Rule.** Runtime blue is the only saturated product color. Do not introduce extra brand accents unless the shared design-system tokens add them first.

**The Contrast Before Subtlety Rule.** Muted text is allowed only when it remains readable. Body copy and placeholders must meet WCAG AA.

## 3. Typography

**Display Font:** Geist, with Inter and system-ui fallback  
**Body Font:** Geist, with Inter and system-ui fallback  
**Label/Mono Font:** System monospace appears only for code, IDs, JSON, and raw manifests.

**Character:** The type system is a compact product sans hierarchy. It should read as technical and steady, not editorial, playful, or branded for its own sake.

### Hierarchy
- **Headline** (400, `1.5rem`, 1.2): Login and focused page titles. Keep headlines plain and short.
- **Title** (600, `1rem`, 1.25): Panel titles, navigation section names, and primary object labels.
- **Body** (400, `0.875rem`, 1.6): Descriptions, metadata, form help, and record summaries. Cap prose at 65-75ch when it becomes explanatory copy.
- **Dense Body** (400, `0.8125rem` to `0.875rem`, 1.4-1.6): Tables, rows, compact inventory, and repeated platform records.
- **Label** (500, `0.75rem`, tracked uppercase only when grouping): Sidebar section labels and compact metadata group names.
- **Code** (400, `0.75rem`, monospace): IDs, JSON, manifest snippets, and raw escape hatches.

### Named Rules

**The Product Sans Rule.** Do not introduce display fonts, serif pairings, or decorative type for app surfaces. Product confidence comes from clarity and consistency.

**The Sparse Uppercase Rule.** Uppercase tracking is reserved for small section labels and should not become a page-wide eyebrow pattern.

## 4. Elevation

Neutrino uses tonal layering first and shadow second. Borders, subtle translucency, and surface contrast carry most structure. Shadows appear on overlays, composer shells, login cards, and rare raised containers where depth is operationally useful.

### Shadow Vocabulary
- **Hairline Surface** (`0 1px 0 rgba(15,23,42,0.03)`): Admin panels and list containers that need a tiny edge without looking lifted.
- **Composer Lift** (`0 1px 0 rgba(15,23,42,0.03)`): Composer shells should sit in the same low-elevation family as panels and cards, not as floating hero inputs.
- **Overlay Panel** (`0 24px 80px rgba(15,23,42,0.12)`): Mobile sheets and modal-like surfaces.
- **Auth Card Lift** (`0 20px 56px rgba(15,23,42,0.1)`): Login cards and focused authentication steps.

### Named Rules

**The Flat-Until-Needed Rule.** Default product surfaces are bordered and tonal, not floating. Add shadow only when the component moves above another layer or captures active input.

## 5. Components

### Buttons
- **Shape:** Full pill by default (`9999px` / `rounded-full`); compact admin overrides may use `0.5rem` to match dense nav.
- **Primary:** Runtime blue background with white text; `2.75rem` default height, `1.25rem` horizontal padding.
- **Hover / Focus:** Hover darkens or lowers opacity subtly. Focus uses a visible `2px` ring in `ring`.
- **Secondary / Ghost:** Secondary uses the secondary plane; ghost is transparent at rest and fills with secondary on hover.

### Chips
- **Style:** Full-pill badges with compact padding, small text, and semantic background choices.
- **State:** Use secondary for neutral metadata, outline for status/readiness, muted for low-emphasis labels, and accent only for primary state.

### Cards / Containers
- **Corner Style:** Admin workspace panels and composer shells use restrained rounded corners (`0.5rem`); chat bubbles may be larger (`1.5rem` to `1.75rem`) because they are message surfaces.
- **Background:** Prefer `background`, `panel`, `sidebar`, `composer`, `secondary`, and white alpha surfaces already present in the codebase.
- **Shadow Strategy:** Follow the Flat-Until-Needed Rule.
- **Border:** Use tonal borders. Do not use colored side stripes.
- **Internal Padding:** Use `1rem` to `1.5rem` for panels, `0.75rem` for dense rows, and `0.5rem` for compact controls.

### Inputs / Fields
- **Style:** Rounded or pill fields with `input` border and quiet background. Form controls should look familiar and stable.
- **Focus:** Use `ring` for focus-visible state. Do not remove keyboard focus indicators.
- **Error / Disabled:** Error copy uses `destructive`; disabled states lower opacity and prevent pointer interaction.

### Navigation
- **Style:** Product navigation is quiet and persistent. Sidebars use the sidebar surface, compact titles, lucide icons, and obvious active state.
- **Mobile:** Use sheet navigation with overlay and bounded width. Keep the sheet visually connected to the same sidebar vocabulary.

### Composer

The composer dock should feel close to OpenAI's composer: a quiet, full-width-by-parent writing surface with a textarea area above a compact action row. It uses the same panel/card radius (`0.5rem`), a tonal border, low vertical padding, and no artificial max width or fixed height in the component definition. Let the parent layout decide width, and let the textarea grow with content.

Use the landing email field as a material and send-control reference: white/translucent surface, no heavy chrome, and the same circular upward-arrow send button color behavior. Do not copy its hero-form padding, constrained width, or elevated 16px-radius shell into the composer dock. The disabled or empty send state uses the landing field gray (`#b6bbc3`); the active send state uses the landing field blue radial highlight.

### Frosted Header

The frosted header is allowed only as a structural overlay on landing, login, or narrow mobile admin surfaces. Its blur must remain subtle and should never become decorative glassmorphism.

## 6. Do's and Don'ts

### Do:
- **Do** use shared `@neutrino/ui` primitives and tokens before adding page-specific visual rules.
- **Do** keep platform state inspectable before action: show scope, actor, lifecycle state, run IDs, bindings, and provenance when they matter.
- **Do** reserve `accent` for primary action, current selection, focus, and meaningful runtime state.
- **Do** use tonal borders and low-chroma surfaces to support dense data without visual noise.
- **Do** test muted copy and placeholders for WCAG AA contrast.
- **Do** use lucide icons consistently inside buttons and navigation affordances.

### Don't:
- **Don't** make Neutrino look like Salesforce, Oracle, a generic SaaS dashboard, or Supabase.
- **Don't** introduce a second component library or page-specific spacing, color, typography, or radius system.
- **Don't** use decorative glassmorphism. Blur is structural only.
- **Don't** use colored side-stripe borders, gradient text, hero-metric layouts, or repeated identical icon-card grids.
- **Don't** add extra saturated accents unless the shared design system owns them.
- **Don't** replace standard product affordances with custom controls for flavor.
