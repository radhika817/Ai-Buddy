# AI Buddy — Design System & Visual Specification

This document defines the visual design system for **AI Buddy**, established from the architectural editorial desktop screens ("AI Buddy — Desktop Landing Page", "AI Buddy — Desktop Dashboard", and "AI Buddy — Meeting Detail") in Stitch project `AI Buddy Dashboard` (`projects/7006716388969545031`).

All future frontend implementations and page rebuilds must follow these rules exactly to maintain visual coherence and brand discipline.

---

## 1. Colors & Color Roles

The palette is built upon planar layering of matte surfaces, warm mineral ink, and calming pastel tones. It strictly avoids glossy effects, skeuomorphic shading, or color gradients.

### 1.1 Core Palette Tokens

| Token Name | Hex Value | Role & Usage |
|---|---|---|
| **Canvas / Viewport Background** | `#CFDCE5` | Soft, desaturated pastel blue-grey. Wraps the outer viewport on desktop and tablet, establishing an atmospheric boundary outside the central frame. |
| **Main Frame Surface** | `#F6F5F3` | Warm, tactile off-white. The structural surface of the primary 1440px framed artboard, top navigation bar, subheaders, and secondary card containers. |
| **Card / Table Surface** | `#FFFFFF` | Pure white. Used for elevated operational planes inside the frame: data tables, meeting cards, inner card bodies, and action item rows. |
| **Lavender Accent Panel** | `#DDD9F0` | Flat pastel lavender. Reserved exclusively for high-priority architectural callouts: landing hero accent block, dashboard KPI stats panel, meeting detail summary card, and default assignee chips. |
| **Ink (Primary Dark)** | `#1D1618` | Deep, warm mineral near-black. Applied to all headlines, primary titles, body text, primary button fills, active navigation pills, and user chat bubbles. |
| **Muted Text** | `#6A6468` | Neutral slate stone. Used for secondary metadata (durations, dates, timestamps), table headers, helper labels, inactive nav links, and citations. |
| **Borders & Hairlines** | `#DEDAD6` | Delicate bone hairline. Applied to all 1px solid structural dividing lines, table row borders, card perimeters, pill outlines, and input borders. |

### 1.2 Semantic Status Colors

All status indicators use a desaturated semantic hue paired with a faint tinted background plane:

| Status | Text / Indicator Hex | Background Tint Hex | Usage |
|---|---|---|---|
| **Success / Ready** | `#2C5E40` (or `#4C8A66`) | `#E6F3EB` (or `#E3EFE7`) | "Ready" status badge, completed indicators, privacy assurance dot. |
| **Warning / Pending** | `#BE8A2E` | `#FAF4E8` (or `#F9F3EA`) | Warning banners, unresolved items, caution states. |
| **Danger / Failed** | `#9A2D22` (or `#B5483A`) | `#FBEAE8` | "Failed" status badge, error validation states. |
| **Info / Analyzing** | `#2E5580` (or `#4A6FA0`) | `#E8F0F8` | "Analyzing", "Transcribing", or "Processing" status badges. |

### 1.3 Complementary Component Tints

| Component Token | Hex Value | Usage |
|---|---|---|
| **Secondary Chip Blue** | `#D9E3ED` | Alternating speaker/assignee pill chip (e.g., Atharva). |
| **AI Assistant Chat Bubble** | `#EDE9F7` | Soft lavender tint for AI assistant conversational responses. |
| **Table Row Active/Hover** | `#FAF9F7` / `#F7F6F3` | Subtle warm tint on table row hover or selected item. |

---

## 2. Typography

The typographic system creates tension through deliberate contrast: heavy, authoritative grotesques paired with delicate light italics, supported by clean humanistic body text and disciplined monospace notation.

### 2.1 Font Families

```css
--font-display: 'Inter', sans-serif;
--font-body: 'DM Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

- **Inter**: Headlines, display titles, section headings, and page names.
- **DM Sans**: General interface body, buttons, table cell text, inputs, and conversation bubbles.
- **JetBrains Mono**: Strictly limited to tabular numbers, timestamps, dates, durations, status badges, and citation chips.

### 2.2 Typographic Hierarchy & Scale

| Style Role | Font Family | Size / Line Height | Weight | Letter Spacing | Case & Style |
|---|---|---|---|---|---|
| **Hero Display (Bold)** | Inter | `72px–88px` / `76px–92px` | 800 (Extrabold) | `-0.035em` | UPPERCASE |
| **Hero Display (Italic)** | Inter | `72px–88px` / `76px–92px` | 300 (Light) | `-0.02em` | Italic (lowercase or title case) |
| **Page Title** | Inter | `44px–56px` / `48px–60px` | 800 (Extrabold) | `-0.03em` | Mixed / Sentence case |
| **Section Heading** | Inter | `24px` / `30px` | 700 (Bold) | `-0.02em` | Sentence case |
| **Body Large** | DM Sans | `19px` / `28px` | 400 (Regular) | `-0.01em` | Normal sentence case |
| **Body Medium (Default)** | DM Sans | `17px` / `26px` | 400 (Regular) | `-0.005em` | Normal sentence case |
| **Body Small (Interface)** | DM Sans | `15px` / `22px` | 400 / 500 (Med) | `0em` | Normal sentence case |
| **UI Button / Control** | DM Sans | `15px` / `20px` | 600 (SemiBold) | `0em` | Sentence case |
| **Caption Mono** | JetBrains Mono | `13px` / `18px` | 500 (Medium) | `+0.04em` | Timestamps & dates |
| **Label Mono (Micro)** | JetBrains Mono | `11px` / `14px` | 600 (SemiBold) | `+0.08em` | UPPERCASE headers & badges |

### 2.3 Headline Contrast Dynamics
Headlines in hero treatments must pair an authoritative heavy grotesque word with an ethereal light italic flourish within the same phrase:
- **Landing Page**: `TURN MEETINGS INTO` (`Inter 800 Extrabold`) + `ACTION` (`Inter 300 Light Italic`).
- **Dashboard**: `YOUR` (`Inter 800 Extrabold`) + `MEETINGS` (`Inter 300 Light Italic`).

### 2.4 Monospace Discipline Rule
`JetBrains Mono` is **NEVER** to be used for general labels, headings, or decorative conversational body text.
- **Allowed Uses**:
  - Time codes: `02:31`, `02:44`, `23:41`
  - Dates: `8 Oct 2026`, `29 Sep 2026`
  - Durations: `42:10`, `18:35`, `1:03:22`
  - Metric counters: `6`, `4`, `11`
  - Status badges: `Ready`, `Analyzing`, `Failed`
  - Table header labels: `TITLE`, `DATE`, `DURATION`, `STATUS`
  - Citation tags: `Sprint review, 02:42`
- **Forbidden Uses**:
  - Paragraph copy, speaker names, button labels, and decorative index markers.

---

## 3. Shape, Borders & Spacing

### 3.1 Corner Radii

| Component / Layer | Corner Radius | Tailwind Class Equivalent |
|---|---|---|
| **Main Viewport Architectural Frame** | `28px` (desktop), `0px` (mobile) | `rounded-[28px]` / `rounded-none md:rounded-[28px]` |
| **Large Accent Panels (Lavender Hero, Stats)** | `24px` | `rounded-[24px]` |
| **Content Cards & Aside Container** | `20px` | `rounded-[20px]` |
| **Table Card & Action Item Containers** | `16px` | `rounded-[16px]` |
| **Form Inputs & Sub-panels** | `12px` to `16px` | `rounded-xl` or `rounded-[16px]` |
| **Interactive Pills, Badges, Chips, Search** | `9999px` | `rounded-full` |
| **Action-Item Checkboxes** | `6px` | `rounded-[6px]` |

### 3.2 Border Style
- **Color**: `#DEDAD6` ("hairline") exclusively.
- **Width**: Strictly `1px solid #DEDAD6`. No double borders, no inset shadows.
- **Checkbox Border**: `1.5px solid #DEDAD6`.
- **Divider Hairlines**: `1px solid #DEDAD6` or `#1D1618`/15 (inside lavender blocks).

### 3.3 Spacing Scale

The layout adheres to a strict 4px/8px modular rhythm:

| Token | Size (px / rem) | Typical Usage |
|---|---|---|
| `space-xs` | `4px` / `0.25rem` | Micro-gap between icons and badges. |
| `space-sm` | `8px` / `0.5rem` | Badge padding, chip gap, list spacing. |
| `space-md` | `16px` / `1.0rem` | Input padding, header vertical padding, card spacing. |
| `space-lg` | `24px` / `1.5rem` | Section gutters, tab bar padding, card internal padding. |
| `space-xl` | `40px` / `2.5rem` | Desktop margins, section separation. |
| `space-2xl` | `64px` / `4.0rem` | Page header gap, hero section bottom padding. |
| `space-3xl` | `96px` / `6.0rem` | Major landing section breathing room. |

- **Outer Viewport Padding**: `p-4 sm:p-8 lg:p-10`.
- **Desktop Horizontal Edge Margin**: `40px` (`px-10` or `2.5rem`).
- **Standard Grid Gutter**: `24px` (`1.5rem`) mobile; `32px` (`2rem`) desktop.

### 3.4 Content Widths & Measure
- **Primary Artboard Frame**: Max width `1440px`, centered horizontally.
- **Display Headlines**: Max width `1152px` (`max-w-6xl`).
- **Reading Measure (Summaries & Hero Copy)**: Max width `680px` (approx 42rem) or `max-w-md` (448px) to `max-w-xl` (576px) to maintain comfortable 65–75 character line lengths.
- **Dashboard Search Pill**: Max width `320px` (`sm:w-80`).

### 3.5 Elevation & Depth Rule: Flat Planar Integrity
- **NO SHADOWS**: `box-shadow: none !important;` throughout the interface.
- **NO GRADIENTS**: Every background and surface must be a flat, solid hex fill.
- **NO FROSTED GLASS / BLUR**: Do not use `backdrop-filter: blur()`.
- Hierarchy is achieved exclusively through planar contrast (e.g. `#CFDCE5` backdrop → `#F6F5F3` frame → `#FFFFFF` cards → `#DDD9F0` lavender callouts) bounded by crisp `#DEDAD6` hairlines.

---

## 4. Components Specification

### 4.1 Top Navigation Bar & Active Nav Pill
- **Container**: Docked / sticky at top, height `80px` (`h-20`), background `#F6F5F3`, border-b `1px solid #DEDAD6`.
- **Brand Wordmark**: Left-aligned, "AI Buddy" in Inter Extrabold 24px (`#1D1618`), optionally paired with a 28×28px minimal geometric black mark (`w-7 h-7 bg-[#1D1618] rounded flex items-center justify-center`).
- **Center Navigation**:
  - Cluster of pill links with `8px` gap.
  - **Active Pill**: `px-4 py-1.5 rounded-full bg-[#1D1618] text-[#F6F5F3] font-body-sm font-medium`.
  - **Inactive Link**: `px-4 py-1.5 rounded-full text-[#6A6468] font-body-sm font-medium hover:text-[#1D1618] transition-colors`.
- **Trailing Action**: Outlined pill button ("Log in" or "Log out").

### 4.2 Primary Pill Button
- **Height**: Exactly `48px`.
- **Shape**: Full pill (`rounded-full`, `9999px`).
- **Padding**: `0 28px` (or `0 32px`).
- **Background**: Solid `#1D1618`.
- **Text**: DM Sans, `15px–17px`, Weight 600, color `#F6F5F3`.
- **Border**: None.
- **Hover/Active**: Opacity `0.90`, transform `hover:-translate-y-0.5`, active `scale(0.98)`.

### 4.3 Secondary Outlined Pill Button
- **Height**: Exactly `48px` (or `40px` for header buttons).
- **Shape**: Full pill (`rounded-full`).
- **Padding**: `0 24px` to `0 28px`.
- **Background**: Transparent or `#F6F5F3`.
- **Border**: `1px solid #DEDAD6` (or `1px solid #1D1618`).
- **Text**: DM Sans, `15px`, Weight 600, color `#1D1618`.
- **Hover**: Background `#1D1618`/5% or border transitions to solid `#1D1618`.

### 4.4 Search Pill
- **Height**: `44px–48px`.
- **Shape**: Full pill (`rounded-full`).
- **Background**: `#FFFFFF`.
- **Border**: `1px solid #DEDAD6`.
- **Padding**: `px-5 py-2.5`.
- **Typography**: DM Sans 15px `#1D1618`, placeholder `#6A6468`/60%.
- **Focus**: Border `#1D1618`, outline `none`.

### 4.5 Filter Pills
- **Height**: `32px–36px`.
- **Shape**: Full pill (`rounded-full`), padding `px-4 py-1.5`.
- **Typography**: DM Sans 15px, Weight 500.
- **Active State**: Solid `#1D1618` fill with `#F6F5F3` text.
- **Inactive State**: Solid `#FFFFFF` fill, `1px solid #DEDAD6` border, `#6A6468` text; on hover, border and text transition to `#1D1618`.

### 4.6 Status Badges / Chips
- **Height**: `24px–26px`.
- **Shape**: Full pill (`rounded-full`), padding `px-3 py-1`.
- **Typography**: JetBrains Mono, `11px`, Weight 600, uppercase, letter-spacing `+0.08em`.
- **Variants**:
  - **Ready**: Background `#E6F3EB`, text `#2C5E40` (optionally preceded by a 6px solid `#2C5E40` circle dot).
  - **Analyzing / Processing**: Background `#E8F0F8`, text `#2E5580`.
  - **Failed**: Background `#FBEAE8`, text `#9A2D22`.

### 4.7 Functional Tabs
- **Container**: Border-bottom `1px solid #DEDAD6`, gap `24px–32px`.
- **Tab Buttons**:
  - **Active Tab**: DM Sans 17px, font-semibold, text `#1D1618`, border-b-2 `#1D1618`, margin-bottom `-1px`.
  - **Inactive Tab**: DM Sans 17px, font-medium, text `#6A6468`, hover text `#1D1618`, border-b-2 transparent.

### 4.8 Meetings Table Card & Rows
- **Card Container**: `#FFFFFF` background, `rounded-[16px]`, `border 1px solid #DEDAD6`, overflow hidden.
- **Header Row**: Background `#FAF9F7`, border-bottom `1px solid #DEDAD6`, columns in JetBrains Mono `11px` uppercase `#6A6468` (`TITLE`, `DATE`, `DURATION`, `STATUS`, trailing actions).
- **Body Rows**:
  - Padding `px-6 py-5`, separated by horizontal `divide-y divide-[#DEDAD6]`.
  - Background `#FFFFFF`, transition to `#FAF9F7` or `#F7F6F3` on hover.
  - Title: DM Sans 15px `#1D1618` Medium.
  - Date & Duration: JetBrains Mono 13px `#6A6468` Regular.
  - Status: Corresponding status badge pill.
  - Trailing indicator: Minimal arrow `→` in `#6A6468`, shifting `translate-x-0.5` on hover.

### 4.9 Stat Panel (Dashboard KPI Banner)
- **Container**: Solid `#DDD9F0` (flat pastel lavender), `rounded-[24px]`, `border 1px solid #DEDAD6`, padding `24px` to `32px`.
- **Grid**: 3-column layout separated by vertical rules (`border-r border-[#1D1618]/15`).
- **Stat Value**: JetBrains Mono `36px–44px` (`text-[44px]`), font-semibold, color `#1D1618`.
- **Stat Label**: DM Sans `15px`, color `#6A6468`, margin-top `8px`.

### 4.10 Action-Item Row with Checkbox
- **Container**: `#FFFFFF` background, `rounded-xl` or inside a divided `rounded-[16px]` card, `border 1px solid #DEDAD6`, padding `16px 20px`.
- **Checkbox**: Size `20px × 20px`, corner radius `6px`, border `1.5px solid #DEDAD6`, background transparent. When checked: background `#1D1618` with white check glyph.
- **Task Description**: DM Sans `15px–17px` Medium, color `#1D1618`.
- **Right Trailing Group**:
  - Assignee Chip (see 4.11).
  - Target Deadline: JetBrains Mono `13px` uppercase `#6A6468` (`Fri`, `Wed`, etc.).

### 4.11 Assignee Chip
- **Shape**: Full pill (`rounded-full`), height `24px–28px`, padding `px-3 py-0.5`.
- **Background**: Flat `#DDD9F0` (lavender) or `#D9E3ED` (soft blue).
- **Border**: `1px solid #DEDAD6`.
- **Typography**: DM Sans `13px–15px`, Weight 600, color `#1D1618`.

### 4.12 Decision Row
- **Container**: Flat `#F6F5F3` or `#FFFFFF`, `rounded-xl` / `rounded-[16px]`, `border 1px solid #DEDAD6`, padding `16px 20px`.
- **Content**: DM Sans `15px–17px` Medium text `#1D1618`.
- **Timestamp Chip**: Right-aligned pill in `#F6F5F3` with `1px solid #DEDAD6` border, JetBrains Mono `13px` `#6A6468` font-semibold (e.g., `23:41`).

### 4.13 Chat Message Bubbles
- **User Message**:
  - Right-aligned, max width `85%`.
  - Background: Solid `#1D1618`, text `#F6F5F3`.
  - Corner radius: `rounded-2xl rounded-tr-sm` (16px corners, 4px top-right).
  - Typography: DM Sans `15px` Regular, padding `px-4 py-3`.
- **Assistant Message**:
  - Left-aligned, max width `90%`.
  - Background: Solid `#EDE9F7` (soft lavender tint), text `#1D1618`.
  - Border: `1px solid #DEDAD6`/60%.
  - Corner radius: `rounded-2xl rounded-tl-sm` (16px corners, 4px top-left).
  - Typography: DM Sans `15px` Regular, padding `px-4 py-3`.

### 4.14 Citation Chip
- **Position**: Placed immediately below the assistant chat bubble.
- **Shape**: Full pill (`rounded-full`), padding `px-2.5 py-0.5`.
- **Background**: `#F6F5F3`, border `1px solid #DEDAD6`.
- **Typography**: JetBrains Mono `11px`, color `#6A6468` (e.g., `Sprint review, 02:42`).

### 4.15 Suggested-Question Pills
- **Container**: Stacked full-width or inline pills.
- **Shape**: Full pill (`rounded-full`), padding `px-3.5 py-2`.
- **Background**: Transparent, border `1px solid #DEDAD6`.
- **Typography**: DM Sans `13px`, color `#1D1618`.
- **Hover**: Border transitions to `#1D1618`.

### 4.16 Chat Input with Send Button
- **Container**: Full pill container (`rounded-full`), background `#F6F5F3`, border `1px solid #DEDAD6`, height `48px`, relative positioning.
- **Text Input**: DM Sans `15px` `#1D1618`, placeholder `#6A6468`/70%, padding `pl-5 pr-12`, no outline on focus.
- **Send Button**: Inside the input, right-aligned (`absolute right-1.5`), circular `36px × 36px` (`w-9 h-9 rounded-full`), background `#1D1618`, text `#F6F5F3`.
- **Send Icon**: Upward arrow (`arrow_upward`, 18px).

---

## 5. Page Layouts & Structural Blueprints

### 5.1 Common Shell Architecture
Every page is housed within a centered architectural artboard:
```html
<body class="bg-[#CFDCE5] min-h-screen p-4 sm:p-8 lg:p-10 flex justify-center items-start text-[#1D1618]">
  <main class="w-full max-w-[1440px] bg-[#F6F5F3] border border-[#DEDAD6] rounded-[28px] overflow-hidden flex flex-col min-h-screen">
    <!-- Header -->
    <!-- Content Area -->
    <!-- Footer -->
  </main>
</body>
```

### 5.2 Landing Page Layout
1. **Top Navigation**: Height 80px, brand wordmark left, links (`How it works`, `Features`, `Demo`) center, outlined pill button ("Log in") right.
2. **Hero Section** (`pt-16 pb-12 px-6 lg:px-10`):
   - **Display Headline**: `TURN MEETINGS INTO ACTION` (Inter 88px Extrabold + Light Italic, max-w-6xl).
   - **Hero Lavender Block** (`bg-[#DDD9F0]`, `rounded-[24px]`, border `1px solid #DEDAD6`):
     - **Left Column** (5 of 12 cols / ~42%):
       - Core proposition: "Upload a recording. Get a transcript, a summary, action items and decisions, then ask questions across all your meetings."
       - Action buttons: Primary pill "Get started" + Outlined pill "Log in".
       - Privacy footnote: Green bullet dot + "Transcription runs on your own computer. Summaries and chat use Google Gemini."
     - **Right Column** (7 of 12 cols / ~58%):
       - Browser preview card (`bg-white`, `rounded-[20px]`, border `1px solid #DEDAD6`):
         - Chrome bar with 3 dots and title ("Sprint review", "8 Oct 2026", "Ready" badge).
         - Tab row: Summary, Transcript (active), Action items, Decisions.
         - Card body: Transcript snippet with timestamps, 2 action item rows with checkboxes, and a decision callout.
3. **Features Bento Grid**:
   - 3-column grid (`grid-cols-1 md:grid-cols-3 gap-6`), cards in `#F6F5F3` with `rounded-[20px]` and `border 1px solid #DEDAD6`:
     - Card 1: "Transcript you can edit"
     - Card 2: "Tasks and decisions, found for you"
     - Card 3: "Ask across all your meetings"
4. **Footer**: Single row with "Built by Radhika" on left, "GitHub" link on right, border-top `1px solid #DEDAD6`.

### 5.3 Dashboard Layout
1. **Top Navigation**: Brand wordmark left, active nav pill "Meetings" + inactive links ("Tasks", "Ask AI") center, "Log out" button right.
2. **Page Header**:
   - Headline: `YOUR MEETINGS` (Inter 56px Extrabold + Light Italic).
   - Subtitle: "6 recordings, 4 open tasks." in `#6A6468`.
   - Right action: Primary pill button "Upload a recording".
3. **Stats Row**: Flat lavender panel (`bg-[#DDD9F0]`, `rounded-[24px]`, border `1px solid #DEDAD6`):
   - 3 columns divided by hairlines: `6 Meetings`, `4 Open tasks`, `11 Done`.
4. **Controls Row**:
   - Left: Search input pill (`sm:w-80`).
   - Right: Filter pill cluster (`All` [active], `Ready`, `Processing`, `Failed`).
5. **Meetings Table Card**:
   - White card (`rounded-[16px]`, border `1px solid #DEDAD6`).
   - Monospace uppercase column headers: `TITLE`, `DATE`, `DURATION`, `STATUS`, `→`.
   - Rows for each recording with dates, durations, status badges, and hover row shift.
6. **Sub-table Action**: Text link "Ask across all meetings →".
7. **Footer**: "Built by Radhika" and "GitHub".

### 5.4 Meeting Detail Layout (Two-Column Workspace)
1. **Top Navigation**: Shared top bar.
2. **Subheader Bar**:
   - "← Meetings" back navigation link.
   - Page title: Meeting title (e.g. `Sprint review`, Inter 44px Extrabold).
   - Metadata row: Date (`8 Oct 2026`) • Duration (`42:10`) • Status badge (`Ready`).
   - Right action buttons: Outlined pills for "Export" and "Follow-up email".
3. **Workspace Grid** (12 columns, gap `32px`):
   - **Left Column** (8 of 12 cols / ~66%):
     - **Speakers Legend**: "Speakers" label + pill chips (`Radhika` in `#DDD9F0`, `Atharva` in `#D9E3ED`).
     - **Horizontal Tabs**: `Summary` (active), `Transcript`, `Action items`, `Decisions`.
     - **Summary Block**: Solid `#DDD9F0` lavender panel (`rounded-[20px]`), section title, and paragraph.
     - **Key Points Section**: Heading + bulleted list with `#1D1618` bullets.
     - **Action Items Section**: Divided white card (`rounded-[16px]`), list of action items with 20px checkboxes, assignee chips, and deadlines.
     - **Decision Section**: White card with decision sentence and right-aligned timestamp badge.
   - **Right Column / Aside** (4 of 12 cols / ~34%):
     - Sticky card (`bg-white`, `rounded-[20px]`, `border 1px solid #DEDAD6`, sticky `top-8`, min-height `640px`):
       - Header: "Ask AI Buddy" + "Contextual" label.
       - Conversation area: User dark bubble, AI lavender bubble (`#EDE9F7`), and citation chip.
       - Suggested prompts: "Suggested" label + pill buttons.
       - Chat input: Pill input with nested circular black send button.
4. **Footer**: "Built by Radhika" and "GitHub".

---

## 6. Content & Copywriting Rules

1. **Plain, Direct, and Honest Copy Only**:
   - State functionality plainly without buzzwords, marketing puffery, or hyperbole.
   - No fake statistics, fabricated speed claims, invented company logos, or mock user testimonials.
2. **Truth in AI Architecture & Privacy**:
   - The product performs audio transcription locally using OpenAI Whisper.
   - The product sends structured text transcripts to Google Gemini for summarization, action item detection, and conversational Q&A.
   - **Strict Prohibition**: Never claim "zero cloud", "100% on-device", "data never leaves your machine", or "fully private offline AI".
   - **Approved Canonical Copy**:
     > "Transcription runs on your own computer. Summaries and chat use Google Gemini."
3. **No Dead or Synthetic Links**:
   - All navigation links and buttons must map to actual routes (`/`, `/dashboard`, `/meetings/:id`, `/tasks`, `/chat`, `/login`, `/register`).
   - External links are strictly limited to the author attribution and legitimate GitHub repository.

---

## 7. Motion & Interaction Rules

Motion should feel calm, instant, and structural—never theatrical or distracting:

1. **Duration**: Fast and subtle: strictly `150ms` to `250ms` (`ease-out`).
2. **Page & Component Transitions**:
   - Entrance: Gentle opacity fade (`0 → 1`) with micro-rise (`translateY: 4px → 0px`).
   - No dramatic zooms, spring bounces, or physics-heavy overshooting.
3. **Hover & Focus Interactions**:
   - Outlined buttons and filter pills: Smooth border and text color transition to `#1D1618`.
   - Primary pill button: Subtle opacity reduction to `0.90` and `-1px` lift (`hover:-translate-y-0.5`).
   - Active / click state: Subtle compress (`active:scale-[0.98]` or `active:scale-95`).
   - Table rows: Background tint shift to `#FAF9F7`, trailing arrow shifts right `2px`.
4. **Accessibility (Reduced Motion)**:
   - Must strictly respect `prefers-reduced-motion: reduce`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       transform: none !important;
     }
   }
   ```

---

## 8. The "Do Not" List

Under no circumstances should any of the following patterns appear in any page:

- ❌ **No Gradients**: No CSS linear gradients, radial gradients, or mesh gradients. All surfaces are flat matte fills.
- ❌ **No Shadows**: No drop shadows, ambient blur elevation (`box-shadow`), or card elevation layers (`box-shadow: none !important;`).
- ❌ **No Glassmorphism / Glow**: No `backdrop-filter: blur()`, no translucent frosted glass, no neon colored glow outlines.
- ❌ **No Emoji Decoration**: Never use emoji icons in headings, badges, tabs, cards, or labels (e.g. no 🎙️, ✨, 📌, 🚀 in the UI).
- ❌ **No Bottom Tab Bars**: Mobile navigation collapses cleanly into top header patterns, never bottom mobile app tab bars.
- ❌ **No Extra Navigation Items**: Restrict navigation strictly to: `Meetings`, `Tasks`, `Ask AI`, `Log in`, and `Log out`.
- ❌ **No Technical Jargon / Sci-Fi Badges**: No pseudo-terminal brackets or decorative labels like `[ 01 // OVERVIEW ]`, `[ SYSTEM_READY ]`, or `MODULE_V2`.
- ❌ **No Arbitrary Monospace**: Do not render body copy, speaker names, button text, or section headers in `JetBrains Mono`. Monospace is exclusively reserved for timestamps, dates, durations, status codes, and citations.
