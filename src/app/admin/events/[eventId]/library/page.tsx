import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { addTemplateToEvent, installRecommendedLibrary } from "./actions";

function summarizeDefinition(value: unknown) {
  const definition = ActivityDefinitionSchema.parse(value);
  return {
    participation: definition.participation.mode.replaceAll("_", " "),
    blocks: definition.content.length,
    metrics: definition.metrics.length,
    timing: definition.timing.mode,
    verification: definition.verification.type,
    scored: Boolean(definition.scoring),
  };
}

export default async function ActivityLibraryPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ q?: string; category?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  await requireEventCapability(user.id, eventId, "activities.manage");
  const event = await getPrisma().event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  const filters = await searchParams;
  const allTemplates = await getPrisma().activityTemplate.findMany({ where: { organizationId: event.organizationId, status: "ACTIVE" }, include: { versions: { orderBy: { version: "desc" } } }, orderBy: [{ categoryKey: "asc" }, { name: "asc" }] });
  const q = (filters.q || "").trim().toLowerCase();
  const category = (filters.category || "").trim();
  const categories = [...new Set(allTemplates.map((template) => template.categoryKey).filter(Boolean))] as string[];
  const templates = allTemplates.filter((template) => (!category || template.categoryKey === category) && (!q || [template.name, template.description, template.categoryKey, ...template.tags].filter(Boolean).join(" ").toLowerCase().includes(q)));

  return <main>
    <div className="page-heading"><div><h1>Activity library</h1><p className="muted">Reusable organization-level templates. Adding one to this event creates an independent copy that can be customized safely.</p></div><form action={installRecommendedLibrary}><input type="hidden" name="eventId" value={event.id}/><button>Install / update recommended MPW starters</button></form></div>

    <section className="card"><form method="get" className="row"><input name="q" defaultValue={filters.q ?? ""} placeholder="Search templates, tags, categories…"/><select name="category" defaultValue={category}><option value="">All categories</option>{categories.map((value)=><option key={value} value={value}>{value}</option>)}</select><button className="secondary">Filter</button></form></section>

    {allTemplates.length === 0 ? <section className="card"><h2>Library is empty</h2><p>Install the recommended starter library, then organizers can also save event activities back into the organization library.</p></section> : templates.length === 0 ? <section className="card"><p>No templates match the current filter.</p></section> : <div className="library-grid">{templates.map((template) => {
      const version = template.versions.find((item) => item.id === template.currentVersionId) ?? template.versions[0];
      if (!version) return null;
      const summary = summarizeDefinition(version.definitionJson);
      return <article className="card library-card" key={template.id}>
        <div className="row"><span className="badge">{template.categoryKey || "uncategorized"}</span>{template.isSystem && <span className="badge">MPW starter</span>}</div>
        <h2>{template.name}</h2><p>{template.description || "No description."}</p>
        <div className="tag-row">{template.tags.map((tag)=><span className="tag" key={tag}>{tag}</span>)}</div>
        <dl className="summary-grid"><div><dt>Participation</dt><dd>{summary.participation}</dd></div><div><dt>Blocks</dt><dd>{summary.blocks}</dd></div><div><dt>Timing</dt><dd>{summary.timing}</dd></div><div><dt>Verification</dt><dd>{summary.verification}</dd></div><div><dt>Scored</dt><dd>{summary.scored ? "Yes" : "No"}</dd></div><div><dt>Template</dt><dd>v{version.version}</dd></div></dl>
        <details><summary>Add to this event</summary><form action={addTemplateToEvent} className="stack details-body"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="templateId" value={template.id}/><label>Activity title<input name="title" defaultValue={template.name} required/></label><label>Event activity key<input name="machineKey" defaultValue={template.machineKey} pattern="[a-z0-9_-]+" required/></label><button>Add independent copy</button></form></details>
      </article>;
    })}</div>}
  </main>;
}
