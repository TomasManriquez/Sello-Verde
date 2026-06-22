# Project Agents & Guidelines - Sello Verde

This document defines the operational standards, technical stack, and design philosophy for all agents working on the Sello Verde project.

## 🛠 Technical Stack
All implementations MUST adhere to this architecture:
- **Frontend:** Next.js (React)
- **Backend:** NestJS
- **Database:** PostgreSQL
- **Deployment:** Fully Dockerized (docker-compose)
- **Data:** Must include mockup data for development and testing.

## 📚 Context & Design Sources
Before any implementation, agents MUST read and validate logic against:
1. `flujo_software.md`: Business logic and user flow (SLEP controller role).
2. `requistos_proyecto.md`: SEC technical fields and regulatory requirements.
3. `contexto_proyecto.md`: MVP vision and overall project objectives.

---

## 🎨 Skill: website-building — Frontend Design
Agents must create production-quality, distinctive interfaces. Avoid generic AI aesthetics.

### Design Thinking
Before coding, choose a **BOLD** aesthetic direction:
- **Tones:** Brutally minimal, industrial/utilitarian, luxurious/refined, etc.
- **Differentiation:** Focus on what makes the UI unforgettable. Intentionality over intensity.

### Aesthetic Guidelines
- **Typography:**
    - Avoid: Arial, Inter, Roboto, system fonts.
    - Prefer: Fontshare (Satoshi, General Sans, Boska, Zodiak, Cabinet Grotesk).
    - Pair a distinctive display font ($\ge 24px$) with a refined body font ($\ge 12px$).
- **Color & Theme:**
    - Cohesive aesthetics using CSS variables.
    - **Nexus Palette (Default):** Warm beige surfaces + Teal accent (`--color-primary: #01696f`).
    - Mandatory Light/Dark mode (prefers-color-scheme + manual toggle).
- **Motion:**
    - Orchestrated page loads (staggered reveals).
    - Interaction-based hover states and scroll-triggering.
- **Spatial Composition:**
    - Use unexpected layouts (asymmetry, overlap, diagonal flow).
    - Generous negative space vs controlled density.
- **Visual Details:**
    - Gradient meshes, noise textures, grain overlays.
    - Dramatic shadows and custom cursurs in focal areas (Hero/CTA).

### Design Tokens
```css
:root {
  --text-xs:   clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem);
  --text-sm:   clamp(0.875rem, 0.8rem  + 0.35vw, 1rem);
  --text-base: clamp(1rem,     0.95rem + 0.25vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem    + 0.75vw, 1.5rem);
  --text-xl:   clamp(1.5rem,   1.2rem  + 1.25vw, 2.25rem);
  --text-2xl:  clamp(2rem,     1.2rem  + 2.5vw,  3.5rem);
  --text-3xl:  clamp(2.5rem,   1rem    + 4vw,    5rem);
  --text-hero: clamp(3rem,     0.5rem  + 7vw,    8rem);

  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
  --space-4: 1rem;    --space-6: 1.5rem; --space-8: 2rem;
  --space-12: 3rem;   --space-16: 4rem;  --space-24: 6rem;

  --color-bg: #f7f6f2;
  --color-surface: #f9f8f5;
  --color-text: #28251d;
  --color-text-muted: #7a7974;
  --color-primary: #01696f;
  --color-primary-hover: #0c4e54;
  --radius-sm: 0.375rem; --radius-md: 0.5rem;
  --radius-lg: 0.75rem;  --radius-xl: 1rem;
  --transition-interactive: 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Anti-Patterns (NEVER DO)
- **Generic AI Style:** Purple/Indigo gradients, neon orbs, abstract background blobs.
- **Generic Layouts:** Symmetric 3-column grids (icon + title + text), everything center-aligned.
- **Generic Copy:** "Unlock the power of...", "Your all-in-one solution...".
- **Technical Errors:** Solid grey borders (use oklch alpha-blended), pure black shadows on warm surfaces.

### Quality Checklist
- [ ] Distinctive fonts loaded.
- [ ] Light/Dark mode toggle.
- [ ] WCAG AA Contrast.
- [ ] Responsive from 375px.
- [ ] Touch targets $\ge 44\times44px$.
- [ ] Only 1 primary action per screen.
