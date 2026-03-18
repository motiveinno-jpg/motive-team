import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = 0.025; // 2.5%

// CEO 결제 알림 (모든 결제 이벤트 시 이메일 발송)
const CEO_NOTIFY_EMAIL = "hee@motiveinno.com";

async function notifyCEO(subject: string, body: string, supabase?: any) {
  // DB 알림 (항상 실행 — 앱 내 알림)
  if (supabase) {
    try {
      // CEO user를 찾아서 알림
      const { data: ceo } = await supabase
        .from("users")
        .select("id")
        .eq("email", CEO_NOTIFY_EMAIL)
        .single();
      if (ceo) {
        await supabase.from("notifications").insert({
          user_id: ceo.id,
          type: "payment",
          title: subject,
          body: body.replace(/<[^>]*>/g, "").substring(0, 300),
          is_read: false,
        });
      }
    } catch (e) {
      console.error("CEO DB notify failed:", e);
    }
  }

  // 이메일 알림 (Resend 키가 있을 때만)
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Whistle AI <noreply@whistle-ai.com>",
        to: [CEO_NOTIFY_EMAIL],
        subject: `[Whistle Payment] ${subject}`,
        html: `<div style="font-family:sans-serif;padding:20px">
          <h2 style="color:#4CAF50">💳 Whistle AI Payment Alert</h2>
          <div style="padding:16px;background:#f5f5f5;border-radius:8px;margin:12px 0">
            ${body}
          </div>
          <p style="color:#999;font-size:12px">This is an automated notification from Whistle AI Payment System.</p>
        </div>`,
      }),
    });
  } catch (e) {
    console.error("CEO notify failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      return new Response("Webhook not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Missing signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      /* ─── ONE-TIME PAYMENT (escrow, analysis) ─── */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        // CEO 결제 알림 (모든 checkout 완료 시)
        const amt = ((session.amount_total || 0) / 100).toFixed(2);
        const cur = session.currency?.toUpperCase() || "USD";
        await notifyCEO(
          `${cur} ${amt} — ${meta.type || "payment"}`,
          `<p><strong>Type:</strong> ${meta.type || "unknown"}</p>
           <p><strong>Amount:</strong> ${cur} ${amt}</p>
           <p><strong>Deal ID:</strong> ${meta.deal_id || "N/A"}</p>
           <p><strong>User:</strong> ${meta.user_id || "N/A"}</p>
           <p><strong>Session:</strong> ${session.id}</p>
           <p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
          supabase
        );

        if (meta.type === "escrow") {
          const paymentAmt = (session.amount_total || 0) / 100;
          const paymentCur = session.currency?.toUpperCase() || "USD";
          const paymentType = meta.payment_type || "sample"; // sample, deposit, full

          await supabase.from("payments").insert({
            user_id: meta.user_id,
            deal_id: meta.deal_id,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            amount: paymentAmt,
            currency: paymentCur,
            status: "held",
            type: "escrow",
            payment_type: paymentType,
            platform_fee: paymentAmt * PLATFORM_FEE_RATE,
            net_amount: paymentAmt * (1 - PLATFORM_FEE_RATE),
            created_at: new Date().toISOString(),
          });

          // Auto-update deal/matching status based on payment type
          if (meta.deal_id) {
            const dealUpdate: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };

            if (paymentType === "sample") {
              dealUpdate.sample_payment_status = "paid";
              dealUpdate.sample_paid_at = new Date().toISOString();
            } else if (paymentType === "deposit") {
              dealUpdate.deposit_payment_status = "paid";
              dealUpdate.deposit_paid_at = new Date().toISOString();
            } else if (paymentType === "full") {
              dealUpdate.payment_status = "paid";
              dealUpdate.full_paid_at = new Date().toISOString();
            }

            await supabase
              .from("matchings")
              .update(dealUpdate)
              .eq("id", meta.deal_id);

            // Also update related order if exists
            await supabase
              .from("orders")
              .update({
                payment_status: paymentType === "deposit" ? "deposit_paid" : "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("deal_id", meta.deal_id);

            // Update service_requests (escrow record)
            await supabase
              .from("service_requests")
              .update({
                status: "payment_held",
                updated_at: new Date().toISOString(),
              })
              .eq("type", "escrow_" + meta.deal_id);
          }

          // Notify seller that payment is held
          if (meta.deal_id) {
            const { data: matching } = await supabase
              .from("matchings")
              .select("user_id, buyer_company")
              .eq("id", meta.deal_id)
              .single();
            if (matching) {
              const payLabel = paymentType === "sample" ? "샘플비" :
                               paymentType === "deposit" ? "선금(계약금)" : "전체 결제";
              await supabase.from("notifications").insert({
                user_id: matching.user_id,
                type: "payment",
                title: `💰 ${payLabel} 결제 완료`,
                body: `${matching.buyer_company || "바이어"}가 ${payLabel} ${paymentCur} ${paymentAmt.toFixed(2)}를 결제했습니다. 에스크로 보관 중입니다.`,
                link_page: "deals",
                link_id: meta.deal_id,
                is_read: false,
              });
            }
          }
        } else if (meta.type === "one_analysis") {
          await supabase.from("payments").insert({
            user_id: meta.user_id,
            stripe_session_id: session.id,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || "USD",
            status: "completed",
            type: "one_analysis",
            created_at: new Date().toISOString(),
          });

          // Grant one analysis credit
          await supabase.rpc("increment_analysis_credits", {
            uid: meta.user_id,
            credits: 1,
          });
        } else if (meta.type === "subscription") {
          // Subscription created via checkout
          await supabase
            .from("users")
            .update({
              plan: meta.plan || "starter",
              subscription_status: "active",
              stripe_subscription_id: session.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq("id", meta.user_id);
        }
        break;
      }

      /* ─── ESCROW: CAPTURE (auto-release / settlement) ─── */
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};

        if (meta.type === "escrow" && meta.deal_id) {
          const capturedAmt = (pi.amount_received || pi.amount) / 100;
          const capturedCur = pi.currency?.toUpperCase() || "USD";

          await supabase
            .from("payments")
            .update({
              status: "captured",
              captured_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent", pi.id);

          // Update deal: escrow released → settlement complete
          await supabase
            .from("matchings")
            .update({
              settlement_status: "settled",
              settled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", meta.deal_id);

          // Notify seller: funds released
          const { data: deal } = await supabase
            .from("matchings")
            .select("user_id")
            .eq("id", meta.deal_id)
            .single();
          if (deal) {
            const netAmt = (capturedAmt * (1 - PLATFORM_FEE_RATE)).toFixed(2);
            await supabase.from("notifications").insert({
              user_id: deal.user_id,
              type: "payment",
              title: "🏦 정산 완료",
              body: `에스크로 정산이 완료되었습니다. ${capturedCur} ${netAmt} (수수료 2.5% 차감)이 Stripe 계정으로 입금됩니다.`,
              link_page: "deals",
              link_id: meta.deal_id,
              is_read: false,
            });
          }

          await notifyCEO(
            `SETTLED — ${capturedCur} ${capturedAmt.toFixed(2)}`,
            `<p><strong>Escrow Released</strong></p>
             <p>Deal: ${meta.deal_id}</p>
             <p>Net: ${capturedCur} ${(capturedAmt * (1 - PLATFORM_FEE_RATE)).toFixed(2)}</p>
             <p>Fee: ${capturedCur} ${(capturedAmt * PLATFORM_FEE_RATE).toFixed(2)}</p>`,
            supabase
          );
        }
        break;
      }

      /* ─── PAYMENT FAILED ─── */
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};

        await notifyCEO(
          `FAILED — ${pi.currency?.toUpperCase()} ${(pi.amount / 100).toFixed(2)}`,
          `<p style="color:red"><strong>Payment FAILED</strong></p>
           <p><strong>Amount:</strong> ${pi.currency?.toUpperCase()} ${(pi.amount / 100).toFixed(2)}</p>
           <p><strong>Error:</strong> ${(pi as any).last_payment_error?.message || "Unknown"}</p>
           <p><strong>User:</strong> ${meta.user_id || "N/A"}</p>`,
          supabase
        );

        await supabase
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent", pi.id);

        if (meta.user_id) {
          await supabase.from("notifications").insert({
            user_id: meta.user_id,
            type: "payment",
            title: "Payment Failed",
            body: "Your payment could not be processed. Please try again.",
            is_read: false,
          });
        }
        break;
      }

      /* ─── SUBSCRIPTION EVENTS ─── */
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          const status = sub.status === "active" ? "active" :
                         sub.status === "past_due" ? "past_due" :
                         sub.status === "canceled" ? "canceled" : sub.status;
          await supabase
            .from("users")
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await supabase
            .from("users")
            .update({
              plan: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      /* ─── INVOICE (recurring billing) ─── */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId as string);
          const userId = sub.metadata?.user_id;
          if (userId) {
            await supabase.from("payments").insert({
              user_id: userId,
              stripe_session_id: invoice.id,
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency?.toUpperCase() || "USD",
              status: "completed",
              type: "subscription_renewal",
              created_at: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId as string);
          const userId = sub.metadata?.user_id;
          if (userId) {
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "payment",
              title: "Subscription Payment Failed",
              body: "Your subscription payment failed. Please update your payment method.",
              is_read: false,
            });
          }
        }
        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
