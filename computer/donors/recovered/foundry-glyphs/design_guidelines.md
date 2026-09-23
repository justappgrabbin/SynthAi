# Design Guidelines: Closed-Loop App Foundry

## Design Approach

**Selected System:** Material Design 3
**Rationale:** Developer productivity tool requiring clarity for complex, data-heavy interfaces. Material Design excels at presenting structured technical information with established patterns for tables, hierarchies, and state visualization.

**Core Principles:**
- Information clarity over decoration
- Scannable data hierarchies
- Predictable interaction patterns
- Technical precision in typography and spacing

---

## Typography

**Font Family:** 
- Primary: 'Roboto Mono' for code, glyphs, technical IDs
- Secondary: 'Inter' for UI text, labels, descriptions

**Type Scale:**
- Display (Glyph IDs, Headers): 32px / font-bold / tracking-tight
- Headline (Section Titles): 24px / font-semibold
- Body (Content): 14px / font-normal / leading-relaxed
- Caption (Metadata, Timestamps): 12px / font-normal / text-opacity-70
- Code Inline: 13px / Roboto Mono / font-medium

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 12
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Page margins: p-12 on desktop, p-4 on mobile
- Card spacing: p-6 interior, gap-4 between cards

**Grid System:**
- Main layout: Sidebar (280px fixed) + Content (flex-1)
- Content max-width: max-w-screen-2xl mx-auto
- Card grids: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4

---

## Component Library

### Navigation
**Sidebar (Fixed Left):**
- Width: 280px
- Sections: Dashboard, Registry, Fragments, Apps, Lineage, Audit, Settings
- Active state with left border indicator (4px)
- Icons: Material Icons for each nav item

**Top Bar:**
- Height: 64px
- Left: Breadcrumb navigation
- Right: Search, notifications, user menu
- Sticky position

### Data Display

**Glyph Card:**
- Border with rounded-lg
- Header: Glyph ID (truncated, monospace, copyable)
- Metadata grid: 2 columns (label: value pairs)
- Quality badge (draft/tested/production) with distinct borders
- Footer actions: View, Export, Promote

**Data Table (Registry/Fragments):**
- Sticky header row
- Alternating row treatment for scannability
- Sortable columns with chevron indicators
- Row actions in rightmost column
- Pagination: 25/50/100 per page

**Lineage Graph:**
- Canvas area with pan/zoom controls
- Nodes: rounded rectangles with glyph ID
- Edges: directed arrows labeled with relationship type
- Quality state shown via node border treatment
- Expandable/collapsible node groups

### Forms & Inputs

**Standard Input:**
- Height: h-10
- Padding: px-4
- Border: rounded-md with focus ring
- Label above input: text-sm font-medium mb-2

**Recipe Editor:**
- Split view: JSON editor (left 60%) + Preview (right 40%)
- Monaco editor for JSON with syntax highlighting
- Live validation indicators

**Quality Promotion Modal:**
- Centered overlay with backdrop
- Form fields: Target quality, Evidence URI, Signature
- Action buttons: right-aligned, primary + secondary

### Status & Feedback

**Quality Badges:**
- Pill shape (rounded-full)
- Uppercase text (text-xs font-bold)
- Draft: dashed border
- Tested: solid border
- Production: double border

**Toast Notifications:**
- Fixed bottom-right
- Slide-in animation
- Auto-dismiss after 5s
- Icons for success/error/warning

**Audit Log Entries:**
- Timeline layout with vertical line connector
- Timestamp absolute positioned left
- Actor and action emphasized
- Expandable payload details

### Code Display

**Inline Glyph ID:**
- Monospace font
- Copy button on hover
- Truncated with tooltip showing full ID

**JSON Viewer:**
- Syntax-highlighted with collapsible sections
- Line numbers in gutter
- Copy entire block button

---

## Page Layouts

### Dashboard
- 3-column stat cards (glyphs count, recent builds, promotions)
- 2-column below: Recent Activity (left) + Quick Actions (right)
- Charts: Build timeline, Quality distribution

### Registry Browser
- Top: Search bar + filters (quality, type, date range)
- Results: Table view with sortable columns
- Right panel: Selected glyph details (slides in on selection)

### Lineage Viewer
- Full-width graph canvas
- Top toolbar: Zoom controls, layout options (tree/radial), filter toggles
- Bottom panel: Selected node details (collapsible)

### Assembly View
- Three-panel layout: Recipe (left 30%), Logs (center 50%), Artifacts (right 20%)
- Build progress indicator at top
- Real-time log streaming with auto-scroll toggle

---

## Responsive Strategy

**Desktop (≥1280px):** Full sidebar, multi-column layouts
**Tablet (768-1279px):** Collapsible sidebar, 2-column max
**Mobile (<768px):** Hidden sidebar (hamburger menu), single column stacking

---

## Animations

**Minimal, Purposeful Only:**
- Sidebar collapse: 200ms ease
- Modal entrance: 150ms fade + scale
- Toast notifications: 200ms slide-in
- NO scroll animations, parallax, or decorative effects

---

## Images

**Not Applicable:** This is a technical developer tool with no hero imagery. Visual content limited to:
- Icons for navigation and actions (Material Icons CDN)
- Status indicators and badges
- Graph visualizations (generated)
- Empty state illustrations (simple line art for "no data" scenarios)