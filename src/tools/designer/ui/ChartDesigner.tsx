"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3, Check, Eye, FolderOpen, Grid3x3, LayoutTemplate, Magnet, Maximize2, Minimize2, Minus, Palette, Plus, Redo2, Shapes, SlidersHorizontal, Type, Undo2,
  Upload, X, Download, Loader2, type LucideIcon,
} from "lucide-react";
import { useToolEvents } from "@/tools/ui";
import { hasArabic, libraryFontCss, loadFonts } from "../fonts";
import { canvasMeasure } from "../format";
import { createHistory, pushHistory, redo, undo, type History } from "../history";
import { allText, fontsUsed, newId, resizeDoc, type ChartKind, type Doc, type El, type ShapeKind, type TextRole } from "../model";
import { DocSvg, layoutText } from "../render";
import { buildTemplate, blankDoc, type TemplateId } from "../templates";
import { createChart, createIcon, createImage, createShape, createText } from "../factories";
import {
  deleteAsset, deleteProject, lastProjectId, listAssets, listProjects, loadProject, rememberLastProject, saveAsset, saveProject, storageAvailable, type Asset, type ProjectSummary,
} from "../storage";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { LeftPanel, TABS, type Tab } from "./LeftPanel";
import { ExportDialog } from "./ExportDialog";

const TAB_ICONS: Record<Tab, LucideIcon> = { templates: LayoutTemplate, charts: BarChart3, elements: Shapes, text: Type, colors: Palette, uploads: Upload, projects: FolderOpen };
const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2400;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Re-measures text boxes so their height always matches the wrapped text. */
function fitTexts(doc: Doc): Doc {
  let changed = false;
  const elements = doc.elements.map((el) => {
    if (el.type !== "text") return el;
    const h = layoutText(el, canvasMeasure).height;
    if (Math.abs(h - el.h) < 0.5) return el;
    changed = true;
    return { ...el, h };
  });
  return changed ? { ...doc, elements } : doc;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Reads an uploaded image, downscaling very large photos to keep projects light. */
async function prepareImage(file: File): Promise<{ src: string; width: number; height: number }> {
  const src = await readAsDataUrl(file);
  const img = new Image();
  img.src = src;
  await img.decode();
  let width = img.naturalWidth || 400, height = img.naturalHeight || 400;
  if (file.type === "image/svg+xml" || Math.max(width, height) <= MAX_IMAGE_SIDE) return { src, width, height };
  const k = MAX_IMAGE_SIDE / Math.max(width, height);
  width = Math.round(width * k);
  height = Math.round(height * k);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return { src: canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9), width, height };
}

export function ChartDesigner() {
  const t = useTranslations("designer");
  const locale = useLocale();
  const events = useToolEvents("chart-designer");
  const [hist, setHist] = useState<History<Doc> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("templates");
  const [sheet, setSheet] = useState<Tab | "edit" | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [savedDoc, setSavedDoc] = useState<Doc | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fittedFor = useRef("");
  const doc = hist?.present ?? null;
  const selected = doc?.elements.find((e) => e.id === selectedId) ?? null;

  const change = useCallback((fn: (d: Doc) => Doc, mergeKey?: string | null) => setHist((h) => (h ? pushHistory(h, fitTexts(fn(h.present)), mergeKey ?? null) : h)), []);
  const replace = useCallback((fn: (d: Doc) => Doc) => setHist((h) => (h ? { ...h, present: fn(h.present) } : h)), []);
  const open = useCallback((d: Doc) => {
    setHist(createHistory(fitTexts(d)));
    setSelectedId(null);
    fittedFor.current = "";
  }, []);
  const refreshLists = useCallback(async () => {
    setProjects(await listProjects().catch(() => []));
    setAssets(await listAssets().catch(() => []));
  }, []);

  // Load the last design (or start from a template).
  useEffect(() => {
    let alive = true;
    (async () => {
      setStorageOk(await storageAvailable());
      const last = lastProjectId();
      const saved = last ? await loadProject(last).catch(() => null) : null;
      if (!alive) return;
      open(saved ?? buildTemplate("dashboard", 1080, 1080, locale, t("templates.names.dashboard")));
      void refreshLists();
    })();
    return () => {
      alive = false;
    };
  }, [locale, open, refreshLists, t]);

  // Load the fonts the design uses, then re-measure text.
  const fontKey = doc ? JSON.stringify([fontsUsed(doc), hasArabic(allText(doc))]) : "";
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    loadFonts(fontsUsed(doc), hasArabic(allText(doc))).then(() => {
      if (!alive) return;
      setFontsVersion((v) => v + 1);
      replace(fitTexts);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the set of fonts changes
  }, [fontKey]);

  // Autosave to IndexedDB.
  useEffect(() => {
    if (!doc) return;
    const id = setTimeout(async () => {
      try {
        await saveProject({ ...doc, updatedAt: Date.now() });
        rememberLastProject(doc.id);
        setSavedDoc(doc);
        setSaveFailed(false);
        setProjects(await listProjects());
      } catch {
        setSaveFailed(true);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [doc]);
  const saveState: "saved" | "saving" | "error" = saveFailed ? "error" : doc && savedDoc !== doc ? "saving" : "saved";

  // Fit the canvas to the viewport when the design size changes.
  const fit = useCallback(() => {
    const vp = viewport.current;
    if (!vp || !doc) return;
    const z = Math.min((vp.clientWidth - 48) / doc.width, (vp.clientHeight - 48) / doc.height);
    setZoom(Math.max(0.05, Math.min(2, z)));
  }, [doc]);
  const sizeKey = doc ? `${doc.id}-${doc.width}x${doc.height}-${fullscreen}` : "";
  useEffect(() => {
    if (!sizeKey || fittedFor.current === sizeKey) return;
    fittedFor.current = sizeKey;
    requestAnimationFrame(fit);
  }, [sizeKey, fit]);
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(vp);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- observe once per viewport
  }, [hist === null, fullscreen]);

  const patchSelected = useCallback(
    (patch: Partial<El>, mergeKey?: string) => {
      if (!selectedId) return;
      change((d) => ({ ...d, elements: d.elements.map((e) => (e.id === selectedId ? ({ ...e, ...patch } as El) : e)) }), mergeKey);
    },
    [selectedId, change],
  );

  const add = useCallback(
    (el: El) => {
      change((d) => ({ ...d, elements: [...d.elements, el] }));
      setSelectedId(el.id);
      // On phones, close the panel so the new element is visible on the canvas.
      setSheet((sh) => (sh === "edit" ? sh : null));
      events.complete({ action: "add", type: el.type });
    },
    [change, events],
  );

  const duplicate = useCallback(() => {
    if (!selected) return;
    const copy = { ...structuredClone(selected), id: newId(selected.type), x: selected.x + 24, y: selected.y + 24 } as El;
    add(copy);
  }, [selected, add]);

  const remove = useCallback(() => {
    if (!selectedId) return;
    change((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, change]);

  const layer = useCallback(
    (dir: "front" | "forward" | "backward" | "back") => {
      if (!selectedId) return;
      change((d) => {
        const els = [...d.elements];
        const i = els.findIndex((e) => e.id === selectedId);
        if (i < 0) return d;
        const [el] = els.splice(i, 1);
        const j = dir === "front" ? els.length : dir === "back" ? 0 : dir === "forward" ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
        els.splice(j, 0, el!);
        return { ...d, elements: els };
      });
    },
    [selectedId, change],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (exporting || target.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHist((h) => (h ? (e.shiftKey ? redo(h) : undo(h)) : h));
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        setHist((h) => (h ? redo(h) : h));
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (selected && !selected.locked && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        patchSelected({ x: selected.x + dx, y: selected.y + dy }, `nudge-${selected.id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, selectedId, duplicate, remove, patchSelected, exporting]);

  const startNew = (d: Doc) => {
    open(d);
    setSheet(null);
    events.complete({ action: "new" });
  };

  async function handleFiles(files: FileList | File[], replaceId?: string) {
    setUploadError(null);
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) {
        setUploadError(t("uploads.unsupported", { name: file.name }));
        continue;
      }
      if (file.size > MAX_UPLOAD) {
        setUploadError(t("uploads.tooLarge", { name: file.name, max: "10 MB" }));
        continue;
      }
      try {
        const img = await prepareImage(file);
        if (replaceId) {
          change((d) => ({ ...d, elements: d.elements.map((e) => (e.id === replaceId && e.type === "image" ? { ...e, src: img.src } : e)) }));
          return;
        }
        const asset: Asset = { id: newId("asset"), name: file.name, src: img.src, width: img.width, height: img.height, createdAt: Date.now() };
        await saveAsset(asset).catch(() => undefined);
        if (doc) add(createImage(doc, asset.src, asset.width, asset.height));
      } catch {
        setUploadError(t("uploads.failed", { name: file.name }));
      }
    }
    setAssets(await listAssets().catch(() => []));
  }

  const applyPalette = (colors: string[]) =>
    change((d) => {
      let shapeIndex = 0;
      return {
        ...d,
        elements: d.elements.map((e) => {
          if (e.type === "chart") return { ...e, colors: [...colors] };
          if (e.type === "icon") return { ...e, color: colors[0]! };
          if (e.type === "shape" && e.fill !== "none") return { ...e, fill: colors[(++shapeIndex) % colors.length]! };
          return e;
        }),
      };
    });

  const libraryCss = useMemo(() => libraryFontCss(), []);
  const zoomBy = (delta: number) => setZoom((z) => Math.max(0.05, Math.min(4, Math.round((z + delta) * 100) / 100)));

  if (!doc) {
    return (
      <div className="grid h-96 place-items-center text-sm text-muted">
        <Loader2 className="size-6 animate-spin" aria-label={t("loading")} />
      </div>
    );
  }

  const panelProps = {
    tab,
    doc,
    measure: canvasMeasure,
    locale,
    projects,
    assets,
    storageOk,
    uploadError,
    onTemplate: (id: TemplateId, w: number, h: number) => startNew(buildTemplate(id, w, h, locale, t(`templates.names.${id}`))),
    onBlank: (w: number, h: number) => startNew(blankDoc(w, h, locale, t("untitled"))),
    onAddChart: (k: ChartKind) => add(createChart(doc, k, ["#500071", "#8A2A78", "#C9A227", "#2A9D8F", "#E76F51", "#264653"])),
    onAddShape: (s: ShapeKind) => add(createShape(doc, s, "#8A2A78")),
    onAddIcon: (name: string) => add(createIcon(doc, name, "#500071")),
    onAddText: (role: TextRole, font?: string) => {
      const el = createText(doc, role, t(`text.presets.${role}`));
      add(font ? { ...el, font } : el);
    },
    onPairing: (heading: string, body: string) => change((d) => ({ ...d, elements: d.elements.map((e) => (e.type === "text" ? { ...e, font: e.role === "title" ? heading : body } : e.type === "chart" ? { ...e, font: body } : e)) })),
    onFontForSelection: (font: string) => {
      if (selected?.type === "text" || selected?.type === "chart") {
        patchSelected({ font } as Partial<El>);
        return true;
      }
      return false;
    },
    onApplyPalette: applyPalette,
    onUpload: (files: FileList) => void handleFiles(files),
    onAddAsset: (a: Asset) => add(createImage(doc, a.src, a.width, a.height)),
    onDeleteAsset: async (id: string) => {
      await deleteAsset(id).catch(() => undefined);
      setAssets(await listAssets().catch(() => []));
    },
    onOpenProject: async (id: string) => {
      const d = await loadProject(id);
      if (d) {
        open(d);
        setSheet(null);
      }
    },
    onDuplicateProject: async (id: string) => {
      const d = id === doc.id ? doc : await loadProject(id);
      if (!d) return;
      const copy = { ...structuredClone(d), id: newId("doc"), name: t("copyOf", { name: d.name }), updatedAt: Date.now() };
      await saveProject(copy);
      open(copy);
      void refreshLists();
    },
    onDeleteProject: async (id: string) => {
      await deleteProject(id);
      if (id === doc.id) open(blankDoc(doc.width, doc.height, locale, t("untitled")));
      void refreshLists();
    },
  };

  const inspector = (
    <Inspector
      doc={doc}
      selected={selected}
      onPatch={patchSelected}
      onDoc={(fn, key) => change(fn, key)}
      onSelect={setSelectedId}
      onDuplicate={duplicate}
      onDelete={remove}
      onLayer={layer}
      onResize={(w, h) => change((d) => resizeDoc(d, w, h), "canvas-size")}
      onReplaceImage={(f) => selected && void handleFiles([f], selected.id)}
      textRef={textRef}
    />
  );


  const toolButton = "inline-flex size-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2 disabled:opacity-40";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-surface" : "flex h-[calc(100dvh-140px)] max-h-[900px] min-h-[600px] flex-col overflow-hidden rounded-xl border border-border bg-surface"} data-testid="chart-designer">
      <style>{libraryCss}</style>
      {/* Top toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <input className="input hidden h-9 w-48 py-1 text-sm font-semibold md:block" aria-label={t("toolbar.name")} value={doc.name} onChange={(e) => change((d) => ({ ...d, name: e.target.value }), "doc-name")} />
        <span className="hidden items-center gap-1 px-2 text-xs text-muted lg:flex" aria-live="polite">
          {saveState === "saving" ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <Check className="size-3" aria-hidden="true" />}
          {saveState === "error" ? t("toolbar.saveFailed") : storageOk ? (saveState === "saving" ? t("toolbar.saving") : t("toolbar.saved")) : t("toolbar.notSaved")}
        </span>
        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <button type="button" className={toolButton} onClick={() => setHist((h) => (h ? undo(h) : h))} disabled={!hist?.past.length} aria-label={t("toolbar.undo")} title={`${t("toolbar.undo")} (Ctrl+Z)`}>
          <Undo2 className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        <button type="button" className={toolButton} onClick={() => setHist((h) => (h ? redo(h) : h))} disabled={!hist?.future.length} aria-label={t("toolbar.redo")} title={`${t("toolbar.redo")} (Ctrl+Y)`}>
          <Redo2 className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <button type="button" className={toolButton} onClick={() => zoomBy(-0.1)} aria-label={t("toolbar.zoomOut")}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className="h-9 min-w-14 rounded-lg px-1 text-xs font-semibold tabular-nums hover:bg-surface-2" onClick={fit} title={t("toolbar.fit")} aria-label={t("toolbar.zoomLevel", { percent: Math.round(zoom * 100) })}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className={toolButton} onClick={() => zoomBy(0.1)} aria-label={t("toolbar.zoomIn")}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={`${toolButton} hidden sm:inline-flex ${showGrid ? "bg-accent-soft text-accent" : ""}`} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid} aria-label={t("toolbar.grid")} title={t("toolbar.grid")}>
          <Grid3x3 className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={`${toolButton} hidden sm:inline-flex ${snap ? "bg-accent-soft text-accent" : ""}`} onClick={() => setSnap((v) => !v)} aria-pressed={snap} aria-label={t("toolbar.snap")} title={t("toolbar.snap")}>
          <Magnet className="size-4" aria-hidden="true" />
        </button>
        <span className="hidden px-2 text-xs text-muted tabular-nums xl:inline">
          {doc.width} × {doc.height}
        </span>
        <div className="flex-1" />
        <button type="button" className={toolButton} onClick={() => setPreviewing(true)} aria-label={t("toolbar.preview")} title={t("toolbar.preview")}>
          <Eye className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={toolButton} onClick={() => setFullscreen((v) => !v)} aria-pressed={fullscreen} aria-label={fullscreen ? t("toolbar.exitFullscreen") : t("toolbar.fullscreen")} title={fullscreen ? t("toolbar.exitFullscreen") : t("toolbar.fullscreen")}>
          {fullscreen ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
        </button>
        <button type="button" className="btn-primary btn-sm ms-1" onClick={() => setExporting(true)}>
          <Download className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("toolbar.export")}</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: tab rail + panel (desktop) */}
        <nav className="hidden w-[76px] shrink-0 flex-col gap-1 border-e border-border p-1.5 lg:flex" aria-label={t("panels")}>
          {TABS.map((id) => {
            const Icon = TAB_ICONS[id];
            return (
              <button key={id} type="button" aria-pressed={tab === id} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium ${tab === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`} onClick={() => setTab(id)}>
                <Icon className="size-5" aria-hidden="true" />
                {t(`tabs.${id}`)}
              </button>
            );
          })}
        </nav>
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-e border-border p-3 lg:block" aria-label={t(`tabs.${tab}`)}>
          <LeftPanel {...panelProps} />
        </aside>

        {/* Centre: canvas */}
        <main ref={viewport} className="relative min-w-0 flex-1 overflow-auto bg-surface-2" onPointerDown={(e) => e.target === e.currentTarget && setSelectedId(null)}>
          <div className="grid min-h-full min-w-full place-items-center p-6" style={{ width: "max-content", height: "max-content" }} onPointerDown={(e) => e.target === e.currentTarget && setSelectedId(null)}>
            <Canvas
              doc={doc}
              measure={canvasMeasure}
              zoom={zoom}
              selectedId={selectedId}
              showGrid={showGrid}
              snap={snap}
              gridSize={Math.max(5, Math.round(Math.min(doc.width, doc.height) / 54))}
              onSelect={(id) => {
                setSelectedId(id);
                if (id && sheet && sheet !== "edit") setSheet(null);
              }}
              onChange={(fn, key) => change(fn, key)}
              onEditText={() => {
                setSheet("edit");
                setTimeout(() => textRef.current?.focus(), 50);
              }}
              onZoom={zoomBy}
              fontsVersion={fontsVersion}
            />
          </div>
        </main>

        {/* Right: properties (desktop) */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-s border-border p-3 lg:block" aria-label={t("properties")}>
          {inspector}
        </aside>
      </div>

      {/* Mobile: bottom bar + sheets */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-t border-border bg-surface p-1 lg:hidden" aria-label={t("panels")}>
        <button type="button" className={`flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium ${sheet === "edit" ? "bg-accent text-accent-fg" : selected ? "bg-accent-soft text-accent" : "text-muted"}`} onClick={() => setSheet(sheet === "edit" ? null : "edit")}>
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {selected ? t("mobile.edit") : t("mobile.design")}
        </button>
        {TABS.map((id) => {
          const Icon = TAB_ICONS[id];
          return (
            <button key={id} type="button" className={`flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium ${sheet === id ? "bg-accent text-accent-fg" : "text-muted"}`} onClick={() => setSheet(sheet === id ? null : id)}>
              <Icon className="size-5" aria-hidden="true" />
              {t(`tabs.${id}`)}
            </button>
          );
        })}
      </nav>
      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-[55] flex max-h-[60dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl lg:hidden" role="dialog" aria-label={sheet === "edit" ? t("properties") : t(`tabs.${sheet}`)}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-semibold">{sheet === "edit" ? t("properties") : t(`tabs.${sheet}`)}</span>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSheet(null)} aria-label={t("mobile.close")}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">{sheet === "edit" ? inspector : <LeftPanel {...panelProps} tab={sheet} />}</div>
        </div>
      )}

      {previewing && <PreviewOverlay doc={doc} onClose={() => setPreviewing(false)} onExport={() => (setPreviewing(false), setExporting(true))} />}
      {exporting && (
        <ExportDialog
          doc={doc}
          measure={canvasMeasure}
          onClose={() => setExporting(false)}
          onDownloaded={(format) => {
            events.downloaded(format);
            events.complete({ action: "export", format });
          }}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {selected ? t("selectedAnnouncement", { type: t(`layers.${selected.type}`) }) : ""}
      </span>
    </div>
  );
}

function PreviewOverlay({ doc, onClose, onExport }: { doc: Doc; onClose: () => void; onExport: () => void }) {
  const t = useTranslations("designer");
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth - 48, h: window.innerHeight - 120 });
    update();
    window.addEventListener("resize", update);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const k = Math.min(size.w / doc.width, size.h / doc.height, 1.5);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 p-6" role="dialog" aria-modal="true" aria-label={t("toolbar.preview")}>
      <div className="shadow-2xl">
        <DocSvg doc={doc} measure={canvasMeasure} displayWidth={doc.width * k} displayHeight={doc.height * k} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onClose} autoFocus>
          <X className="size-4" aria-hidden="true" />
          {t("toolbar.closePreview")}
        </button>
        <button type="button" className="btn-primary" onClick={onExport}>
          <Download className="size-4" aria-hidden="true" />
          {t("toolbar.export")}
        </button>
      </div>
    </div>
  );
}

