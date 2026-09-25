"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, GripVertical, ImagePlus, Minus, Mountain, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

type Review = { effort: number; achievement: number; note: string; image?: string };
type Stone = { id: string; action: string; weight: number; outcome: string; done: boolean; review: Review };
type DayData = { bigStone: string; finishLine: string; stones: Stone[]; freeStones: Stone[]; starterAction: string };
type SavedDays = Record<string, DayData>;

const STORAGE_KEY = "shitouji-v01-days";
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const blankReview = (): Review => ({ effort: 0, achievement: 0, note: "" });
const newStone = (overrides: Partial<Stone> = {}): Stone => ({ id: uid(), action: "", weight: 1, outcome: "", done: false, review: blankReview(), ...overrides });
const emptyDay = (): DayData => ({ bigStone: "", finishLine: "", stones: [newStone()], freeStones: [], starterAction: "" });
const dateKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
const todayKey = () => dateKey(new Date());
const displayDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const prefix = value === todayKey() ? "今天" : value === dateKey(yesterday) ? "昨天" : "";
  return `${prefix ? `${prefix} · ` : ""}${date.getMonth() + 1}月${date.getDate()}日 周${"日一二三四五六"[date.getDay()]}`;
};
const shiftDate = (value: string, amount: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return dateKey(date); };

const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
  const source = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const maxEdge = 1440;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) { URL.revokeObjectURL(source); reject(new Error("canvas unavailable")); return; }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/webp", 0.8);
    URL.revokeObjectURL(source);
    resolve(compressed);
  };
  image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("image decode failed")); };
  image.src = source;
});

function StarRating({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return <div className="rating-row"><span>{label}</span><div className="stars" role="radiogroup" aria-label={`${label}评分`}>
    {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" className={score <= value ? "star active" : "star"} onClick={() => onChange(score === value ? 0 : score)} aria-label={`${score}星`} aria-checked={score === value} role="radio"><Star aria-hidden="true" /></button>)}
  </div></div>;
}

function ReviewPanel({ stone, onReview }: { stone: Stone; onReview: (patch: Partial<Review>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file?: File) => {
    if (!file?.type.startsWith("image/")) return;
    try { onReview({ image: await compressImage(file) }); } catch { /* keep the existing image if compression fails */ }
    if (fileRef.current) fileRef.current.value = "";
  };
  return <div className="review-panel" onClick={(event) => event.stopPropagation()}>
    <div className="review-title"><div><span className="eyebrow">可选记录</span><strong>想记下这次的感受吗？</strong></div><span className="earned">+{stone.weight} 石头值</span></div>
    <StarRating label="投入程度" value={stone.review.effort} onChange={(effort) => onReview({ effort })} />
    <StarRating label="成就感" value={stone.review.achievement} onChange={(achievement) => onReview({ achievement })} />
    <textarea value={stone.review.note} onChange={(event) => onReview({ note: event.target.value })} placeholder="写下一句话，留给以后的自己…" aria-label="文字记录" />
    <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
    {stone.review.image ? <div className="image-preview">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={stone.review.image} alt="阶段成果预览" /><button type="button" onClick={() => onReview({ image: undefined })} aria-label="移除图片"><X /></button></div> : <button className="upload-button" type="button" onClick={() => fileRef.current?.click()}><ImagePlus /> 上传照片 / 截图</button>}
  </div>;
}

function StoneRow({ stone, index, kind, isNext, expanded, onExpand, onPatch, onDelete, onComplete }: { stone: Stone; index: number; kind: "big" | "free"; isNext?: boolean; expanded: boolean; onExpand: () => void; onPatch: (patch: Partial<Stone>) => void; onDelete: () => void; onComplete: (checked: boolean) => void }) {
  return <article className={`stone-row ${stone.done ? "is-done" : ""} ${isNext ? "is-next" : ""}`}>
    <div className="stone-main">
      <div className="stone-check"><Checkbox checked={stone.done} onCheckedChange={(checked) => onComplete(Boolean(checked))} aria-label={`${stone.action || `第${index + 1}块小石头`}完成`} /><span>{index + 1}</span></div>
      <div className="stone-fields"><input className="action-input" value={stone.action} onChange={(event) => onPatch({ action: event.target.value })} placeholder={kind === "big" ? "要完成的动作" : "记录一件有意义的事"} aria-label="动作" />{kind === "big" && <input value={stone.outcome} onChange={(event) => onPatch({ outcome: event.target.value })} placeholder="阶段成果（例如：一份可录制脚本）" aria-label="阶段成果" />}</div>
      <div className="weight-picker" role="group" aria-label="石头重量"><div className="weight-stepper"><button type="button" onClick={() => onPatch({ weight: stone.weight - 1 })} disabled={stone.weight <= 1} aria-label="减轻重量"><Minus /></button><output aria-label={`当前重量 ${stone.weight}`}>{stone.weight}</output><button type="button" onClick={() => onPatch({ weight: stone.weight + 1 })} disabled={stone.weight >= 5} aria-label="增加重量"><Plus /></button></div></div>
      <div className="stone-actions">{stone.done && <button className="icon-button review-toggle" type="button" onClick={onExpand} aria-label="展开评价"><ChevronDown className={expanded ? "rotate" : ""} /></button>}<button className="icon-button delete" type="button" onClick={onDelete} aria-label="删除小石头"><Trash2 /></button></div>
    </div>
    {isNext && !stone.done && <span className="next-label">下一块</span>}
    {expanded && stone.done && <ReviewPanel stone={stone} onReview={(review) => onPatch({ review: { ...stone.review, ...review } })} />}
  </article>;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [days, setDays] = useState<SavedDays>({});
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<"small" | "big" | null>(null);
  const [notice, setNotice] = useState("");
  const day = days[selectedDate] ?? emptyDay();
  const totalWeight = day.stones.reduce((sum, stone) => sum + stone.weight, 0);
  const completedWeight = day.stones.filter((stone) => stone.done).reduce((sum, stone) => sum + stone.weight, 0);
  const freeWeight = day.freeStones.filter((stone) => stone.done).reduce((sum, stone) => sum + stone.weight, 0);
  const completedCount = [...day.stones, ...day.freeStones].filter((stone) => stone.done).length;
  const progress = totalWeight ? Math.round((completedWeight / totalWeight) * 100) : 0;
  const nextStone = day.stones.find((stone) => !stone.done);
  const history = useMemo(() => [...new Set(Object.values(days).map((saved) => saved.bigStone.trim()).filter(Boolean))].slice(-6).reverse(), [days]);

  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setDays(JSON.parse(saved)); } catch { setNotice("本机记录读取失败，请检查浏览器存储权限。"); } finally { setHydrated(true); } }, []);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(days)); } catch { setNotice("照片可能过大，本次修改暂时无法保存。"); } }, [days, hydrated]);
  useEffect(() => { if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js"); }, []);

  const updateDay = (updater: (current: DayData) => DayData) => setDays((current) => ({ ...current, [selectedDate]: updater(current[selectedDate] ?? emptyDay()) }));
  const updateStone = (kind: "stones" | "freeStones", id: string, patch: Partial<Stone>) => updateDay((current) => ({ ...current, [kind]: current[kind].map((stone) => stone.id === id ? { ...stone, ...patch } : stone) }));
  const removeStone = (kind: "stones" | "freeStones", id: string) => { updateDay((current) => ({ ...current, [kind]: current[kind].filter((stone) => stone.id !== id) })); if (expanded === id) setExpanded(null); };
  const completeStone = (kind: "stones" | "freeStones", stone: Stone, checked: boolean) => {
    updateStone(kind, stone.id, { done: checked });
    if (!checked) { setExpanded(null); return; }
    setExpanded(stone.id);
    const willFinishBig = kind === "stones" && day.stones.every((item) => item.id === stone.id || item.done);
    setCelebration(willFinishBig ? "big" : "small");
    window.setTimeout(() => setCelebration(null), willFinishBig ? 2400 : 1200);
  };
  const addStone = (kind: "stones" | "freeStones") => updateDay((current) => ({ ...current, [kind]: [...current[kind], newStone()] }));
  const checkBreakdown = () => {
    const issues: string[] = [];
    if (!day.bigStone.trim()) issues.push("先写下今天的大石头");
    if (!day.finishLine.trim()) issues.push("补充明确的完成标准");
    if (day.stones.some((stone) => !stone.action.trim())) issues.push("有小石头还没有动作");
    if (day.stones.some((stone) => !stone.outcome.trim())) issues.push("有阶段成果还没写清楚");
    setNotice(issues.length ? `占位检查：${issues.join("；")}。` : "占位检查：拆分已经很清楚。真实 AI 检查将在下一版接入。");
  };

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    try { void Promise.resolve(modelContext.registerTool({
      name: "add_small_stone", title: "添加小石头", description: "为当前日期的大石头添加一个行动步骤。",
      inputSchema: { type: "object", properties: { action: { type: "string" }, weight: { type: "integer", minimum: 1, maximum: 5 }, outcome: { type: "string" } }, required: ["action", "weight"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => { const value = input as { action?: unknown; weight?: unknown; outcome?: unknown }; if (typeof value.action !== "string" || !value.action.trim() || !Number.isInteger(value.weight) || Number(value.weight) < 1 || Number(value.weight) > 5) throw new Error("请提供动作和 1–5 的重量"); const stone = newStone({ action: value.action.trim(), weight: Number(value.weight), outcome: typeof value.outcome === "string" ? value.outcome : "" }); updateDay((current) => ({ ...current, stones: [...current.stones, stone] })); return { id: stone.id, added: true }; },
    }, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* unsupported preview context */ }
    return () => lifecycle.abort();
  }, [selectedDate]);

  if (!hydrated) return <main className="loading-screen">正在搬来今天的石头…</main>;
  return <main className="app-shell" onClick={() => expanded && setExpanded(null)}>
    <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
    <header className="topbar"><div className="brand"><span className="brand-mark"><Mountain /></span><div><strong>石头记</strong><span>先放进最重要的那一块</span></div></div><div className="date-nav"><button type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="前一天"><ChevronLeft /></button><label><CalendarDays /><span>{displayDate(selectedDate)}</span><input type="date" value={selectedDate} max={todayKey()} onChange={(event) => setSelectedDate(event.target.value)} aria-label="选择日期" /></label><button type="button" disabled={selectedDate >= todayKey()} onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="后一天"><ChevronRight /></button></div></header>
    <div className="page-grid"><section className="workspace">
      <div className="section-heading"><div><span className="step-number">01</span><h1>今天最重要的大石头是什么？</h1></div><span className="autosave"><Check /> 已保存在本机</span></div>
      <div className="big-stone-card"><input className="big-stone-input" value={day.bigStone} onChange={(event) => updateDay((current) => ({ ...current, bigStone: event.target.value }))} placeholder="例如：完成并发布一条 AI 视频" aria-label="今天的大石头" />
        {history.length > 0 && <div className="history-row"><span>最近写过</span>{history.map((item) => <button type="button" key={item} onClick={() => updateDay((current) => ({ ...current, bigStone: item }))}>{item}</button>)}</div>}
        <div className="finish-line"><span>做到什么程度，算完成？</span><input value={day.finishLine} onChange={(event) => updateDay((current) => ({ ...current, finishLine: event.target.value }))} placeholder="写下一个看得见、能验证的结果" aria-label="完成标准" /></div>
        <div className="big-progress"><div className="progress-copy"><div><span>大石头进度</span><strong>{completedWeight}<small> / {totalWeight || 0}</small></strong></div><span>{progress === 100 && totalWeight > 0 ? "已经放进去了" : progress > 0 ? "正在推进" : "还没有开始搬"}</span></div><Progress value={progress} aria-label={`大石头进度 ${progress}%`} /></div>
      </div>
      <div className="section-heading compact"><div><span className="step-number">02</span><h2>把它拆成能动手的小石头</h2></div><button type="button" className="ai-placeholder" onClick={checkBreakdown}><Sparkles /> 帮我检查拆分</button></div>
      <div className="stone-table-labels" aria-hidden="true"><span>序号</span><span>动作 / 阶段成果</span><span>重量 1–5</span><span /></div>
      <div className="mobile-weight-hint" aria-hidden="true">重量 1–5</div>
      <div className="stone-list" onClick={(event) => event.stopPropagation()}>{day.stones.map((stone, index) => <StoneRow key={stone.id} stone={stone} index={index} kind="big" isNext={stone.id === nextStone?.id} expanded={expanded === stone.id} onExpand={() => setExpanded(expanded === stone.id ? null : stone.id)} onPatch={(patch) => updateStone("stones", stone.id, patch)} onDelete={() => removeStone("stones", stone.id)} onComplete={(checked) => completeStone("stones", stone, checked)} />)}</div>
      <button className="add-button" type="button" onClick={() => addStone("stones")}><CirclePlus /> 添加一块小石头</button>
      {nextStone && <div className="starter-card"><span className="starter-icon"><GripVertical /></span><div><strong>现在先做什么？</strong></div><input value={day.starterAction || ""} onChange={(event) => updateDay((current) => ({ ...current, starterAction: event.target.value }))} placeholder="例如：打开文档，先写第一句话" aria-label="现在先做什么" /></div>}
      <div className="free-section"><div className="section-heading compact"><div><span className="step-number mint">03</span><div><h2>今日自由小石头</h2><p>记录临时完成、但同样有意义的事</p></div></div></div>
        <div className="stone-list free-list" onClick={(event) => event.stopPropagation()}>{day.freeStones.length === 0 && <button className="empty-free" type="button" onClick={() => addStone("freeStones")}><span><Plus /></span><strong>记录第一块自由小石头</strong><small>健身、读书、主动沟通……都值得被看见</small></button>}{day.freeStones.map((stone, index) => <StoneRow key={stone.id} stone={stone} index={index} kind="free" expanded={expanded === stone.id} onExpand={() => setExpanded(expanded === stone.id ? null : stone.id)} onPatch={(patch) => updateStone("freeStones", stone.id, patch)} onDelete={() => removeStone("freeStones", stone.id)} onComplete={(checked) => completeStone("freeStones", stone, checked)} />)}</div>
        {day.freeStones.length > 0 && <button className="add-button subtle" type="button" onClick={() => addStone("freeStones")}><Plus /> 记录一块自由小石头</button>}
      </div>
    </section><aside className="today-summary"><span className="summary-kicker">TODAY</span><h2>今天搬了多少？</h2><div className="summary-hero"><span>大石头进度</span><strong>{completedWeight}<small> / {totalWeight || 0}</small></strong><Progress value={progress} /><p>{progress === 100 && totalWeight > 0 ? "今天的大石头，放进去了。" : progress > 0 ? "你已经让最重要的事向前了。" : "先碰一下大石头，哪怕只是一小块。"}</p></div><div className="summary-stats"><div><span>今日总石头值</span><strong>{completedWeight + freeWeight}</strong></div><div><span>自由小石头</span><strong>{freeWeight}</strong></div><div><span>完成块数</span><strong>{completedCount}<small> 块</small></strong></div></div><div className="jar" aria-label="今日完成石头可视化"><div className="jar-rim" /><div className="pebbles">{Array.from({ length: Math.min(completedCount, 12) }).map((_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div><span>每一块都算数</span></div><p className="summary-note">总分记录你做了多少；大石头进度提醒你，最重要的事有没有真正向前。</p></aside></div>
    {notice && <div className="notice" role="status"><Sparkles /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="关闭"><X /></button></div>}
    {celebration && <div className={`celebration ${celebration}`} role="status" aria-live="polite"><div className="falling-stone"><span /></div><strong>{celebration === "big" ? "今天的大石头，放进去了。" : "咚！又搬动了一块。"}</strong><span>{celebration === "big" ? `${completedWeight}/${totalWeight} 石头值全部到位` : "石头值已到账"}</span></div>}
  </main>;
}
