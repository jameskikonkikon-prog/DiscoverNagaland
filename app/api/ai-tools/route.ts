export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

const TOOL_PROMPTS: Record<string, (biz: Record<string, string>) => string> = {
  'write-desc': (biz) =>
    `Write a compelling business description for "${biz.name}", a ${biz.category} in ${biz.city}, Nagaland. Keep it under 150 words, professional, and engaging. Highlight what makes this business special in the local context.`,
  'improve-desc': (biz) =>
    `Improve this business description for "${biz.name}" (${biz.category} in ${biz.city}): "${biz.description || 'No description yet'}". Make it more engaging, SEO-friendly, and under 150 words.`,
  'menu-reader': (biz) =>
    `Suggest a well-formatted menu description for "${biz.name}", a ${biz.category} in ${biz.city}. Include popular dish categories and price range suggestions.`,
  'growth-advisor': (biz) =>
    `Give 5 actionable growth tips for "${biz.name}", a ${biz.category} in ${biz.city}, Nagaland. Focus on local marketing, digital presence, and customer retention. Be specific and practical.`,
  'whatsapp-writer': (biz) =>
    `Write 3 WhatsApp marketing messages for "${biz.name}" (${biz.category} in ${biz.city}). Include a promotional offer, a new customer welcome, and a festive greeting. Keep each under 160 characters.`,
  'competitor-intel': (biz) =>
    `Provide a competitive analysis for a ${biz.category} business in ${biz.city}, Nagaland. What are the key differentiators, market trends, and opportunities?`,
  'full-report': (biz) =>
    `Generate a comprehensive business report for "${biz.name}" (${biz.category} in ${biz.city}). Include market positioning, growth opportunities, digital presence recommendations, and customer engagement strategies.`,
};

const PLAN_ACCESS: Record<string, Record<string, boolean>> = {
  basic: { 'write-desc': true, 'growth-advisor': true },
  pro: { 'write-desc': true, 'improve-desc': true, 'menu-reader': true, 'growth-advisor': true, 'whatsapp-writer': true },
  plus: { 'write-desc': true, 'improve-desc': true, 'menu-reader': true, 'growth-advisor': true, 'whatsapp-writer': true, 'competitor-intel': true, 'full-report': true },
};

export async function POST(request: NextRequest) {
  try {
    const { toolId, businessId, businessData } = await request.json();

    if (!toolId || !businessId) {
      return NextResponse.json({ error: 'Missing toolId or businessId' }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('plan')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const plan = business.plan || 'basic';
    if (!PLAN_ACCESS[plan]?.[toolId]) {
      return NextResponse.json({ error: 'This tool requires a higher plan. Please upgrade.' }, { status: 403 });
    }

    const promptFn = TOOL_PROMPTS[toolId];
    if (!promptFn) {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const prompt = promptFn(businessData || {});

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 500 });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || 'No result generated.';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI tools error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
