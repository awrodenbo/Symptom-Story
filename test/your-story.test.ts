import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareStoryPeriods, generateStoryPeriods, safeJournalSelection } from '../src/yourStory.ts';

const options = { includeMedications: true, includeJournal: true, selectedSymptoms: [] as string[], includeSafetyEvents: false };
const checkIns = [
  { id:'1',entryDate:'2026-02-03',sleep:2,symptoms:['Fatigue','Headache'] },
  { id:'2',entryDate:'2026-02-10',sleep:3,symptoms:['Fatigue'] },
  { id:'3',entryDate:'2026-03-06',sleep:4,symptoms:['Headache'] },
];

test('monthly summaries count check-ins, symptoms, sleep, medication, and milestones',()=>{
 const periods=generateStoryPeriods({grouping:'month',checkIns,medications:[{id:'m',name:'Medication',createdAt:'2026-03-06'}],milestones:[{id:'x',date:'2026-03-08',type:'appointment',title:'Attended an appointment'}],journalSelections:[],options});
 assert.deepEqual(periods.map(x=>x.label),['March 2026','February 2026']);
 assert.equal(periods[1].checkInCount,2);assert.deepEqual(periods[1].topSymptoms[0],{name:'Fatigue',count:2});assert.equal(periods[1].averageSleep,2.5);
 assert.match(periods[0].summary,/began logging 1 medication/);assert.match(periods[0].summary,/1 milestone/);
 assert.match(periods[0].summary,/1 healthcare appointment/);
});

test('week and valid custom ranges group records deterministically',()=>{
 const weekly=generateStoryPeriods({grouping:'week',checkIns,medications:[],milestones:[],journalSelections:[],options});
 assert.equal(weekly[0].start,'2026-03-02');assert.equal(weekly[0].end,'2026-03-08');
 const custom=generateStoryPeriods({grouping:'custom',custom:{start:'2026-02-01',end:'2026-02-28'},checkIns,medications:[],milestones:[],journalSelections:[],options});
 assert.equal(custom.length,1);assert.equal(custom[0].checkInCount,2);
 assert.throws(()=>generateStoryPeriods({grouping:'custom',custom:{start:'2026-03-01',end:'2026-02-01'},checkIns,medications:[],milestones:[],journalSelections:[],options}),/valid custom/);
});

test('adjacent comparison uses objective counts without treatment claims',()=>{
 const periods=generateStoryPeriods({grouping:'month',checkIns,medications:[],milestones:[],journalSelections:[],options});
 const comparison=compareStoryPeriods(periods[0],periods[1]).join(' ');
 assert.match(comparison,/fewer check-ins/);assert.match(comparison,/Fatigue/);assert.match(comparison,/Average recorded sleep quality/);
 assert.doesNotMatch(comparison,/working|recover|clinically|should/i);assert.deepEqual(compareStoryPeriods(periods[0]),[]);
});

test('hidden categories and selected symptoms affect source data and narrative',()=>{
 const period=generateStoryPeriods({grouping:'month',checkIns,medications:[{id:'m',name:'Medication',createdAt:'2026-02-02'}],milestones:[],journalSelections:[{id:'j',date:'2026-02-03',excerpt:'Walking felt helpful.'}],options:{...options,includeMedications:false,includeJournal:false,selectedSymptoms:['Headache']}}).find(x=>x.key==='2026-02')!;
 assert.deepEqual(period.medicationEvents,[]);assert.deepEqual(period.journalSelections,[]);assert.deepEqual(period.topSymptoms,[{name:'Headache',count:1}]);
});

test('journal text is opt-in and crisis-related text is always excluded',()=>{
 const periods=generateStoryPeriods({grouping:'month',checkIns,medications:[],milestones:[{id:'risk',date:'2026-02-04',type:'custom',title:'Thoughts of suicide'}],journalSelections:[{id:'safe',date:'2026-02-03',excerpt:'Quiet time felt helpful.'},{id:'risk',date:'2026-02-04',excerpt:'I had thoughts of suicide.'}],options});
 assert.equal(periods.find(x=>x.key==='2026-02')!.journalSelections.length,1);
 assert.equal(periods.find(x=>x.key==='2026-02')!.milestones.length,0);
 assert.equal(safeJournalSelection('  Walking helped.  '),'Walking helped.');
 assert.throws(()=>safeJournalSelection('self-harm thoughts'),/Sensitive/);assert.throws(()=>safeJournalSelection(' '),/between 1 and 500/);
});

test('empty source data produces the compassionate empty state condition',()=>{
 assert.deepEqual(generateStoryPeriods({grouping:'month',checkIns:[],medications:[],milestones:[],journalSelections:[],options}),[]);
});

test('timeline persistence has RLS, deletion timestamps, and export selections',()=>{
 const sql=readFileSync('supabase/migrations/202607280004_your_story.sql','utf8');
 for(const table of ['timeline_preferences','timeline_milestones','timeline_journal_selections','timeline_summaries','timeline_export_selections']){assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));assert.match(sql,new RegExp(`references auth\\.users\\(id\\) on delete cascade`));}
 assert.match(sql,/edited_summary/);assert.match(sql,/hidden boolean/);assert.match(sql,/deleted_at/g);assert.match(sql,/selected boolean/);assert.doesNotMatch(sql,/for all to authenticated/);
});

test('mobile UI exposes timeline labels, controls, empty state, and export',()=>{
 const ui=readFileSync('app/YourStory.tsx','utf8');
 for(const text of ['Your Story','Month','Week','Custom','Show source details','Add milestone','Export selected','Disable Your Story','Regenerate from records'])assert.match(ui,new RegExp(text));
 assert.match(ui,/Your Story will take shape as you add check-ins, reflections, treatments, and milestones/);
 assert.match(ui,/accessibilityLabel={`Select \$\{period\.label\} for export`}/);assert.match(ui,/accessibilityState={{expanded}}/);assert.match(ui,/minHeight:48/);
});

test('timeline API reads and mutates only active-user rows',()=>{
 const api=readFileSync('src/api.ts','utf8');
 for(const table of ['timeline_milestones','timeline_summaries','timeline_journal_selections'])assert.match(api,new RegExp(`from\\('${table}'\\)[^;]+eq\\('user_id', userId\\)`));
 assert.match(api,/deleteTimelineSummary\(userId:string,id:string\)/);assert.match(api,/deleteTimelineMilestone\(userId:string,id:string\)/);
});
