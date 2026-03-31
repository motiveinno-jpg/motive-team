import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || ''

const PARTNER_TYPE_MAP: Record<string, string> = {
  customs_broker: '관세사',
  forwarder: '포워더',
  other: '기타',
}

const ALLOWED_ORIGINS = [
  'https://whistle-ai.com',
  'https://motiveinno-jpg.github.io',
]

const MAX_FIELD_LENGTH = 200
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s\-+().]{6,30}$/
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function sanitize(input: string): string {
  return input.trim().slice(0, MAX_FIELD_LENGTH)
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Server-side origin validation (defense-in-depth beyond CORS headers)
  const requestOrigin = req.headers.get('origin') || ''
  if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden origin' }),
      { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '3600' } },
    )
  }

  try {
    const body = await req.json()
    const partnerType = sanitize(String(body.partner_type || ''))
    const companyName = sanitize(String(body.company_name || ''))
    const contactName = sanitize(String(body.contact_name || ''))
    const contactEmail = sanitize(String(body.contact_email || ''))
    const contactPhone = sanitize(String(body.contact_phone || ''))

    if (!partnerType || !companyName || !contactName || !contactEmail || !contactPhone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!['customs_broker', 'forwarder', 'other'].includes(partnerType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid partner type' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!EMAIL_REGEX.test(contactEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!PHONE_REGEX.test(contactPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const sbUrl = Deno.env.get('SUPABASE_URL')!
    const sbServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sbAdmin = createClient(sbUrl, sbServiceRole)

    await sbAdmin.from('partner_applications').insert({
      partner_type: partnerType,
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })

    const typeLabel = PARTNER_TYPE_MAP[partnerType] || '기타'

    const message = `🤝 새로운 파트너 신청!

유형: ${typeLabel}
회사명: ${companyName}
담당자: ${contactName}
이메일: ${contactEmail}
연락처: ${contactPhone}

👉 어드민에서 확인하세요`

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
      const telegramRes = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }),
      })

      if (!telegramRes.ok) {
        const errBody = await telegramRes.text()
        console.error('Telegram API error:', errBody)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('notify-partner-application error:', e instanceof Error ? e.message : String(e))
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
