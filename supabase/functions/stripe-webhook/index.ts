import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = 0.025; // 2.5%

// Stripe Price ID → Plan mapping (all billing cycles)
const PRICE_TO_PLAN: Record<string, string> = {
  // Monthly
  "price_1TBDCuBEJTGmEnmcZNjeU27n": "starter",
  "price_1TBDCvBEJTGmEnmcu3yS9KwY": "pro",
  "price_1TBDCvBEJTGmEnmcURkitVLN": "enterprise",
  // Semi-annual (6mo)
  "price_1TCG17BEJTGmEnmctEW5svtD": "starter",
  "price_1TCG18BEJTGmEnmcnXYh1Nmc": "pro",
  "price_1TCG18BEJTGmEnmcBzwQVelL": "enterprise",
  // Annual
  "price_1TCG17BEJTGmEnmcZkiwz4SW": "starter",
  "price_1TCG18BEJTGmEnmcSFNLv1ZT": "pro",
  "price_1TCG19BEJTGmEnmcUWaORRHP": "enterprise",
};

function detectPlanFromSubscription(sub: any): string | null {
  // 1. Check metadata first
  if (sub.metadata?.plan) return sub.metadata.plan;
  // 2. Map from price ID
  const items = sub.items?.data;
  if (items?.length > 0) {
    const priceId = items[0].price?.id;
    if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId];
  }
  return null;
}

// Zero-decimal currencies — Stripe amount is already in final units
const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf"];

function toDisplayAmount(amountSmallest: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.includes(currency?.toLowerCase())
    ? amountSmallest
    : amountSmallest / 100;
}

// CEO 결제 알림 (모든 결제 이벤트 시 이메일 발송)
const CEO_NOTIFY_EMAIL = "hee@motiveinno.com";

// 사용자 트랜잭션 이메일 발송 (Resend 직접 호출)
async function notifyUser(
  supabase: any,
  userId: string,
  type: string,
  data: Record<string, string>
) {
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return;

    // Get user email and language preference
    const { data: user } = await supabase
      .from("users")
      .select("email, display_name, preferred_language")
      .eq("id", userId)
      .single();
    if (!user?.email) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Call the transactional email Edge Function internally
    await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": Deno.env.get("INTERNAL_SERVICE_SECRET") || "",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to: user.email,
        user_id: userId,
        type,
        data: { ...data, name: user.display_name || "" },
        lang: user.preferred_language || "en",
      }),
    });
  } catch (e) {
    console.error("notifyUser failed:", e instanceof Error ? e.message : String(e));
  }
}

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
    const testWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");

    if (!stripeKey) {
      return new Response("Webhook not configured", { status: 500 });
    }
    if (!webhookSecret && !testWebhookSecret) {
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

    // Try all available webhook secrets (live first, then test)
    const secrets: string[] = [];
    if (webhookSecret) secrets.push(webhookSecret);
    if (testWebhookSecret) secrets.push(testWebhookSecret);

    let event: Stripe.Event | null = null;
    let lastError: string = "";

    for (const secret of secrets) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        console.log(`[webhook] Signature verified successfully`);
        break;
      } catch (err) {
        lastError = err.message || String(err);
        console.log(`[webhook] Secret verification attempt failed`);
      }
    }

    if (!event) {
      console.error(`[webhook] Signature verification failed: ${lastError}`);
      return new Response("Invalid signature", { status: 400 });
    }

    // Idempotency: atomic insert with unique constraint — prevents race condition
    const { error: idempErr } = await supabase
      .from("webhook_debug_log")
      .insert({ message: event.id, data: { type: event.type } });
    if (idempErr && (idempErr.code === "23505" || idempErr.message?.includes("duplicate"))) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      /* ─── ONE-TIME PAYMENT (escrow, analysis) ─── */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        // CEO 결제 알림 (모든 checkout 완료 시)
        const cur = session.currency?.toUpperCase() || "USD";
        const amt = toDisplayAmount(session.amount_total || 0, session.currency || "usd").toFixed(2);
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
          const paymentAmt = toDisplayAmount(session.amount_total || 0, session.currency || "usd");
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
              .eq("service_type", "escrow_" + meta.deal_id);
          }

          // Notify seller that payment is held
          if (meta.deal_id) {
            const { data: matching } = await supabase
              .from("matchings")
              .select("user_id, buyer_company")
              .eq("id", meta.deal_id)
              .single();
            if (matching) {
              const payLabel = paymentType === "sample" ? "Sample Payment" :
                               paymentType === "deposit" ? "Deposit Payment" : "Full Payment";
              const buyerName = matching.buyer_company || "Buyer";
              await supabase.from("notifications").insert({
                user_id: matching.user_id,
                type: "payment",
                title: `Payment Received — ${payLabel}`,
                body: `${buyerName} paid ${paymentCur} ${paymentAmt.toFixed(2)} (${payLabel}). Funds are held in escrow.`,
                link_page: "deals",
                link_id: meta.deal_id,
                is_read: false,
              });

              // Also notify seller via email
              await notifyUser(supabase, matching.user_id, "payment_confirmation", {
                amount: paymentAmt.toFixed(2),
                currency: paymentCur,
                payment_type: `${payLabel} from ${buyerName} (Escrow)`,
                date: new Date().toISOString().split("T")[0],
              });
            }
          }
          // Email buyer: escrow payment confirmation
          if (meta.user_id) {
            await notifyUser(supabase, meta.user_id, "payment_confirmation", {
              amount: paymentAmt.toFixed(2),
              currency: paymentCur,
              payment_type: paymentType === "sample" ? "Sample Payment (Escrow)" :
                            paymentType === "deposit" ? "Deposit Payment (Escrow)" : "Full Payment (Escrow)",
              date: new Date().toISOString().split("T")[0],
            });
          }
        } else if (meta.type === "one_analysis") {
          await supabase.from("payments").insert({
            user_id: meta.user_id,
            stripe_session_id: session.id,
            amount: toDisplayAmount(session.amount_total || 0, session.currency || "usd"),
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

          // Email user: single analysis purchased
          if (meta.user_id) {
            await notifyUser(supabase, meta.user_id, "payment_confirmation", {
              amount: toDisplayAmount(session.amount_total || 0, session.currency || "usd").toFixed(2),
              currency: session.currency?.toUpperCase() || "USD",
              payment_type: "Single AI Analysis",
              date: new Date().toISOString().split("T")[0],
            });
          }
        } else if (meta.type === "subscription") {
          // Subscription created via checkout — update user + record payment
          await supabase
            .from("users")
            .update({
              plan: meta.plan || "starter",
              subscription_status: "active",
              stripe_subscription_id: session.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq("id", meta.user_id);

          // Record first subscription payment for refund eligibility
          // session.payment_intent is null for subscriptions — get from latest invoice
          let subPaymentIntent = session.payment_intent;
          if (!subPaymentIntent && session.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
                expand: ["latest_invoice"],
              });
              const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
              subPaymentIntent = latestInvoice?.payment_intent as string | null;
            } catch (e) {
              console.error("[webhook] Failed to retrieve subscription invoice:", e);
            }
          }

          await supabase.from("payments").insert({
            user_id: meta.user_id,
            stripe_session_id: session.id,
            stripe_payment_intent: subPaymentIntent,
            amount: toDisplayAmount(session.amount_total || 0, session.currency || "usd"),
            currency: session.currency?.toUpperCase() || "USD",
            status: "completed",
            type: "subscription",
            created_at: new Date().toISOString(),
          });

          // Email user: subscription confirmed
          if (meta.user_id) {
            const planName = (meta.plan || "starter").charAt(0).toUpperCase() + (meta.plan || "starter").slice(1);
            await notifyUser(supabase, meta.user_id, "payment_confirmation", {
              amount: amt,
              currency: cur,
              payment_type: `${planName} Plan Subscription`,
              plan: planName,
              date: new Date().toISOString().split("T")[0],
            });
          }
        }
        break;
      }

      /* ─── PAYMENT INTENT SUCCEEDED ─── */
      // With full-capture escrow model, this fires immediately at checkout.
      // Escrow settlement is handled by auto-settle function + manage-subscription
      // release_escrow action, NOT by this event. Only log non-escrow successes.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};

        if (meta.type === "escrow" && meta.deal_id) {
          // Escrow: payment was charged at checkout. The checkout.session.completed
          // handler already recorded it as "held". No further action needed here.
          // Settlement to seller happens via auto-settle or manual release_escrow.
          console.log(
            `Escrow payment_intent.succeeded for deal ${meta.deal_id} — already tracked as held`,
          );
        }
        break;
      }

      /* ─── PAYMENT FAILED ─── */
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};

        await notifyCEO(
          `FAILED — ${pi.currency?.toUpperCase()} ${toDisplayAmount(pi.amount, pi.currency || "usd").toFixed(2)}`,
          `<p style="color:red"><strong>Payment FAILED</strong></p>
           <p><strong>Amount:</strong> ${pi.currency?.toUpperCase()} ${toDisplayAmount(pi.amount, pi.currency || "usd").toFixed(2)}</p>
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
          const isCanceling = sub.cancel_at_period_end === true && sub.status === "active";
          const status = isCanceling ? "canceling" :
                         sub.status === "active" ? "active" :
                         sub.status === "past_due" ? "past_due" :
                         sub.status === "canceled" ? "canceled" : sub.status;

          const updateData: Record<string, any> = {
            subscription_status: status,
            updated_at: new Date().toISOString(),
          };

          // Sync plan field from subscription price
          const detectedPlan = detectPlanFromSubscription(sub);
          if (detectedPlan) {
            updateData.plan = detectedPlan;
          }

          await supabase
            .from("users")
            .update(updateData)
            .eq("id", userId);

          // Notify on plan change
          if (detectedPlan) {
            const planName = detectedPlan.charAt(0).toUpperCase() + detectedPlan.slice(1);
            await notifyCEO(
              `Plan Change → ${planName} (${status})`,
              `<p><strong>User:</strong> ${userId}</p>
               <p><strong>New Plan:</strong> ${planName}</p>
               <p><strong>Status:</strong> ${status}</p>`,
              supabase
            );
            await notifyUser(supabase, userId, "subscription_change", {
              action: isCanceling ? "Canceling at period end" : "Plan Updated",
              details: isCanceling
                ? `Your ${planName} plan will remain active until the end of the billing period.`
                : `Your plan has been updated to ${planName}.`,
              new_plan: planName,
            });
          }
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

          // Email user: subscription canceled
          await notifyUser(supabase, userId, "subscription_change", {
            action: "Canceled",
            details: "Your subscription has been canceled. You are now on the Free plan.",
            new_plan: "Free",
          });
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
              amount: toDisplayAmount(invoice.amount_paid || 0, invoice.currency || "usd"),
              currency: invoice.currency?.toUpperCase() || "USD",
              status: "completed",
              type: "subscription_renewal",
              created_at: new Date().toISOString(),
            });

            // Ensure plan stays synced on renewal
            const detectedPlan = detectPlanFromSubscription(sub);
            if (detectedPlan) {
              await supabase
                .from("users")
                .update({
                  plan: detectedPlan,
                  subscription_status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", userId);
            }
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

            // Email user: payment failed
            await notifyUser(supabase, userId, "subscription_change", {
              action: "Payment Failed",
              details: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
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
