import type { DesignToolKey, ToolContent } from "./types";

export const designToolsEn: Record<DesignToolKey, ToolContent> = {
  "color-palettes": {
    slug: "color-palettes",
    title: "Colour Palette Library",
    short: "Browse 110 professional colour palettes, build harmonies and check WCAG contrast. Copy HEX codes or CSS in one click.",
    seoTitle: "Colour Palette Library & Generator – Harmonies and WCAG Contrast",
    seoDescription: "Free library of 110 curated colour palettes in 11 styles, with a random generator, colour harmonies (complementary, triadic…), WCAG contrast checks and CSS export.",
    about: `<p>Choosing colours that work together is one of the hardest parts of design. This library gathers <strong>110 curated palettes</strong> in eleven styles: modern, minimal, luxury, corporate, nature, pastel, vintage, dark, vibrant, gradient steps and monochrome. Every palette has five colours, ordered from the most to the least prominent.</p><h2>Harmonies</h2><p>Pick any base colour to see the classic colour-wheel combinations: <strong>complementary</strong> (opposite hues), <strong>analogous</strong> (neighbours), <strong>triadic</strong> (three hues 120° apart), <strong>split-complementary</strong> and <strong>monochromatic</strong> (one hue, several lightness levels). They are calculated in the HSL colour space.</p><h2>Accessibility</h2><p>The contrast checker uses the WCAG 2 formula. Body text needs a ratio of at least <strong>4.5:1</strong> (level AA), large text at least 3:1, and 7:1 reaches level AAA. Each colour is also tested on white and on black so you know which text colour to use.</p><p>Favourites are saved in your browser only. Nothing is sent to our servers.</p>`,
    steps: [
      "Filter the library by style or colour, or search for a HEX code.",
      "Click a colour to copy its HEX code, or use the copy button for the whole palette.",
      "Press “Use” to open the palette, see its harmonies and check text contrast.",
      "Copy the palette as CSS variables, SCSS, Tailwind or JSON.",
    ],
    examples: ["Find a calm corporate palette for a presentation", "Check that white text is readable on your brand colour", "Generate an analogous palette from your logo colour"],
    faq: [
      { q: "Can I use these palettes commercially?", a: "Yes. Colour combinations are not protected, so you can use them in any project." },
      { q: "What does AA or AAA mean?", a: "They are WCAG accessibility levels. AA needs a contrast ratio of 4.5:1 for normal text; AAA needs 7:1. “AA large” means the pair is only acceptable for large or bold text." },
      { q: "Where are my favourites stored?", a: "In your browser’s local storage, on this device only. Clearing your browser data removes them." },
    ],
  },
  "pattern-generator": {
    slug: "pattern-generator",
    title: "Pattern Generator",
    short: "Create seamless geometric, dotted, striped, wavy and abstract patterns. Download as SVG, PNG or CSS.",
    seoTitle: "Seamless Pattern Generator – SVG, PNG and CSS Backgrounds",
    seoDescription: "Design seamless background patterns online: dots, grids, stripes, waves, hexagons, confetti and more. Adjust colours, spacing, scale and rotation, then export SVG, PNG or CSS.",
    about: `<p>Patterns add texture to websites, social posts, packaging and slides. This generator draws <strong>14 seamless patterns</strong> in seven families: geometric, dots, stripes, grids, waves, abstract and modern (Memphis style).</p><p>Every setting updates the live preview: background and two motif colours, tile <strong>spacing</strong>, motif <strong>scale</strong>, line thickness, <strong>rotation</strong> and opacity. The abstract patterns use a seed, so “Shuffle” gives a new arrangement that you can reproduce later. You can also take colours from any palette in our library.</p><h2>Export formats</h2><ul><li><strong>SVG</strong>: vector, sharp at any size, ideal for print and design tools.</li><li><strong>PNG</strong>: an image at the exact size you choose, with optional transparency.</li><li><strong>CSS</strong>: a ready-to-paste background for websites, with the tile embedded as an SVG data URI.</li></ul><p>Patterns are generated in your browser. Nothing is uploaded.</p>`,
    steps: [
      "Choose a pattern type.",
      "Set the colours, or take them from a palette.",
      "Adjust spacing, scale, thickness, rotation and opacity while watching the preview.",
      "Enter the size and download SVG, PNG or CSS, or copy the CSS code.",
    ],
    examples: ["A subtle dotted background for a landing page", "A bold Memphis pattern for an Instagram post", "A transparent wave texture to place over a photo"],
    faq: [
      { q: "Are the patterns seamless?", a: "Yes. Each pattern repeats a tile that joins perfectly on all sides. In CSS, rotations that are not multiples of 90° can show a faint seam; the SVG export has none." },
      { q: "Can I use the patterns in commercial work?", a: "Yes. The patterns you create are yours to use." },
      { q: "How do I get a transparent background?", a: "Turn on “Transparent background” before downloading SVG or PNG." },
    ],
  },
  "chart-designer": {
    slug: "chart-designer",
    title: "Chart & Infographic Designer",
    short: "Design publication-ready charts, KPI cards, timelines and infographics. Edit data, colours and fonts, then download PNG, JPG, SVG or PDF.",
    seoTitle: "Chart & Infographic Designer – Free Online Graph Maker (PNG, SVG, PDF)",
    seoDescription: "Create professional charts and infographics for social media, presentations and reports. 13 chart types, 12 templates, 17 fonts with Arabic support, and PNG, JPG, SVG and PDF export.",
    about: `<p>This is a visual editor for data graphics. Start from one of <strong>twelve templates</strong>, from minimal editorial and Swiss typography to dark premium and magazine layouts, or from a blank canvas. Then edit everything directly on the canvas.</p><h2>Charts that stay accurate</h2><p>There are <strong>13 chart types</strong>: bar, horizontal bar, line, area, pie, doughnut, radar, scatter, comparison (butterfly), progress bars and rings, KPI cards, timelines and infographic lists. You enter data in a spreadsheet-style table, or paste it from Excel or Google Sheets. Values are drawn to scale, and you can format them as percentages, currencies or compact numbers (1.2K, 3.4M), with your own prefix and suffix.</p><h2>Design freely</h2><p>Drag, resize, rotate, align and layer elements, with snapping guides and a grid. Add text, shapes, icons and your logo. Choose canvas presets for Instagram, stories, Facebook, LinkedIn, presentations and A4, or set a custom size. The font library has 17 open-licence families, including <strong>Cairo, Tajawal, IBM Plex Sans Arabic and Amiri</strong> for Arabic. Arabic text and charts are laid out right to left.</p><h2>Export</h2><p><strong>PNG</strong> and <strong>JPG</strong> up to 4× resolution, <strong>SVG</strong> with the fonts embedded, and a print-ready <strong>PDF</strong> (A4, Letter, design size or custom) at 300 DPI. You can preview each file before downloading it. Designs are saved automatically in your browser (IndexedDB). Your data, logos and designs never leave your device.</p>`,
    steps: [
      "Choose a template and canvas size, or start blank.",
      "Select a chart and enter or paste your data.",
      "Customise chart type, colours, labels and number format in the properties panel.",
      "Pick a palette and a font pairing, then arrange text, icons, shapes and your logo.",
      "Click Export, check the preview, and download PNG, JPG, SVG or PDF.",
    ],
    examples: ["An Instagram post showing quarterly revenue growth", "A LinkedIn KPI card for an annual report", "An Arabic timeline of company milestones for a presentation", "An A4 PDF infographic for print"],
    faq: [
      { q: "Do I need an account?", a: "No. Designs are saved automatically in your browser on this device. Use Projects to open, duplicate or delete them." },
      { q: "Is my data uploaded?", a: "No. Charts are drawn and exported in your browser. Your data, uploaded logos and designs are never sent to our servers or to other services." },
      { q: "Does it support Arabic?", a: "Yes. Arabic text is shaped correctly, laid out right to left, and charts mirror their direction. Arabic fonts are embedded in SVG exports and rendered exactly in PNG, JPG and PDF." },
      { q: "Is the PDF vector?", a: "The PDF contains your design as a 150 or 300 DPI image, so fonts and Arabic text look exactly as on screen and it prints sharply. For fully scalable vector output, use the SVG export." },
      { q: "Can I edit a design later?", a: "Yes. Everything stays editable: reopen the design from Projects, change data or colours, and export again." },
    ],
  },
};
