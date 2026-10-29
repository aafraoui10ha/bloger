import type { ToolKey } from "./types";

/**
 * Demonstration DRAFTS (English only, never published by the seed). They are
 * templates showing the expected structure of a helpful guide. Each must be
 * replaced with original, researched, reviewed writing before publication.
 */
const template = (topic: string, toolHint: string) => `
<p><strong>[Demo draft — replace before publishing]</strong> This outline shows the structure of a helpful guide about ${topic}. Write original content in each section, test every step yourself, and remove this note.</p>
<h2>Introduction</h2>
<p>State in two or three sentences who this guide is for and what they will be able to do after reading it.</p>
<h2>The problem this guide solves</h2>
<p>Describe the real situation readers face, using concrete details rather than general statements.</p>
<h2>Step-by-step instructions</h2>
<ol><li>First step, written as a clear action.</li><li>Second step, including what the reader should see.</li><li>Third step, with the expected result.</li></ol>
<p>Link to the relevant tool where it genuinely helps: ${toolHint}.</p>
<h2>Practical examples</h2>
<p>Add at least two worked examples with real numbers or files you have tested. Original screenshots or illustrations help readers follow along.</p>
<h2>Limitations and common errors</h2>
<ul><li>Explain when this approach does not work.</li><li>List mistakes readers often make and how to avoid them.</li></ul>
<h2>Summary</h2>
<p>Recap the key points in a few sentences.</p>
<p>Add frequently asked questions in the FAQ panel of the editor, answering questions real users ask.</p>`;

export const demoArticles: { slug: string; title: string; excerpt: string; category: "images" | "writing" | "calculations"; tools: ToolKey[]; html: string }[] = [
  { slug: "how-to-compress-images-for-websites", title: "How to Compress Images for Websites", excerpt: "Demo draft: outline for a guide on choosing formats and quality settings for faster pages.", category: "images", tools: ["image-compressor", "image-to-webp"], html: template("compressing images for websites", "the Image Compressor and the Image to WebP converter") },
  { slug: "png-vs-jpg-vs-webp", title: "PNG vs JPG vs WebP: Which Format Should You Use?", excerpt: "Demo draft: outline comparing the three most common web image formats.", category: "images", tools: ["png-to-jpg", "jpg-to-png", "image-to-webp"], html: template("choosing between PNG, JPG and WebP", "the PNG to JPG, JPG to PNG and WebP converters") },
  { slug: "how-to-resize-an-image-without-distortion", title: "How to Resize an Image Without Distortion", excerpt: "Demo draft: outline explaining aspect ratio and safe resizing.", category: "images", tools: ["image-resizer", "image-inspector"], html: template("resizing images without distortion", "the Image Resizer and the Image Format Inspector") },
  { slug: "how-to-calculate-a-percentage", title: "How to Calculate a Percentage", excerpt: "Demo draft: outline covering the three common percentage calculations.", category: "calculations", tools: ["percentage-calculator"], html: template("calculating percentages", "the Percentage Calculator") },
  { slug: "how-to-calculate-a-discount", title: "How to Calculate a Discount", excerpt: "Demo draft: outline on sale prices, stacked discounts and VAT.", category: "calculations", tools: ["discount-calculator", "percentage-calculator"], html: template("calculating discounts and final prices", "the Discount Calculator") },
  { slug: "how-to-count-words-and-characters", title: "How to Count Words and Characters", excerpt: "Demo draft: outline on word limits, character counts and reading time.", category: "writing", tools: ["word-counter"], html: template("counting words and characters", "the Word & Character Counter") },
  { slug: "guide-to-free-online-text-tools", title: "A Guide to Free Online Text Tools", excerpt: "Demo draft: outline introducing text cleaning, case conversion and counting.", category: "writing", tools: ["text-cleaner", "case-converter", "word-counter"], html: template("free online text tools", "the Text Cleaner, Case Converter and Word Counter") },
  { slug: "how-to-generate-and-use-qr-codes", title: "How to Generate and Use QR Codes", excerpt: "Demo draft: outline on creating, testing and printing QR codes.", category: "writing", tools: ["qr-code-generator"], html: template("generating and using QR codes", "the QR Code Generator") },
];
