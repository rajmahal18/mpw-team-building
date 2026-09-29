"use client";

import { useEffect, useState } from "react";
import { ParticipantStatusBar, useLowBandwidthPreference } from "./ParticipantStatusBar";
import { flushOutbox, newMutationId, queueMediaSubmission, queueSubmission } from "./outbox";
import { prepareParticipantFile } from "./media";
import { saveActivitySnapshot } from "./offline-cache";

type Localized = { default: string };
type Choice = { id: string; label?: Localized; mediaAssetId?: string };
type Item = { id: string; label?: Localized; mediaAssetId?: string };
type MatchItem = { id: string; label: Localized };
type ParticipantBlock = {
  id: string;
  type: string;
  title?: Localized;
  required?: boolean;
  body?: Localized;
  prompt?: Localized;
  intro?: Localized;
  hint?: Localized;
  unit?: string;
  choices?: Choice[];
  selection?: { min?: number; max?: number };
  items?: Item[];
  leftItems?: MatchItem[];
  rightItems?: MatchItem[];
  questions?: ParticipantBlock[];
  acceptedKinds?: string[];
  minItems?: number;
  maxItems?: number;
  requireMarshalReview?: boolean;
  mediaAssetId?: string;
  mediaKind?: string;
  caption?: Localized;
  options?: Array<{ id: string; label: Localized }>;
  maxLength?: number;
  timeLimitMs?: number;
  maxAttempts?: number;
};

type Projection = { title: Localized; description?: Localized; content: ParticipantBlock[]; timing?: { mode?: string; durationMs?: number }; safety?: { notes?: string[] }; accessibility?: { notes?: string[] } };
type BlockStatus = "idle" | "saving" | "queued" | "synced" | "error";

export function ParticipantActivity(props: {
  eventId: string;
  eventSlug: string;
  activityRunId: string;
  activityTitle: string;
  projection: unknown;
  completedBlockIds: string[];
  existingMedia: Array<{ id: string; blockId: string | null; kind: string; moderationStatus: string }>;
  runState: string;
  offlineRecovery?: boolean;
}) {
  const definition = props.projection as Projection;
  const [status, setStatus] = useState<Record<string, BlockStatus>>(() => Object.fromEntries(props.completedBlockIds.map((id) => [id, "synced"])));
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [lowBandwidth] = useLowBandwidthPreference();
  useEffect(() => {
    if (props.offlineRecovery) return;
    void saveActivitySnapshot({ eventId: props.eventId, eventSlug: props.eventSlug, activityRunId: props.activityRunId, activityTitle: props.activityTitle, projection: props.projection, completedBlockIds: props.completedBlockIds, existingMedia: props.existingMedia, runState: props.runState }).catch(() => undefined);
  }, [props.eventId, props.eventSlug, props.activityRunId, props.activityTitle, props.projection, props.completedBlockIds, props.existingMedia, props.runState, props.offlineRecovery]);

  const submit = async (blockId: string, payload: unknown) => {
    const idempotencyKey = newMutationId(`submit:${props.activityRunId}:${blockId}`);
    setStatus((current) => ({ ...current, [blockId]: "saving" }));
    try {
      await queueSubmission({ eventId: props.eventId, activityRunId: props.activityRunId, blockId, payload, idempotencyKey });
      setStatus((current) => ({ ...current, [blockId]: navigator.onLine ? "saving" : "queued" }));
      setMessages((current) => ({ ...current, [blockId]: navigator.onLine ? "Sending…" : "Saved on this device. It will sync when signal returns." }));
      if (navigator.onLine) {
        const result = await flushOutbox();
        if (result.remaining === 0) {
          setStatus((current) => ({ ...current, [blockId]: "synced" }));
          setMessages((current) => ({ ...current, [blockId]: "Submitted." }));
        } else {
          setStatus((current) => ({ ...current, [blockId]: "queued" }));
          setMessages((current) => ({ ...current, [blockId]: result.lastError || "Saved locally and waiting to sync." }));
        }
      }
    } catch (error) {
      setStatus((current) => ({ ...current, [blockId]: "error" }));
      setMessages((current) => ({ ...current, [blockId]: error instanceof Error ? error.message : "Unable to save this answer" }));
    }
  };

  const submitMedia = async (block: ParticipantBlock, files: FileList | null) => {
    if (!files?.length) return;
    const chosen = Array.from(files).slice(0, block.maxItems ?? 1);
    setStatus((current) => ({ ...current, [block.id]: "saving" }));
    try {
      const prepared = await Promise.all(chosen.map((file) => prepareParticipantFile(file, lowBandwidth)));
      const idempotencyKey = newMutationId(`media:${props.activityRunId}:${block.id}`);
      await queueMediaSubmission({ eventId: props.eventId, activityRunId: props.activityRunId, blockId: block.id, idempotencyKey, files: prepared });
      setStatus((current) => ({ ...current, [block.id]: navigator.onLine ? "saving" : "queued" }));
      setMessages((current) => ({ ...current, [block.id]: navigator.onLine ? "Uploading…" : "Media proof saved on this device. Keep this browser data until it syncs." }));
      if (navigator.onLine) {
        const result = await flushOutbox();
        setStatus((current) => ({ ...current, [block.id]: result.remaining === 0 ? "synced" : "queued" }));
        setMessages((current) => ({ ...current, [block.id]: result.remaining === 0 ? "Media proof submitted." : result.lastError || "Upload will retry later." }));
      }
    } catch (error) {
      setStatus((current) => ({ ...current, [block.id]: "error" }));
      setMessages((current) => ({ ...current, [block.id]: error instanceof Error ? error.message : "Unable to save media proof" }));
    }
  };

  return <main className="participant-field participant-play">
    <ParticipantStatusBar />
    {props.offlineRecovery && <section className="notice"><strong>Offline copy</strong><span>Submissions will stay on this device until connection returns.</span></section>}
    <section className="participant-hero">
      <span className="badge">{props.runState.replaceAll("_", " ").toLowerCase()}</span>
      <h1>{definition.title?.default || props.activityTitle}</h1>
      {definition.description?.default && <p>{definition.description.default}</p>}
      {definition.timing?.mode && definition.timing.mode !== "NONE" && <small className="muted">Timing: {definition.timing.mode.toLowerCase().replaceAll("_", " ")}{definition.timing.durationMs ? ` · ${Math.round(definition.timing.durationMs / 1000)}s` : ""}</small>}
    </section>

    {definition.safety?.notes?.length ? <section className="notice participant-safety"><strong>Safety</strong>{definition.safety.notes.map((note) => <span key={note}>{note}</span>)}</section> : null}

    {props.runState !== "IN_PROGRESS" && <section className="notice"><strong>Submissions are closed for this run.</strong><span>The organizer controls when this activity accepts answers.</span></section>}
    <div className="participant-task-list">
      {definition.content.map((block, index) => <ParticipantBlockCard key={block.id} block={block} index={index} statusById={status} messagesById={messages} onSubmit={submit} onMedia={submitMedia} lowBandwidth={lowBandwidth} runWritable={props.runState === "IN_PROGRESS"} />)}
    </div>

    <section className="card compact-card"><a className="button secondary" href={`/e/${props.eventSlug}`}>Back to event progress</a></section>
  </main>;
}

function ParticipantBlockCard({ block, index, statusById, messagesById, onSubmit, onMedia, lowBandwidth, runWritable }: {
  block: ParticipantBlock; index: number; statusById: Record<string, BlockStatus>; messagesById: Record<string, string>; onSubmit: (id: string, payload: unknown) => Promise<void>; onMedia: (block: ParticipantBlock, files: FileList | null) => Promise<void>; lowBandwidth: boolean; runWritable: boolean;
}) {
  const status = statusById[block.id] ?? "idle";
  const message = messagesById[block.id];
  if (block.type === "question_pool") return <section className="participant-pool"><div className="participant-section-label">{block.intro?.default || "Questions"}</div>{(block.questions ?? []).map((question, qIndex) => <ParticipantBlockCard key={question.id} block={question} index={qIndex} statusById={statusById} messagesById={messagesById} onSubmit={onSubmit} onMedia={onMedia} lowBandwidth={lowBandwidth} runWritable={runWritable}/>)}</section>;
  if (block.type === "rich_text") return <section className="participant-task passive"><TaskHead block={block} index={index}/><p>{block.body?.default}</p></section>;
  if (block.type === "media_display") return <section className="participant-task passive"><TaskHead block={block} index={index}/>{!lowBandwidth || block.mediaKind === "IMAGE" ? <MediaPreview assetId={block.mediaAssetId} kind={block.mediaKind} caption={block.caption?.default}/> : <p className="muted">Low-data mode is on. Open this media only if needed.</p>}</section>;
  if (["manual_metric", "marshal_decision", "judge_rubric"].includes(block.type)) return <section className="participant-task passive"><TaskHead block={block} index={index}/><p>{block.prompt?.default || "This step is completed by the marshal or judge."}</p><span className="badge">Staff action</span></section>;
  return <InteractiveBlock block={block} index={index} status={status} message={message} onSubmit={onSubmit} onMedia={onMedia} runWritable={runWritable}/>;
}

function TaskHead({ block, index }: { block: ParticipantBlock; index: number }) {
  return <div className="participant-task-head"><span className="task-number">{index + 1}</span><div><small>{block.type.replaceAll("_", " ")}{block.required ? " · required" : ""}</small>{block.title?.default && <strong>{block.title.default}</strong>}</div></div>;
}

function InteractiveBlock({ block, index, status, message, onSubmit, onMedia, runWritable }: { block: ParticipantBlock; index: number; status: BlockStatus; message?: string; onSubmit: (id: string, payload: unknown) => Promise<void>; onMedia: (block: ParticipantBlock, files: FileList | null) => Promise<void>; runWritable: boolean }) {
  const disabled = !runWritable || status === "saving" || status === "synced";
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>(() => (block.items ?? []).map((item) => item.id));
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);
  const prompt = block.prompt?.default || block.title?.default || "Complete this task";
  const submitPayload = async () => {
    if (block.type === "single_select") return onSubmit(block.id, { choiceId: selected[0] || "" });
    if (block.type === "multi_select") return onSubmit(block.id, { choiceIds: selected });
    if (["text_input", "textarea", "fill_blank"].includes(block.type)) return onSubmit(block.id, { value: text });
    if (block.type === "number_input") return onSubmit(block.id, { value: Number(text) });
    if (block.type === "ordering") return onSubmit(block.id, { orderedIds: order });
    if (block.type === "matching") return onSubmit(block.id, { pairs: (block.leftItems ?? []).map((item) => ({ leftId: item.id, rightId: pairs[item.id] || "" })) });
    if (block.type === "acknowledge") return onSubmit(block.id, { acknowledged: true });
  };
  return <section className={`participant-task interactive ${status === "synced" ? "task-done" : ""}`}>
    <TaskHead block={block} index={index}/>
    <h2>{prompt}</h2>
    <div className="tag-row">{block.timeLimitMs ? <span className="tag">{Math.round(block.timeLimitMs / 1000)} sec</span> : null}{block.maxAttempts ? <span className="tag">{block.maxAttempts} attempt{block.maxAttempts === 1 ? "" : "s"}</span> : null}</div>
    {block.hint && <div><button type="button" className="text-button" onClick={() => setShowHint((value) => !value)}>{showHint ? "Hide hint" : "Show hint"}</button>{showHint && <div className="notice"><span>{block.hint.default}</span></div>}</div>}
    {block.type === "single_select" && <div className="participant-options">{(block.choices ?? []).map((choice) => <label key={choice.id} className={`participant-option ${selected.includes(choice.id) ? "selected" : ""}`}><input type="radio" name={block.id} disabled={disabled} checked={selected[0] === choice.id} onChange={() => setSelected([choice.id])}/><span>{choice.label?.default || "Media choice"}</span></label>)}</div>}
    {block.type === "multi_select" && <div className="participant-options">{(block.choices ?? []).map((choice) => <label key={choice.id} className={`participant-option ${selected.includes(choice.id) ? "selected" : ""}`}><input type="checkbox" disabled={disabled} checked={selected.includes(choice.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, choice.id] : selected.filter((id) => id !== choice.id))}/><span>{choice.label?.default || "Media choice"}</span></label>)}</div>}
    {(["text_input", "fill_blank"].includes(block.type)) && <input disabled={disabled} maxLength={block.maxLength} value={text} onChange={(event) => setText(event.target.value)} placeholder="Your answer"/>}
    {block.type === "textarea" && <textarea disabled={disabled} maxLength={block.maxLength} value={text} onChange={(event) => setText(event.target.value)} placeholder="Your answer"/>}
    {block.type === "number_input" && <label>Answer{block.unit ? ` (${block.unit})` : ""}<input disabled={disabled} type="number" step="any" value={text} onChange={(event) => setText(event.target.value)}/></label>}
    {block.type === "ordering" && <div className="participant-order">{order.map((id, orderIndex) => { const item = (block.items ?? []).find((candidate) => candidate.id === id); return <div className="participant-order-row" key={id}><span className="task-number">{orderIndex + 1}</span><strong>{item?.label?.default || "Item"}</strong><div className="row"><button type="button" className="icon-button" disabled={disabled || orderIndex === 0} onClick={() => setOrder(move(order, orderIndex, -1))}>↑</button><button type="button" className="icon-button" disabled={disabled || orderIndex === order.length - 1} onClick={() => setOrder(move(order, orderIndex, 1))}>↓</button></div></div>; })}</div>}
    {block.type === "matching" && <div className="stack">{(block.leftItems ?? []).map((left) => <label key={left.id}>{left.label.default}<select disabled={disabled} value={pairs[left.id] ?? ""} onChange={(event) => setPairs((current) => ({ ...current, [left.id]: event.target.value }))}><option value="">Choose match</option>{(block.rightItems ?? []).map((right) => <option value={right.id} key={right.id}>{right.label.default}</option>)}</select></label>)}</div>}
    {block.type === "media_submission" && <div className="media-submit"><input disabled={disabled} type="file" accept={acceptForKinds(block.acceptedKinds ?? [])} multiple={(block.maxItems ?? 1) > 1} capture={(block.acceptedKinds ?? []).includes("IMAGE") ? "environment" : undefined} onChange={(event) => void onMedia(block, event.currentTarget.files)}/><small className="muted">{block.minItems ?? 1}–{block.maxItems ?? 1} file(s){block.requireMarshalReview ? " · marshal review required" : ""}</small></div>}
    {block.type !== "media_submission" && <button type="button" disabled={disabled} onClick={() => void submitPayload()}>{status === "saving" ? "Saving…" : status === "synced" ? "Submitted ✓" : status === "queued" ? "Saved offline ✓" : block.type === "acknowledge" ? "I understand" : "Submit"}</button>}
    {message && <p className={`submission-message ${status === "error" ? "error" : "muted"}`}>{message}</p>}
  </section>;
}

function MediaPreview({ assetId, kind, caption }: { assetId?: string; kind?: string; caption?: string }) {
  if (!assetId) return <p className="muted">Media unavailable.</p>;
  const src = `/api/media/${encodeURIComponent(assetId)}`;
  if (kind === "IMAGE") return <figure className="participant-media"><img src={src} alt={caption || "Activity media"}/>{caption && <figcaption>{caption}</figcaption>}</figure>;
  if (kind === "AUDIO") return <audio controls preload="metadata" src={src}/>;
  if (kind === "VIDEO") return <video controls preload="metadata" src={src}/>;
  return <a className="button secondary" href={src} target="_blank" rel="noreferrer">Open file</a>;
}

function move(values: string[], index: number, delta: -1 | 1) { const target = index + delta; if (target < 0 || target >= values.length) return values; const next = [...values]; [next[index], next[target]] = [next[target], next[index]]; return next; }
function acceptForKinds(kinds: string[]) { const values = kinds.flatMap((kind) => kind === "IMAGE" ? ["image/*"] : kind === "VIDEO" ? ["video/*"] : kind === "AUDIO" ? ["audio/*"] : ["application/pdf", ".doc", ".docx"]); return values.join(","); }
