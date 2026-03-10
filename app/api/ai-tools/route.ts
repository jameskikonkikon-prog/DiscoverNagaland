export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

const MODEL = 'claude-sonnet-4-20250514';

type Plan = 'basic' | 'pro' | 'plus';
type ToolId = 'write-desc' | 'write-description' | 'growth-advisor' | 'menu-reader' | 'competitor-intel';

interface BizRow {
  name: string;
  category: string;
  city: string;
  area?: string | null;
  landmark?: string | null;
  description?: string | null;
  tags?: string | null;
  plan?: string | null;
}

function getPrompt(toolName: ToolId, biz: BizRow, extra?: { raw_menu_text?: string; special_note?: string }): string {
  const area = biz.area || biz.landmark || '';
  const city = biz.city || '';
  const name = biz.name || 'Business';
  const category = biz.category || 'Business';
  const tags = biz.tags || '';

  switch (toolName) {
    case 'write-desc':
      return `You are a copywriter for Yana Nagaland, a business directory in Nagaland, India. Write a compelling 3–4 sentence business description for ${name}, a ${category} in ${area ? area + ', ' : ''}${city}, Nagaland. Tags: ${tags}. Make it warm, local, and trustworthy. Return only the description text, nothing else.`;
    case 'write-description':
      return `You are a copywriter for Yana Nagaland, a business directory in Nagaland India. Write a compelling 3-4 sentence business description for ${name}, a ${category} in ${area ? area + ', ' : ''}${city}, Nagaland. Tags: ${tags}. Special note: ${extra?.special_note || ''}. Make it warm, local and trustworthy. Return only the description text, nothing else.`;
    case 'growth-advisor':
      return `You are a business growth advisor for small businesses in Nagaland, India. Give 5 practical numbered growth tips for ${name}, a ${category} in ${city}, Nagaland. Be specific to the Northeast India context. Keep each tip to 1–2 sentences.`;
    case 'menu-reader':
      return `Format the following raw menu text for ${name} in ${city}, Nagaland into a clean structured menu. Group items by category. Format each item as: Item Name — ₹Price — one sentence description. Raw menu:\n\n${extra?.raw_menu_text || '(no text provided)'}`;
    case 'competitor-intel':
      return `You are a market analyst for Nagaland, India. For ${name}, a ${category} business in ${city}: 1) Describe the likely competitor landscape, 2) List 3 key differentiators this business should emphasize, 3) List 2 threats to watch, 4) Identify 1 untapped opportunity in this category in Nagaland.`;
    default:
      return '';
  }
}

function isToolLockedByPlan(plan: Plan, toolName: ToolId): boolean {
  if (plan === 'plus') return false;
  if (plan === 'pro') return toolName === 'competitor-intel';
  if (plan === 'basic') return toolName === 'menu-reader' || toolName === 'competitor-intel';
  return true;
}

async function getUsageCount(
  serviceClient: ReturnType<typeof getServiceClient>,
  businessId: string,
  toolName: ToolId,
  plan: Plan
): Promise<{ total: number; weekly: number }> {
  const { data: all } = await serviceClient
    .from('ai_tool_usage')
    .select('used_at')
    .eq('business_id', businessId)
    .eq('tool_name', toolName);
  const total = all?.length ?? 0;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekly = (all?.filter((r: { used_at: string }) => r.used_at >= weekAgo) ?? []).length;
  return { total, weekly };
}

function isOverLimit(plan: Plan, toolName: ToolId, total: number, weekly: number): boolean {
  if (plan === 'plus') return false;
  if (plan === 'basic') {
    if (toolName === 'write-desc' || toolName === 'growth-advisor') return total >= 1;
    return true;
  }
  if (plan === 'pro') {
    if (toolName === 'growth-advisor') return weekly >= 1;
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('business_id');
    if (!businessId) return NextResponse.json({ error: 'Missing business_id' }, { status: 400 });

    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('plan')
      .eq('id', businessId)
      .single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const plan = (business.plan || 'basic') as Plan;

    const tools: ToolId[] = ['write-desc', 'growth-advisor', 'menu-reader', 'competitor-intel'];
    const usage: Record<string, { total: number; weekly: number; locked: boolean; reason?: string }> = {};

    for (const toolName of tools) {
      const lockedByPlan = isToolLockedByPlan(plan, toolName);
      const { total, weekly } = await getUsageCount(serviceClient, businessId, toolName, plan);
      const overLimit = isOverLimit(plan, toolName, total, weekly);
      let reason: string | undefined;
      if (lockedByPlan) {
        if (toolName === 'menu-reader' || toolName === 'competitor-intel') reason = plan === 'basic' ? 'Upgrade to Pro to unlock' : 'Upgrade to Plus to unlock';
        else reason = 'Upgrade to unlock';
      } else if (overLimit) {
        reason = toolName === 'growth-advisor' && plan === 'pro' ? "You've used your weekly use" : "You've used your 1 free use";
      }
      usage[toolName] = { total, weekly, locked: lockedByPlan || overLimit, reason };
    }

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('AI tools usage error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool_name: toolName, business_id: businessId, raw_menu_text: rawMenuText, special_note: specialNote } = body as {
      tool_name?: string;
      business_id?: string;
      raw_menu_text?: string;
      special_note?: string;
    };

    if (!toolName || !businessId) {
      return NextResponse.json({ error: 'Missing tool_name or business_id' }, { status: 400 });
    }

    const validTools: ToolId[] = ['write-desc', 'write-description', 'growth-advisor', 'menu-reader', 'competitor-intel'];
    if (!validTools.includes(toolName as ToolId)) {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('name, category, city, area, landmark, description, tags, plan')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const plan = (business.plan || 'basic') as Plan;

    if (isToolLockedByPlan(plan, toolName as ToolId)) {
      return NextResponse.json(
        { error: plan === 'basic' ? 'Upgrade to Pro to unlock this tool.' : 'Upgrade to Plus to unlock this tool.' },
        { status: 403 }
      );
    }

    const { total, weekly } = await getUsageCount(serviceClient, businessId, toolName as ToolId, plan);
    if (isOverLimit(plan, toolName as ToolId, total, weekly)) {
      return NextResponse.json(
        { error: toolName === 'growth-advisor' && plan === 'pro' ? "You've used your weekly use. Try again next week." : "You've used your 1 free use. Upgrade to continue." },
        { status: 403 }
      );
    }

    if (toolName === 'menu-reader' && (!rawMenuText || String(rawMenuText).trim() === '')) {
      return NextResponse.json({ error: 'Please paste your menu text first.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const prompt = getPrompt(toolName as ToolId, business as BizRow, { raw_menu_text: rawMenuText, special_note: specialNote });

    let result: string;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Anthropic API error (non-OK):', errText);
        return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 500 });
      }

      const data = await response.json();
      result = data.content?.[0]?.text ?? 'No result generated.';
    } catch (err) {
      console.error('Anthropic API call failed:', err);
      return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 500 });
    }

    await serviceClient.from('ai_tool_usage').insert({
      business_id: businessId,
      tool_name: toolName,
      used_at: new Date().toISOString(),
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI tools error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
