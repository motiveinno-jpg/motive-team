import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://whistle-ai.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map notification types to email template types
const EMAIL_TYPE_MAP: Record<string, string> = {
  payment: 'payment_confirmation',
  deal: 'buyer_matched',
  matching: 'buyer_matched',
  analysis: 'analysis_complete',
  message: 'new_message',
  escrow: 'escrow_update',
  subscription: 'subscription_change',
  shipment: 'shipment_update',
  quote: 'quote_received',
  order: 'order_update',
  document: 'document_ready',
  sample: 'sample_update',
}

// Types that should ALWAYS send email (high priority)
const ALWAYS_EMAIL_TYPES = new Set(['payment', 'escrow', 'matching', 'deal', 'shipment', 'order', 'quote'])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sbAdmin = createClient(supabaseUrl, serviceKey)

    // Verify sender is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sbAdmin.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json()
    const notifications = Array.isArray(body) ? body : [body]

    for (const n of notifications) {
      if (!n.target_user_id || !n.type || !n.title) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: target_user_id, type, title' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // Check if caller is admin (uses 'users' table — no separate 'profiles' table exists)
    const { data: callerProfile } = await sbAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = callerProfile?.role === 'admin'

    // Authorization: verify caller has relationship with each target user
    if (!isAdmin) {
      for (const n of notifications) {
        if (n.target_user_id === user.id) continue

        const { data: matchingRel } = await sbAdmin
          .from('matchings')
          .select('id')
          .or(
            `and(user_id.eq.${user.id},buyer_id.eq.${n.target_user_id}),and(user_id.eq.${n.target_user_id},buyer_id.eq.${user.id})`,
          )
          .limit(1)

        const { data: orderRel } = await sbAdmin
          .from('orders')
          .select('id')
          .or(
            `and(user_id.eq.${user.id},buyer_id.eq.${n.target_user_id}),and(user_id.eq.${n.target_user_id},buyer_id.eq.${user.id})`,
          )
          .limit(1)

        const hasRelationship =
          (matchingRel && matchingRel.length > 0) ||
          (orderRel && orderRel.length > 0)

        if (!hasRelationship) {
          return new Response(
            JSON.stringify({ error: 'Forbidden: no relationship with target user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // Insert in-app notifications
    const rows = notifications.map((n) => ({
      user_id: n.target_user_id,
      type: n.type || 'system',
      title: n.title,
      body: n.message || '',
      link_page: n.link_page || null,
      link_id: n.link_id || null,
      is_read: false,
      created_at: new Date().toISOString(),
    }))

    const { error } = await sbAdmin.from('notifications').insert(rows)
    if (error) throw error

    // Send email notifications — collect results, don't block response
    const emailResults: Array<{ user_id: string; status: 'sent' | 'skipped' | 'failed'; reason?: string }> = []
    const emailPromises: Promise<void>[] = []

    for (const n of notifications) {
      if (n.skip_email) {
        emailResults.push({ user_id: n.target_user_id, status: 'skipped', reason: 'skip_email flag' })
        continue
      }

      const emailType = EMAIL_TYPE_MAP[n.type]
      if (!emailType && !ALWAYS_EMAIL_TYPES.has(n.type)) {
        emailResults.push({ user_id: n.target_user_id, status: 'skipped', reason: 'no email type mapping' })
        continue
      }

      const { data: targetUser } = await sbAdmin
        .from('users')
        .select('email, display_name, preferred_language, email_notifications')
        .eq('id', n.target_user_id)
        .single()

      if (!targetUser?.email) {
        emailResults.push({ user_id: n.target_user_id, status: 'skipped', reason: 'no email address' })
        continue
      }
      if (targetUser.email_notifications === false) {
        emailResults.push({ user_id: n.target_user_id, status: 'skipped', reason: 'user opted out' })
        continue
      }

      const internalSecret = Deno.env.get('INTERNAL_SERVICE_SECRET')
      if (!internalSecret) {
        console.error('INTERNAL_SERVICE_SECRET not configured — email skipped')
        emailResults.push({ user_id: n.target_user_id, status: 'skipped', reason: 'missing secret config' })
        continue
      }

      const emailPayload = JSON.stringify({
        to: targetUser.email,
        user_id: n.target_user_id,
        type: emailType || 'default',
        data: {
          name: targetUser.display_name || '',
          title: n.title,
          message: n.message || '',
          subject: n.title,
          ...(n.email_data || {}),
        },
        lang: targetUser.preferred_language || 'en',
      })

      const sendPromise = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'X-Internal-Secret': internalSecret,
        },
        body: emailPayload,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
        }
        emailResults.push({ user_id: n.target_user_id, status: 'sent' })
      }).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`Email send failed for user ${n.target_user_id}:`, msg)
        emailResults.push({ user_id: n.target_user_id, status: 'failed', reason: msg })
      })

      emailPromises.push(sendPromise)
    }

    // Await all email sends (non-blocking to caller — settled before response)
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises)
    }

    const emailFailed = emailResults.filter((r) => r.status === 'failed')
    if (emailFailed.length > 0) {
      console.error(`[send-notification] ${emailFailed.length} email(s) failed:`, JSON.stringify(emailFailed))
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: rows.length,
        email_results: emailResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('send-notification error:', e instanceof Error ? e.message : String(e))
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
