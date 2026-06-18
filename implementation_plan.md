# Global UI & Aesthetics Overhaul

This plan outlines a massive design upgrade across the entire PadX application to make it feel premium, responsive, and state-of-the-art.

## Open Questions
> [!IMPORTANT]
> The current theme uses a very basic Black/White minimal design. For this overhaul, would you prefer a **Dark-Mode First (Midnight & Neon)** vibe, or a **Soft Glassmorphism (Frosted Glass & Gradients)** vibe? This plan assumes a hybrid of dark mode with frosted glass cards.

## Proposed Changes

### 1. Typography & Global Styles
- **Font**: Implement a premium sans-serif font like `Inter` across the entire app for a cleaner, modern look.
- **Micro-animations**: Add smooth transition durations (`duration-300`, `ease-out`) to all interactive elements (buttons, inputs, links) to make the app feel alive.
- **Glassmorphism Base**: Introduce standard utility classes for frosted glass effects (`backdrop-blur-xl bg-black/40 border border-white/10`) to use on cards, modals, and headers.

### 2. Password Prompts & Modals
#### [MODIFY] `app/locked/[slug]/page.tsx` (Lock Screen)
- Completely redesign the lock screen. Instead of a basic white/gray card, we will use a stunning glassmorphic card over a subtle moving gradient background.
- Add an animated pulsing glow effect around the lock icon.
- Make the password input field sleek with floating labels or a soft inner shadow, expanding slightly when focused.

#### [MODIFY] `components/ui/PromptModal.tsx` & `components/ui/ShareModal.tsx`
- Replace rigid solid-color modal backgrounds with deep blurred overlays.
- Round the corners to `rounded-3xl` and add smooth entrance animations (`animate-in zoom-in-95`).
- Redesign the Action buttons to use rich gradients (e.g., a vibrant "Confirm" button) instead of basic colors.

### 3. The Admin Panel
#### [MODIFY] `app/admin/page.tsx`
- Transform the basic Admin view into a true **Command Center Dashboard**.
- **Stat Cards**: Add subtle gradient backgrounds to the Stat Cards (e.g., `bg-gradient-to-br from-blue-500/10 to-purple-500/10`) with glowing icons.
- **Data Tables/Lists**: Redesign the pad lists into clean, separated rows with hover elevation (`hover:-translate-y-1 hover:shadow-lg`).
- Add a sticky, glassmorphic navigation bar specifically for the Admin dashboard.

## Verification Plan
- Deploy the styling changes locally and provide screenshots/descriptions.
- Ensure the app remains responsive on mobile devices despite the heavier glassmorphic rendering.
