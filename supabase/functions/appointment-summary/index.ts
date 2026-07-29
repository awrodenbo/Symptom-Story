import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('APP_ORIGIN') ?? '*';
const headers = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required.' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Authentication required.' }, 401);

  const body = await request.json().catch(() => ({}));
  const questions = typeof body.questions === 'string' ? body.questions.trim().slice(0, 2000) : '';
  const [checkIns, medications] = await Promise.all([
    supabase.from('check_ins').select('entry_date,mood,sleep,energy,symptoms,medication_taken').eq('user_id', user.id).order('entry_date', { ascending: true }).limit(60),
    supabase.from('medications').select('name,schedule').eq('user_id', user.id).order('created_at', { ascending: true }).limit(50),
  ]);
  if (checkIns.error || medications.error) return json({ error: 'Unable to prepare your records.' }, 400);
  if (!checkIns.data.length) return json({ error: 'Complete at least one check-in before creating a summary.' }, 400);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL');
  if (!apiKey || !model) return json({ error: 'AI summaries are not configured.' }, 503);
  const source = { checkIns: checkIns.data, medications: medications.data, userQuestions: questions || null };
  const schema = { type: 'object', additionalProperties: false, required: ['overview','symptomTrends','medications','questions','observations','disclaimer'], properties: {
    overview: { type: 'string' }, symptomTrends: { type: 'array', items: { type: 'string' } }, medications: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } }, observations: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
  }};
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
    model, store: false,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'Create a concise appointment-preparation draft using only the supplied self-reported records. State dates and counts objectively. Never diagnose, infer a condition, claim causation or improvement, evaluate treatment effectiveness, recommend treatment or dosage changes, or add facts. Preserve user questions without answering them. Use neutral, inclusive language. The disclaimer must say this is an AI-drafted summary of self-reported information, not medical advice, and must be reviewed by the user.' }] },
      { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(source) }] },
    ], text: { format: { type: 'json_schema', name: 'appointment_summary', strict: true, schema } },
  }) });
  if (!response.ok) return json({ error: 'The summary could not be generated. Try again later.' }, 502);
  const result = await response.json();
  const output = result.output_text ?? result.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).find((item: { type: string }) => item.type === 'output_text')?.text;
  if (typeof output !== 'string') return json({ error: 'The summary response was incomplete.' }, 502);
  let parsed;
  try { parsed = JSON.parse(output); } catch { return json({ error: 'The summary response was invalid.' }, 502); }
  const content = [`APPOINTMENT PREPARATION DRAFT`, parsed.overview, `SYMPTOM TRENDS`, ...parsed.symptomTrends.map((item: string) => `• ${item}`), `MEDICATIONS RECORDED`, ...parsed.medications.map((item: string) => `• ${item}`), `QUESTIONS TO DISCUSS`, ...parsed.questions.map((item: string) => `• ${item}`), `OTHER OBSERVATIONS`, ...parsed.observations.map((item: string) => `• ${item}`), parsed.disclaimer].join('\n\n');
  const prohibitedClaim = /\b(you should|we recommend|i recommend|stop taking|start taking|change (?:your )?dose|treatment is working|proves? (?:you have|a diagnosis)|you (?:have|are diagnosed with))\b/i;
  if (prohibitedClaim.test(content)) return json({ error: 'The draft did not meet the app’s medical-boundary rules. No summary was saved.' }, 422);
  return json({ content, model, sourceFrom: checkIns.data[0].entry_date, sourceTo: checkIns.data.at(-1)?.entry_date });
});
