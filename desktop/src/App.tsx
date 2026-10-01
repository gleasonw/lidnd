import { useEffect, useRef, useState } from 'react';
import type { AppData, Campaign, Creature, EncounterPlan, EncounterRun, GameSession, RunParticipant } from './domain';
import { newId, snapshotParticipant, snapshotRun } from './domain';
import { drawSteelPlanDifficulty, nextDrawSteelRound } from './rules';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { NativeSelect } from './components/ui/native-select';
import { Checkbox } from './components/ui/checkbox';
import { Label } from './components/ui/label';
import { AssetImage, AssetPicker } from './components/asset-picker';
import { u } from './ui';

const empty: AppData = { assets: [], campaigns: [], creatures: [], party: [], plans: [], sessions: [], runs: [] };
const now = () => new Date().toISOString();
const samePlanContent = (a: EncounterPlan, b?: EncounterPlan) => Boolean(b) && JSON.stringify({ ...a, updatedAt: '' }) === JSON.stringify({ ...b, updatedAt: '' });

function App() {
  const [data, setData] = useState<AppData>(empty);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading local data…');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [draft, setDraft] = useState<EncounterPlan | null>(null);
  const [libraryTab, setLibraryTab] = useState<'plans' | 'party' | 'creatures' | 'sessions'>('plans');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());

  async function reload() {
    try {
      const next = await window.lidnd.load();
      setData(next);
      setCampaignId(current => current ?? next.campaigns[0]?.id ?? null);
      setMessage('Saved locally');
    } catch (error) { setMessage(`Local save error: ${String(error)}`); }
  }
  useEffect(() => { void reload(); }, []);

  async function commit(action: () => Promise<void>) {
    setMessage('Saving locally…');
    const pending = mutationQueue.current.then(action);
    mutationQueue.current = pending.catch(() => {});
    try { await pending; await reload(); }
    catch (error) { setMessage(`Local save error: ${String(error)}`); }
  }

  useEffect(() => {
    if (!draft?.name.trim() || runId || samePlanContent(draft, data.plans.find(item => item.id === draft.id))) return;
    const timer = setTimeout(() => {
      const payload = { ...draft, updatedAt: now() };
      void commit(async () => {
        await window.lidnd.savePlan(payload);
        setDraft(current => current && samePlanContent(current, payload) ? payload : current);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, data.plans, runId]);

  const campaign = data.campaigns.find(item => item.id === campaignId);
  const plan = data.plans.find(item => item.id === planId);
  const run = data.runs.find(item => item.id === runId);
  const session = data.sessions.find(item => item.id === run?.sessionId);
  const activeSession = data.sessions.find(item => item.campaignId === campaignId && !item.endedAt);
  const party = data.party.filter(item => item.campaignId === campaignId).map(item => data.creatures.find(creature => creature.id === item.creatureId)).filter((item): item is Creature => Boolean(item));
  const availableCreatures = data.creatures.filter(item => campaign && item.system === campaign.system && (!item.campaignId || item.campaignId === campaign.id));
  const tags = [...new Set(data.plans.filter(item => item.campaignId === campaignId).flatMap(item => item.tags))].sort();
  const filteredPlans = data.plans.filter(item => item.campaignId === campaignId && item.name.toLowerCase().includes(search.toLowerCase()) && (!tagFilter || item.tags.includes(tagFilter)));

  function newPlan(): EncounterPlan {
    return { id: newId(), campaignId: campaign!.id, name: '', targetDifficulty: 'standard', notes: '', tags: [], roster: [], reminders: [], referenceAssetIds: [], createdAt: now(), updatedAt: now() };
  }
  function canLeaveDraft() {
    if (!draft) return true;
    const saved = data.plans.find(item => item.id === draft.id);
    if (samePlanContent(draft, saved)) return true;
    if (draft.name.trim()) {
      const payload = { ...draft, updatedAt: now() };
      void commit(() => window.lidnd.savePlan(payload));
      return true;
    }
    return window.confirm('Discard this unnamed plan?');
  }
  function openPlan(value: EncounterPlan) { if (!canLeaveDraft()) return; setPlanId(value.id); setRunId(null); setDraft(structuredClone(value)); }
  function startRun(value: EncounterPlan) {
    if (!activeSession) { setLibraryTab('sessions'); setMessage('Start a session to run this encounter.'); return; }
    const fresh = snapshotRun(value, activeSession, data.creatures, data.party);
    void commit(async () => { await window.lidnd.savePlan({ ...value, updatedAt: now() }); await window.lidnd.saveRun(fresh); setPlanId(value.id); setRunId(fresh.id); });
  }
  function saveRun(value: EncounterRun) { void commit(() => window.lidnd.saveRun(value)); }

  return <div className={u('app-shell')}>
    <aside className={u('sidebar')}>
      <div className={u('brand')}>LiDnD <span>Desktop</span></div>
      <p className={u('sidebar-caption')}>Encounter desk</p>
      <div className={u('sidebar-heading')}><h2>Campaigns</h2><Button aria-label="New campaign" title="New campaign" onClick={() => setShowCampaignForm(value => !value)}>+</Button></div>
      <nav className={u('sidebar-list')} aria-label="Campaigns">{data.campaigns.map(item => <Button key={item.id} className={u(campaignId === item.id ? 'selected' : '')} onClick={() => { if (!canLeaveDraft()) return; setCampaignId(item.id); setPlanId(null); setRunId(null); setDraft(null); setLibraryTab('plans'); }}>{item.name}<small>{item.system === 'drawsteel' ? 'Draw Steel' : 'D&D 5e'}</small></Button>)}</nav>
      {(showCampaignForm || data.campaigns.length === 0) && <CampaignForm onSave={value => void commit(async () => { await window.lidnd.saveCampaign(value); setCampaignId(value.id); setShowCampaignForm(false); setLibraryTab('plans'); })}/>}
      <div className={u('sidebar-bottom')}><span className={u('status-dot')} aria-hidden="true"/><span role="status">{message}</span></div>
    </aside>
    <main>
      {!campaign ? <div className={u('welcome')}><h1>Prepare your next encounter</h1><p>Create a campaign to start building a party and reusable plans. Your work is stored on this computer.</p></div> : <>
        <header className={u('topbar')}><div><p className={u('eyebrow')}>{campaign.system === 'drawsteel' ? 'Draw Steel' : 'D&D 5e 2024'} campaign</p><h1>{campaign.name}</h1><p>{party.length} {party.length === 1 ? 'hero' : 'heroes'} in party · Level {campaign.partyLevel}</p></div><div className={u('topbar-actions')}><Button className={u(`session-pill ${activeSession ? 'live' : ''}`)} onClick={() => setLibraryTab('sessions')}>{activeSession ? `● ${activeSession.name}` : 'No active session'}</Button><label>Party level <Input aria-label="Party level" type="number" min="1" max={campaign.system === 'drawsteel' ? 10 : 20} value={campaign.partyLevel} onChange={event => { const level = Number(event.target.value); if (level >= 1 && level <= (campaign.system === 'drawsteel' ? 10 : 20)) void commit(() => window.lidnd.saveCampaign({ ...campaign, partyLevel: level })); }}/></label></div></header>
        <div className={u('columns')}>
          <section className={u('library')} aria-label="Campaign library">
            <div className={u('library-tabs')} role="tablist" aria-label="Campaign sections">{(['plans', 'party', 'creatures', 'sessions'] as const).map(tab => <Button key={tab} role="tab" aria-selected={libraryTab === tab} className={u(libraryTab === tab ? 'active' : '')} onClick={() => setLibraryTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</Button>)}</div>
            {libraryTab === 'plans' && <div className={u('library-panel')} role="tabpanel"><div className={u('panel-heading')}><div><p className={u('eyebrow')}>Encounter library</p><h2>Plans</h2></div><Button className={u('primary')} onClick={() => { if (!canLeaveDraft()) return; const value = newPlan(); setDraft(value); setPlanId(value.id); setRunId(null); }}>+ New plan</Button></div><Input aria-label="Search plans" placeholder="Search plans by name" value={search} onChange={event => setSearch(event.target.value)}/><NativeSelect aria-label="Filter by tag" value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option value="">All tags</option>{tags.map(tag => <option key={tag}>{tag}</option>)}</NativeSelect>{filteredPlans.length === 0 ? <p className={u('empty-hint')}>{search || tagFilter ? 'No plans match these filters.' : 'No plans yet. Create one to prepare an encounter.'}</p> : filteredPlans.map(item => <Button className={u(`list-item ${planId === item.id ? 'selected' : ''}`)} key={item.id} onClick={() => openPlan(item)}><strong>{item.name}</strong><small>{item.tags.join(' · ') || 'No tags'} · {data.runs.filter(run => run.planId === item.id).length} runs</small></Button>)}</div>}
            {libraryTab === 'party' && <div className={u('library-panel')} role="tabpanel"><div className={u('panel-heading')}><div><p className={u('eyebrow')}>Campaign setup</p><h2>Party</h2></div><strong>{party.length} {party.length === 1 ? 'hero' : 'heroes'}</strong></div><p className={u('muted')}>Hero HP stays outside LiDnD.</p>{party.map(hero => <div className={u('member-row')} key={hero.id}><span>{hero.name}</span><Button aria-label={`Remove ${hero.name} from party`} onClick={() => void commit(() => window.lidnd.setPartyMember(campaign.id, hero.id, false))}>Remove</Button></div>)}<NativeSelect aria-label="Add hero to party" value="" onChange={event => { const creatureId = event.target.value; if (creatureId) void commit(() => window.lidnd.setPartyMember(campaign.id, creatureId, true)); }}><option value="">Add hero to party…</option>{availableCreatures.filter(item => item.kind === 'hero' && !party.some(member => member.id === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect><Button className={u('text-button')} onClick={() => setLibraryTab('creatures')}>Create a hero →</Button></div>}
            {libraryTab === 'creatures' && <div className={u('library-panel')} role="tabpanel"><div className={u('panel-heading')}><div><p className={u('eyebrow')}>Campaign setup</p><h2>Creatures</h2></div></div>{availableCreatures.length > 0 && <div className={u('creature-list')}>{availableCreatures.map(item => <div className={u('member-row')} key={item.id}><span><strong>{item.name}</strong><small>{item.kind} {item.ev !== null ? `· ${item.ev} EV` : item.cr ? `· CR ${item.cr}` : ''}</small></span></div>)}</div>}<CreatureForm key={campaign.id} campaign={campaign} onSave={value => void commit(() => window.lidnd.saveCreature(value))}/></div>}
            {libraryTab === 'sessions' && <div className={u('library-panel')} role="tabpanel"><SessionPanel campaign={campaign} sessions={data.sessions.filter(item => item.campaignId === campaign.id)} active={activeSession} onSave={value => void commit(() => window.lidnd.saveSession(value))}/></div>}
          </section>
          <section className={u('workspace')} aria-label="Encounter workspace">
            {run && plan && session ? <RunView key={run.id} run={run} plan={plan} session={session} campaign={campaign} creatures={availableCreatures} onSave={saveRun} onCreateCreature={value => void commit(async () => { await window.lidnd.saveCreature(value); await window.lidnd.saveRun({ ...run, participants: [...run.participants, snapshotParticipant(value)] }); })} onBack={() => setRunId(null)}/> : draft && planId === draft.id ? <PlanEditor plan={draft} savedPlan={plan} campaign={campaign} creatures={availableCreatures} partySize={party.length} victories={activeSession?.victories ?? 0} hasActiveSession={Boolean(activeSession)} runs={data.runs.filter(item => item.planId === draft.id)} onChange={setDraft} onSave={() => void commit(async () => { const saved = { ...draft, updatedAt: now() }; await window.lidnd.savePlan(saved); setDraft(saved); })} onStart={() => startRun(draft)} onCreateCreature={value => void commit(async () => { await window.lidnd.saveCreature(value); const saved = { ...draft, roster: [...draft.roster, { id: newId(), creatureId: value.id, quantity: 1 }], updatedAt: now() }; await window.lidnd.savePlan(saved); setDraft(saved); })} onGoToSession={() => setLibraryTab('sessions')} onDelete={() => { if (data.runs.some(item => item.planId === draft.id)) { setMessage('Plans with run history cannot be deleted.'); return; } if (!window.confirm(`Delete ${draft.name || 'this plan'}?`)) return; void commit(async () => { await window.lidnd.deletePlan(draft.id); setDraft(null); setPlanId(null); }); }} onOpenRun={value => setRunId(value.id)}/> : <div className={u('welcome')}><p className={u('eyebrow')}>Encounter workspace</p><h2>Build a plan, then run it again anytime</h2><p>Plans keep your roster and notes. Every run gets its own combat state and history.</p><Button className={u('primary')} onClick={() => { const value = newPlan(); setDraft(value); setPlanId(value.id); setLibraryTab('plans'); }}>Create encounter plan</Button></div>}
          </section>
        </div>
      </>}
    </main>
  </div>;
}

function CampaignForm({ onSave }: { onSave: (value: Campaign) => void }) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState<Campaign['system']>('drawsteel');
  return <form className={u('sidebar-form')} onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onSave({ id: newId(), name: name.trim(), system, partyLevel: 1, createdAt: now() }); setName(''); }}><label>New campaign<Input value={name} onChange={event => setName(event.target.value)} required placeholder="Campaign name"/></label><NativeSelect aria-label="Game system" value={system} onChange={event => setSystem(event.target.value as Campaign['system'])}><option value="drawsteel">Draw Steel</option><option value="dnd5e">D&D 5e 2024</option></NativeSelect><Button type="submit">Create campaign</Button></form>;
}

function CreatureForm({ campaign, onSave, buttonLabel = 'Save creature' }: { campaign: Campaign; onSave: (value: Creature) => void; buttonLabel?: string }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Creature['kind']>('adversary');
  const [scope, setScope] = useState<'shared' | 'campaign'>('shared');
  const [ev, setEv] = useState('');
  const [cr, setCr] = useState('');
  const [hp, setHp] = useState('');
  const [iconAssetId, setIconAssetId] = useState<string | null>(null);
  const [statBlockAssetId, setStatBlockAssetId] = useState<string | null>(null);
  return <form className={u('creature-form form-grid')} onSubmit={event => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({ id: newId(), name: name.trim(), system: campaign.system, kind, campaignId: scope === 'campaign' ? campaign.id : null, ev: campaign.system === 'drawsteel' && kind === 'adversary' ? Number(ev) : null, cr: campaign.system === 'dnd5e' && kind === 'adversary' ? cr : null, maxHp: kind === 'hero' ? null : Number(hp), iconAssetId, statBlockAssetId, createdAt: now() });
    setName(''); setEv(''); setCr(''); setHp(''); setIconAssetId(null); setStatBlockAssetId(null);
  }}>
    <h3>New creature</h3>
    <Label>Name<Input required value={name} onChange={event => setName(event.target.value)}/></Label>
    <Label>Role<NativeSelect value={kind} onChange={event => setKind(event.target.value as Creature['kind'])}><option value="adversary">Adversary</option><option value="ally">Ally</option><option value="hero">Hero</option></NativeSelect></Label>
    <Label>Availability<NativeSelect value={scope} onChange={event => setScope(event.target.value as typeof scope)}><option value="shared">Same-system campaigns</option><option value="campaign">This campaign only</option></NativeSelect></Label>
    {kind === 'adversary' && (campaign.system === 'drawsteel' ? <Label>EV<Input required type="number" min="0" value={ev} onChange={event => setEv(event.target.value)}/></Label> : <Label>CR<Input required value={cr} onChange={event => setCr(event.target.value)}/></Label>)}
    {kind !== 'hero' && <Label>Maximum HP<Input required type="number" min="0" value={hp} onChange={event => setHp(event.target.value)}/></Label>}
    <div className="space-y-3"><AssetPicker label="Stat block" onAttach={asset => setStatBlockAssetId(asset.id)}/>{statBlockAssetId && <div><AssetImage id={statBlockAssetId} alt="Creature stat block preview" className="max-h-72 w-full rounded-lg border border-border object-contain"/><Button type="button" variant="ghost" onClick={() => setStatBlockAssetId(null)}>Remove stat block</Button></div>}</div>
    <div className="space-y-3"><AssetPicker label="Icon" onAttach={asset => setIconAssetId(asset.id)}/>{iconAssetId && <div><AssetImage id={iconAssetId} alt="Creature icon preview" className="size-20 rounded-lg border border-border object-cover"/><Button type="button" variant="ghost" onClick={() => setIconAssetId(null)}>Remove icon</Button></div>}</div>
    <Button className={u('primary')} type="submit">{buttonLabel}</Button>
  </form>;
}

function SessionPanel({ campaign, sessions, active, onSave }: { campaign: Campaign; sessions: GameSession[]; active?: GameSession; onSave: (value: GameSession) => void }) {
  const [name, setName] = useState('');
  const previous = [...sessions].filter(item => item.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const [carry, setCarry] = useState(true);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const elapsedMinutes = active ? Math.max(0, Math.floor((clock - new Date(active.startedAt).getTime()) / 60000)) : 0;
  return <section className={u('session-panel')}><p className={u('eyebrow')}>Play history</p><h2>Sessions</h2>{active ? <div className={u('card')}><span className={u('live-label')}>● In progress</span><h3>{active.name}</h3><p className={u('muted')}>{Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m elapsed</p>{campaign.system === 'drawsteel' && <div className={u('victory-row')}><span>Victories <strong>{active.victories}</strong></span><Button aria-label="Decrease victories" onClick={() => onSave({ ...active, victories: Math.max(0, active.victories - 1) })}>−</Button><Button aria-label="Increase victories" onClick={() => onSave({ ...active, victories: active.victories + 1 })}>+</Button></div>}<Button onClick={() => onSave({ ...active, endedAt: now() })}>End session</Button></div> : <form className={u('card form-grid')} onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onSave({ id: newId(), campaignId: campaign.id, name: name.trim(), startedAt: now(), endedAt: null, victories: campaign.system === 'drawsteel' && carry ? previous?.victories ?? 0 : 0 }); setName(''); }}><h3>Start a session</h3><label>Name<Input aria-label="Session name" required placeholder="e.g. The Old Road" value={name} onChange={event => setName(event.target.value)}/></label>{campaign.system === 'drawsteel' && previous && <label className={u('check')}><Checkbox checked={carry} onCheckedChange={checked => setCarry(checked === true)}/> Carry {previous.victories} victories from last session</label>}<Button className={u('primary')} type="submit">Start session</Button></form>}{sessions.length > 0 && <div className={u('history-list')}><h3>Session history</h3>{[...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(item => <div className={u('history-row')} key={item.id}><strong>{item.name}</strong><small>{new Date(item.startedAt).toLocaleDateString()} · {item.endedAt ? 'Ended' : 'In progress'}</small></div>)}</div>}</section>;
}

function PlanEditor({ plan, savedPlan, campaign, creatures, partySize, victories, hasActiveSession, runs, onChange, onSave, onStart, onCreateCreature, onGoToSession, onDelete, onOpenRun }: { plan: EncounterPlan; savedPlan?: EncounterPlan; campaign: Campaign; creatures: Creature[]; partySize: number; victories: number; hasActiveSession: boolean; runs: EncounterRun[]; onChange: (value: EncounterPlan) => void; onSave: () => void; onStart: () => void; onCreateCreature: (value: Creature) => void; onGoToSession: () => void; onDelete: () => void; onOpenRun: (value: EncounterRun) => void }) {
  const [tagInput, setTagInput] = useState('');
  const [reminderText, setReminderText] = useState('');
  const [reminderRound, setReminderRound] = useState('');
  const [showCreatureForm, setShowCreatureForm] = useState(false);
  const dirty = JSON.stringify(plan) !== JSON.stringify(savedPlan);
  const difficulty = campaign.system === 'drawsteel' ? drawSteelPlanDifficulty(plan, creatures, campaign.partyLevel, partySize, victories) : null;
  return <div className={u('editor')}><div className={u('section-header')}><div><p className={u('eyebrow')}>Reusable preparation</p><h2>{plan.name || 'New encounter plan'}</h2><p className={u('draft-status')}>{!plan.name.trim() ? 'Name the plan to save it' : dirty ? 'Saving changes…' : 'Saved locally'}</p></div><div className={u('editor-actions')}><Button className={u('subtle')} onClick={onDelete}>Delete plan</Button><Button className={u('primary')} onClick={hasActiveSession ? onStart : onGoToSession} disabled={!plan.name.trim()}>{hasActiveSession ? 'Start new run' : 'Start session to run'}</Button></div></div>
    <div className={u('form-grid')}><label>Name<Input value={plan.name} onChange={event => onChange({ ...plan, name: event.target.value })} placeholder="Encounter name"/></label><label>Target difficulty<NativeSelect value={plan.targetDifficulty} onChange={event => onChange({ ...plan, targetDifficulty: event.target.value as EncounterPlan['targetDifficulty'] })}><option value="easy">Easy</option><option value="standard">Standard</option><option value="hard">Hard</option></NativeSelect></label></div>
    <div className={u('difficulty')} aria-live="polite">{difficulty ? <><strong>{difficulty.label}</strong><span>{difficulty.totalEv} EV · {difficulty.remaining === null ? 'Add heroes for budget' : `${difficulty.remaining >= 0 ? difficulty.remaining + ' remaining' : Math.abs(difficulty.remaining) + ' over target'} EV`}</span></> : <><strong>5e difficulty pending</strong><span>2024 budget rules need verification before this calculation is enabled.</span></>}</div>
    <section className={u('card')}><div className={u('card-heading')}><div><h3>Roster</h3><p className={u('muted')}>Adversaries and allies in the prepared encounter.</p></div></div>{plan.roster.map(member => { const creature = creatures.find(item => item.id === member.creatureId); return <div className={u('row roster-row')} key={member.id}><span>{creature?.name ?? 'Missing creature'}</span><Input aria-label={`Quantity for ${creature?.name ?? 'creature'}`} type="number" min="1" value={member.quantity} onChange={event => onChange({ ...plan, roster: plan.roster.map(item => item.id === member.id ? { ...item, quantity: Math.max(1, Number(event.target.value)) } : item) })}/><Button onClick={() => onChange({ ...plan, roster: plan.roster.filter(item => item.id !== member.id) })}>Remove</Button></div>; })}<div className={u('roster-actions')}><NativeSelect aria-label="Add creature to roster" value="" onChange={event => { if (event.target.value) onChange({ ...plan, roster: [...plan.roster, { id: newId(), creatureId: event.target.value, quantity: 1 }] }); }}><option value="">Add existing creature…</option>{creatures.filter(item => item.kind !== 'hero').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect><Button onClick={() => setShowCreatureForm(value => !value)} disabled={!plan.name.trim()}>{showCreatureForm ? 'Cancel' : '+ Create creature here'}</Button></div>{!plan.name.trim() && <p className={u('muted')}>Name the plan to create a creature here.</p>}{showCreatureForm && <CreatureForm campaign={campaign} buttonLabel="Create & add to plan" onSave={value => { onCreateCreature(value); setShowCreatureForm(false); }}/>}</section>
    <section className={u('card')}><h3>Notes</h3><Textarea aria-label="Encounter notes in Markdown" placeholder="Markdown notes" rows={8} value={plan.notes} onChange={event => onChange({ ...plan, notes: event.target.value })}/></section>
    <section className={u('card')}><h3>Reference images</h3><div className="grid gap-3 sm:grid-cols-2">{plan.referenceAssetIds.map(id => <div key={id} className="space-y-2"><AssetImage id={id} alt="Encounter reference" className="max-h-64 w-full rounded-lg border border-border object-contain"/><Button variant="ghost" onClick={() => onChange({ ...plan, referenceAssetIds: plan.referenceAssetIds.filter(item => item !== id) })}>Remove image</Button></div>)}</div><AssetPicker label="Encounter reference" onAttach={asset => onChange({ ...plan, referenceAssetIds: [...plan.referenceAssetIds, asset.id] })}/></section>
    <section className={u('card')}><h3>Tags</h3><div className={u('chips')}>{plan.tags.map(tag => <Button key={tag} onClick={() => onChange({ ...plan, tags: plan.tags.filter(item => item !== tag) })}>{tag} ×</Button>)}</div><div className={u('row')}><Input aria-label="New tag" placeholder="New tag" value={tagInput} onChange={event => setTagInput(event.target.value)}/><Button onClick={() => { const tag = tagInput.trim(); if (tag && !plan.tags.includes(tag)) onChange({ ...plan, tags: [...plan.tags, tag] }); setTagInput(''); }}>Add tag</Button></div></section>
    <section className={u('card')}><h3>Reminders</h3>{plan.reminders.map(item => <div className={u('row')} key={item.id}><span>{item.text} · {item.round === null ? 'Every round' : `Round ${item.round}`}</span><Button onClick={() => onChange({ ...plan, reminders: plan.reminders.filter(reminder => reminder.id !== item.id) })}>Remove</Button></div>)}<div className={u('row')}><Input aria-label="Reminder text" placeholder="Reminder" value={reminderText} onChange={event => setReminderText(event.target.value)}/><Input aria-label="Reminder round" type="number" min="1" placeholder="Every round" value={reminderRound} onChange={event => setReminderRound(event.target.value)}/><Button onClick={() => { if (!reminderText.trim()) return; onChange({ ...plan, reminders: [...plan.reminders, { id: newId(), text: reminderText.trim(), round: reminderRound ? Number(reminderRound) : null }] }); setReminderText(''); setReminderRound(''); }}>Add</Button></div></section>
    <section className={u('card')}><h3>Run history</h3>{runs.length === 0 && <p className={u('muted')}>No runs yet.</p>}{runs.map(item => <Button className={u('list-item')} key={item.id} onClick={() => onOpenRun(item)}>{new Date(item.startedAt).toLocaleString()} · {item.endedAt ? 'Completed' : 'In progress'}</Button>)}</section>
  </div>;
}

function RunView({ run, plan, session, campaign, creatures, onSave, onCreateCreature, onBack }: { run: EncounterRun; plan: EncounterPlan; session: GameSession; campaign: Campaign; creatures: Creature[]; onSave: (value: EncounterRun) => void; onCreateCreature: (value: Creature) => void; onBack: () => void }) {
  const system = campaign.system;
  const [amount, setAmount] = useState<Record<string, string>>({});
  const [effectName, setEffectName] = useState<Record<string, string>>({});
  const [effectDuration, setEffectDuration] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(run.notes);
  const [showCreatureForm, setShowCreatureForm] = useState(false);
  const previousParticipantCount = useRef(run.participants.length);
  const newestParticipantRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (run.participants.length > previousParticipantCount.current) newestParticipantRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    previousParticipantCount.current = run.participants.length;
  }, [run.participants.length]);
  useEffect(() => {
    if (notes === run.notes) return;
    const timer = setTimeout(() => onSave({ ...run, notes }), 500);
    return () => clearTimeout(timer);
  }, [notes, run]);
  const heroes = run.participants.filter(item => item.kind === 'hero').length;
  const participants = system === 'dnd5e' ? [...run.participants].sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) || a.id.localeCompare(b.id)) : run.participants;
  function updateParticipant(id: string, change: (value: RunParticipant) => RunParticipant) { onSave({ ...run, participants: run.participants.map(item => item.id === id ? change(item) : item) }); }
  function moveTurn(direction: 1 | -1) {
    if (!participants.length) return;
    const index = participants.findIndex(item => item.id === run.activeParticipantId);
    const nextIndex = index < 0 ? 0 : (index + direction + participants.length) % participants.length;
    onSave({ ...run, activeParticipantId: participants[nextIndex].id, round: index >= 0 && ((direction === 1 && nextIndex === 0) || (direction === -1 && index === 0)) ? Math.max(1, run.round + direction) : run.round });
  }
  return <div className={u('editor')}><div className={u('section-header')}><div><Button onClick={onBack}>← Plan</Button><h2>{plan.name}</h2><p className={u('muted')}>{session.name} · Started {new Date(run.startedAt).toLocaleString()}</p></div><Button onClick={() => onSave({ ...run, endedAt: run.endedAt ? null : now() })}>{run.endedAt ? 'Resume run' : 'End run'}</Button></div>
    <div className={u('combat-bar')}><strong>Round {run.round}</strong>{system === 'drawsteel' ? <><span>Malice {run.malice}</span><Button onClick={() => onSave({ ...run, malice: Math.max(0, run.malice - 1) })}>− Malice</Button><Button onClick={() => onSave({ ...run, malice: run.malice + 1 })}>+ Malice</Button><Button onClick={() => { const next = nextDrawSteelRound(run.round, run.malice, heroes, session.victories); onSave({ ...run, ...next, participants: run.participants.map(item => ({ ...item, acted: false })), reminders: run.reminders.map(item => ({ ...item, dismissed: false })) }); }}>Next round</Button></> : <><Button onClick={() => moveTurn(-1)}>Previous turn</Button><Button onClick={() => moveTurn(1)}>Next turn</Button></>}</div>
    <section className={u('card')}><div className={u('card-heading')}><div><h3>Participants</h3><p className={u('muted')}>Changes here affect this run only.</p></div><Button disabled={Boolean(run.endedAt)} onClick={() => setShowCreatureForm(value => !value)}>{showCreatureForm ? 'Cancel' : '+ Add participant'}</Button></div>{showCreatureForm && <div className={u('add-participant')}><NativeSelect aria-label="Add existing creature to run" value="" onChange={event => { const creature = creatures.find(item => item.id === event.target.value); if (creature) { onSave({ ...run, participants: [...run.participants, snapshotParticipant(creature)] }); setShowCreatureForm(false); } }}><option value="">Add existing creature…</option>{creatures.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect><p className={u('muted')}>Or create a reusable creature and add it to this run.</p><CreatureForm campaign={campaign} buttonLabel="Create & add to run" onSave={value => { onCreateCreature(value); setShowCreatureForm(false); }}/></div>}{participants.map(item => <div ref={item.id === run.participants.at(-1)?.id ? newestParticipantRef : undefined} className={u(`participant ${run.activeParticipantId === item.id ? 'active' : ''}`)} key={item.id}><div className={u('row')}><strong>{item.name}</strong><span>{item.kind}</span>{system === 'drawsteel' ? <label className={u('check')}><Checkbox checked={item.acted} disabled={Boolean(run.endedAt)} onCheckedChange={checked => updateParticipant(item.id, value => ({ ...value, acted: checked === true }))}/> Acted</label> : <label>Initiative <Input className={u('small-input')} type="number" value={item.initiative ?? ''} disabled={Boolean(run.endedAt)} onChange={event => updateParticipant(item.id, value => ({ ...value, initiative: event.target.value === '' ? null : Number(event.target.value) }))}/></label>}</div>{item.kind !== 'hero' && <div className={u('row')}><span>HP {item.hp ?? 0}/{item.maxHp ?? 0} · Temp {item.temporaryHp}</span><Input className={u('small-input')} aria-label={`Amount for ${item.name}`} type="number" min="0" placeholder="Amount" value={amount[item.id] ?? ''} onChange={event => setAmount({ ...amount, [item.id]: event.target.value })}/><Button disabled={Boolean(run.endedAt)} onClick={() => { const damage = Number(amount[item.id] ?? 0); updateParticipant(item.id, value => ({ ...value, temporaryHp: Math.max(0, value.temporaryHp - damage), hp: Math.max(0, (value.hp ?? 0) - Math.max(0, damage - value.temporaryHp)) })); }}>Damage</Button><Button disabled={Boolean(run.endedAt)} onClick={() => updateParticipant(item.id, value => ({ ...value, hp: Math.min(value.maxHp ?? 0, (value.hp ?? 0) + Number(amount[item.id] ?? 0)) }))}>Heal</Button><Button disabled={Boolean(run.endedAt)} onClick={() => updateParticipant(item.id, value => ({ ...value, temporaryHp: Number(amount[item.id] ?? 0) }))}>Set temp HP</Button></div>}<div className={u('row effects')}>{item.effects.map(effect => <Button key={effect.id} onClick={() => updateParticipant(item.id, value => ({ ...value, effects: value.effects.filter(candidate => candidate.id !== effect.id) }))}>{effect.name}{effect.duration ? ` · ${effect.duration}` : ''} ×</Button>)}<Input aria-label={`New effect for ${item.name}`} placeholder="Effect" value={effectName[item.id] ?? ''} onChange={event => setEffectName({ ...effectName, [item.id]: event.target.value })}/><Input aria-label={`Effect duration for ${item.name}`} placeholder="Duration note" value={effectDuration[item.id] ?? ''} onChange={event => setEffectDuration({ ...effectDuration, [item.id]: event.target.value })}/><Button disabled={!effectName[item.id]?.trim() || Boolean(run.endedAt)} onClick={() => { updateParticipant(item.id, value => ({ ...value, effects: [...value.effects, { id: newId(), name: effectName[item.id].trim(), duration: effectDuration[item.id] ?? '', saveEndsDc: null }] })); setEffectName({ ...effectName, [item.id]: '' }); setEffectDuration({ ...effectDuration, [item.id]: '' }); }}>Add effect</Button></div></div>)}</section>
    <section className={u('card')}><h3>Reminders</h3>{run.reminders.filter(item => !item.dismissed && (item.round === null || item.round === run.round)).map(item => <div className={u('row')} key={item.id}><span>{item.text}</span><Button onClick={() => onSave({ ...run, reminders: run.reminders.map(reminder => reminder.id === item.id ? { ...reminder, dismissed: true } : reminder) })}>Dismiss</Button></div>)}</section>
    <section className={u('card')}><h3>Reference images</h3><div className="grid gap-3 sm:grid-cols-2">{run.referenceAssetIds.map(id => <AssetImage key={id} id={id} alt="Encounter reference" className="max-h-80 w-full rounded-lg border border-border object-contain"/>)}</div>{run.participants.filter(item => item.statBlockAssetId).map(item => <div key={item.id} className="mt-3 space-y-2"><h4 className="text-sm font-semibold">{item.name} stat block</h4><AssetImage id={item.statBlockAssetId!} alt={`${item.name} stat block`} className="max-h-96 w-full rounded-lg border border-border object-contain"/></div>)}</section>
    <section className={u('card')}><h3>Run notes</h3><Textarea rows={8} aria-label="Run notes" value={notes} onChange={event => setNotes(event.target.value)} onBlur={() => { if (notes !== run.notes) onSave({ ...run, notes }); }}/></section>
    {run.endedAt && <p className={u('muted')}>Ended {new Date(run.endedAt).toLocaleString()}</p>}
  </div>;
}

export default App;
