import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || ''

const PARTNER_TYPE_MAP: Record<string, string> = {
  customs_broker: '관세사',
  forwarder: '포워더',
  other: '기타',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://whistle-ai.com',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { partner_type, company_name, contact_name, contact_email, contact_phone } = await req.json()

    if (!partner_type || !company_name || !contact_name || !contact_email || !contact_phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const typeLabel = PARTNER_TYPE_MAP[partner_type] || '기타'

    const message = `🤝 새로운 파트너 신청!

유형: ${typeLabel}
회사명: ${company_name}
담당자: ${contact_name}
이메일: ${contact_email}
연락처: ${contact_phone}

👉 어드민에서 확인하세요`

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
      throw new Error('Failed to send Telegram notification')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('notify-partner-application error:', e instanceof Error ? e.message : String(e))
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
