import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FROM_EMAIL = "Whistle AI <hello@whistle-ai.com>";
const MAX_BATCH_SIZE = 40; // Leave 10/hr headroom for transactional emails
const MAX_EMAILS_PER_HOUR = 50;

// ─── Email Template Helpers (same pattern as send-marketing-email) ────

function darkBaseLayout(preheader: string, body: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Whistle AI</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;max-width:100%!important}
      .fluid{max-width:100%!important;height:auto!important}
      .stack-column{display:block!important;width:100%!important}
      .pad-mobile{padding-left:20px!important;padding-right:20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111118;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
        <tr><td style="padding:32px 40px 24px;text-align:center;background:linear-gradient(135deg,#0B1120 0%,#111827 100%);border-bottom:1px solid #1e1e2e">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center">
              <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px">
                <span style="color:#0B63F2">W</span><span style="color:#ffffff">histle AI</span>
              </h1>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px;letter-spacing:0.5px">AI-POWERED EXPORT MANAGEMENT</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="pad-mobile" style="padding:32px 40px">
          ${body}
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#0a0a0f;border-top:1px solid #1e1e2e;text-align:center">
          <p style="margin:0 0 12px;color:#4b5563;font-size:12px;line-height:1.5">
            MOTIVE Innovation Inc. (Korea) &middot; MOTIVE Global, Inc. (USA, Delaware)<br>
            B-1903, 220 Dongtan Jungang-ro, Hwaseong-si, Gyeonggi-do, Korea
          </p>
          <p style="margin:0 0 12px;color:#4b5563;font-size:12px">
            <a href="https://whistle-ai.com/terms" style="color:#6b7280;text-decoration:underline">Terms</a> &nbsp;&middot;&nbsp;
            <a href="https://whistle-ai.com/privacy" style="color:#6b7280;text-decoration:underline">Privacy</a> &nbsp;&middot;&nbsp;
            <a href="https://whistle-ai.com/refund" style="color:#6b7280;text-decoration:underline">Refund</a>
          </p>
          <p style="margin:0;color:#6b7280;font-size:11px">
            <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a> from marketing emails
          </p>
          <p style="margin:8px 0 0;color:#374151;font-size:10px">&copy; 2026 MOTIVE Innovation Inc. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0B63F2 0%,#3B82F6 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;mso-padding-alt:14px 36px">${text}</a>
    </td></tr>
  </table>`;
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0">
    <tr>
      <td width="40" valign="top" style="padding-right:12px;font-size:20px">${icon}</td>
      <td>
        <p style="margin:0 0 2px;color:#f3f4f6;font-size:14px;font-weight:600">${title}</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">${desc}</p>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-top:1px solid #1e1e2e"></td></tr></table>`;
}

function statBlock(number: string, label: string): string {
  return `<td style="text-align:center;padding:12px 8px">
    <p style="margin:0;color:#0B63F2;font-size:24px;font-weight:800">${number}</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:11px">${label}</p>
  </td>`;
}

// ─── Drip Templates ──────────────────────────────────────

interface TemplateResult {
  subject: string;
  html: string;
}

function getDripTemplate(templateKey: string, unsubscribeUrl: string, contact?: { name?: string; company_name?: string }): TemplateResult {
  const companyName = contact?.company_name || contact?.name || "";

  switch (templateKey) {
    // ─── Korean Manufacturer ─────────────────
    case "korean_mfg_intro":
      return {
        subject: "AI\ub85c \uc218\ucd9c \uc11c\ub958 \uc790\ub3d9\ud654 \u2014 Whistle AI \ubb34\ub8cc \uccb4\ud5d8",
        html: darkBaseLayout(
          "\uc218\ucd9c \uc11c\ub958 \uc790\ub3d9\ud654 \u2014 \uc81c\ud488 \uc0ac\uc9c4 \ud55c \uc7a5\uc73c\ub85c HS\ucf54\ub4dc, FTA, \ubc14\uc774\uc5b4 \ub9e4\uce6d\uae4c\uc9c0",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? companyName + " " : ""}\ub2f4\ub2f9\uc790\ub2d8 \uc548\ub155\ud558\uc138\uc694,<br><br>
            \uc218\ucd9c \uc11c\ub958 \uc791\uc131\uc5d0 \ub9e4\ubc88 \uba87 \uc2dc\uac04\uc529 \uc18c\ube44\ud558\uace0 \uacc4\uc2e0\uac00\uc694?<br>
            <strong style="color:#ffffff">HS\ucf54\ub4dc \ubd84\ub958, FTA \uc6d0\uc0b0\uc9c0 \ud310\uc815, \ubc14\uc774\uc5b4 \ub9e4\uce6d</strong>\uae4c\uc9c0<br>
            AI\uac00 60\ucd08 \uc548\uc5d0 \ucc98\ub9ac\ud574 \ub4dc\ub9bd\ub2c8\ub2e4.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHISTLE AI\uac00 \ud574\uacb0\ud558\ub294 \ubb38\uc81c</p>
          ${featureRow("\ud83d\udccb", "HS\ucf54\ub4dc \uc790\ub3d9 \ubd84\ub958", "\uc81c\ud488 \uc0ac\uc9c4 \ud55c \uc7a5\uc73c\ub85c HS\ucf54\ub4dc 6\uc790\ub9ac \uc790\ub3d9 \ubd84\ub958. \uad00\uc138\uc728, FTA \ud2b9\ud61c\uc138\uc728\uae4c\uc9c0 \uc989\uc2dc \ud655\uc778.")}
          ${featureRow("\ud83c\udf0d", "AI \ud0c0\uac9f \uc2dc\uc7a5 \ubd84\uc11d", "31\uac1c\uad6d \uc218\ucd9c \uc801\ud569\ub3c4 \ubd84\uc11d. \uc2dc\uc7a5 \uaddc\ubaa8, \uacbd\uc7c1 \uac15\ub3c4, \uaddc\uc81c \uc694\uac74\uc744 AI\uac00 \uc885\ud569 \ud310\ub2e8.")}
          ${featureRow("\ud83e\udd1d", "\uae00\ub85c\ubc8c \ubc14\uc774\uc5b4 \ub9e4\uce6d", "\uac80\uc99d\ub41c \uae00\ub85c\ubc8c \ubc14\uc774\uc5b4\uc640 \uc790\ub3d9 \ub9e4\uce6d. \ud611\uc0c1\ubd80\ud130 \uacb0\uc81c\uae4c\uc9c0 \ud50c\ub7ab\ud3fc \uc548\uc5d0\uc11c \uc644\uacb0.")}
          ${featureRow("\ud83d\udcc4", "\uc218\ucd9c \uc11c\ub958 \uc790\ub3d9 \uc0dd\uc131", "Commercial Invoice, Packing List, \uc6d0\uc0b0\uc9c0\uc99d\uba85\uc11c \ub4f1 AI\uac00 \uc790\ub3d9 \uc791\uc131.")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">\uc9c0\uae08 \ubb34\ub8cc\ub85c \uc2dc\uc791\ud558\uc138\uc694</p>
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">\uac00\uc785 \ud6c4 AI \uc218\ucd9c \ubd84\uc11d 1\ud68c \ubb34\ub8cc \uc81c\uacf5</p>
          ${ctaButton("\ubb34\ub8cc\ub85c \uc2dc\uc791\ud558\uae30", "https://whistle-ai.com/ko")}`,
          unsubscribeUrl,
        ),
      };

    case "korean_mfg_feature":
      return {
        subject: "HS\ucf54\ub4dc \uc790\ub3d9 \ubd84\ub958 & FTA \ud61c\ud0dd, \uc544\uc9c1 \uc218\uc791\uc5c5 \ud558\uc138\uc694?",
        html: darkBaseLayout(
          "AI\uac00 60\ucd08\ub9cc\uc5d0 HS\ucf54\ub4dc \ubd84\ub958\ud558\uace0 FTA \ud61c\ud0dd\uc744 \ucc3e\uc544\ub4dc\ub9bd\ub2c8\ub2e4",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? companyName + " " : ""}\ub2f4\ub2f9\uc790\ub2d8,<br><br>
            \ud55c\uad6d\uc740 \ud604\uc7ac <strong style="color:#ffffff">59\uac1c\uad6d\uacfc FTA\ub97c \uccb4\uacb0</strong>\ud558\uace0 \uc788\uc9c0\ub9cc,<br>
            \ub9ce\uc740 \uc81c\uc870\uc0ac\uac00 FTA \ud61c\ud0dd\uc744 \ud65c\uc6a9\ud558\uc9c0 \ubabb\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHISTLE AI \ud575\uc2ec \uae30\ub2a5</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
            <tr>
              ${statBlock("60\ucd08", "HS\ucf54\ub4dc \ubd84\ub958")}
              ${statBlock("31\uac1c\uad6d", "FTA \ubd84\uc11d")}
              ${statBlock("80%", "\uc2dc\uac04 \uc808\uac10")}
            </tr>
          </table>
          ${featureRow("\ud83d\udcf8", "\uc0ac\uc9c4 \ud55c \uc7a5\uc73c\ub85c \ub05d", "\uc81c\ud488 \uc0ac\uc9c4\uc744 \uc5c5\ub85c\ub4dc\ud558\uba74 AI\uac00 HS\ucf54\ub4dc 6\uc790\ub9ac\ub97c \uc790\ub3d9 \ubd84\ub958\ud569\ub2c8\ub2e4.")}
          ${featureRow("\ud83d\udcb0", "FTA \ud2b9\ud61c\uc138\uc728 \uc790\ub3d9 \uc801\uc6a9", "\ud574\ub2f9 \uc81c\ud488\uc5d0 \uc801\uc6a9 \uac00\ub2a5\ud55c FTA \ud61c\ud0dd\uc744 \uc790\ub3d9\uc73c\ub85c \ucc3e\uc544\ub4dc\ub9bd\ub2c8\ub2e4.")}
          ${featureRow("\ud83d\udcca", "\uc2dc\uc7a5 \uc218\uc694 \ubd84\uc11d", "\uc5b4\ub290 \ub098\ub77c\uc5d0\uc11c \ud574\ub2f9 \uc81c\ud488 \uc218\uc694\uac00 \ub192\uc740\uc9c0 \ub370\uc774\ud130\ub85c \ud655\uc778\ud558\uc138\uc694.")}
          ${divider()}
          ${ctaButton("AI \uc218\ucd9c \ubd84\uc11d \ubb34\ub8cc \uccb4\ud5d8", "https://whistle-ai.com/ko")}`,
          unsubscribeUrl,
        ),
      };

    case "korean_mfg_case_study":
      return {
        subject: "\ud654\uc7a5\ud488 \uc81c\uc870\uc0ac, \uc218\ucd9c \uc11c\ub958 \uc2dc\uac04 80% \uc808\uac10\ud55c \ubc29\ubc95",
        html: darkBaseLayout(
          "\uc2e4\uc81c \uc81c\uc870\uc0ac\uac00 Whistle AI\ub85c \uc218\ucd9c \ud504\ub85c\uc138\uc2a4\ub97c \ud601\uc2e0\ud55c \uc0ac\ub840",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? companyName + " " : ""}\ub2f4\ub2f9\uc790\ub2d8,<br><br>
            K-Beauty \uc81c\uc870\uc0ac\ub4e4\uc774 Whistle AI\ub85c<br>
            \uc5b4\ub5bb\uac8c \uc218\ucd9c \ud504\ub85c\uc138\uc2a4\ub97c \ubc14\uafb8\uace0 \uc788\ub294\uc9c0 \uacf5\uc720\ub4dc\ub9bd\ub2c8\ub2e4.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">\uc131\uacf5 \uc0ac\ub840</p>
          <div style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px;color:#f3f4f6;font-size:14px;font-weight:600">\ud83c\udfed K-Beauty \uc81c\uc870\uc0ac \uc0ac\ub840</p>
            <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;line-height:1.6">
              "\uc774\uc804\uc5d0\ub294 HS\ucf54\ub4dc \ud655\uc778\ub9cc 2\uc2dc\uac04\uc774 \uac78\ub838\ub294\ub370, \uc9c0\uae08\uc740 1\ubd84\uc774\uba74 \ub429\ub2c8\ub2e4. FTA \ud61c\ud0dd\ub3c4 \uc790\ub3d9\uc73c\ub85c \ucc3e\uc544\uc8fc\ub2c8 \uc808\uac10\ub418\ub294 \uad00\uc138\uac00 \uc0c1\ub2f9\ud569\ub2c8\ub2e4."
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${statBlock("80%", "\uc11c\ub958 \uc2dc\uac04 \uc808\uac10")}
                ${statBlock("15%", "\uad00\uc138 \uc808\uac10")}
                ${statBlock("3\uac1c\uad6d", "\uc2e0\uaddc \uc218\ucd9c\uad6d")}
              </tr>
            </table>
          </div>
          ${featureRow("\ud83d\ude80", "\uc218\ucd9c\ubc14\uc6b0\ucc98 \uc5f0\uacc4", "\uc218\ucd9c\ubc14\uc6b0\ucc98 \uc0ac\uc5c5\uacfc \uc5f0\uacc4\ud558\uc5ec Whistle AI\ub97c \ub354\uc6b1 \ud6a8\uacfc\uc801\uc73c\ub85c \ud65c\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.")}
          ${divider()}
          ${ctaButton("\ub098\ub3c4 \uc2dc\uc791\ud558\uae30", "https://whistle-ai.com/ko")}`,
          unsubscribeUrl,
        ),
      };

    case "korean_mfg_cta":
      return {
        subject: "\uc9c0\uae08 \ubb34\ub8cc AI \uc218\ucd9c \ubd84\uc11d\uc744 \ubc1b\uc544\ubcf4\uc138\uc694",
        html: darkBaseLayout(
          "\ub9c8\uc9c0\ub9c9 \uc548\ub0b4: \ubb34\ub8cc AI \uc218\ucd9c \ubd84\uc11d \uccb4\ud5d8",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? companyName + " " : ""}\ub2f4\ub2f9\uc790\ub2d8,<br><br>
            \uc9c0\ub09c \uba54\uc77c\uc5d0\uc11c Whistle AI\uc758 \uae30\ub2a5\uc744 \uc18c\uac1c\ud574 \ub4dc\ub838\uc2b5\ub2c8\ub2e4.<br><br>
            <strong style="color:#ffffff">\uc9c0\uae08 \uac00\uc785\ud558\uc2dc\uba74 AI \uc218\ucd9c \ubd84\uc11d 1\ud68c\ub97c \ubb34\ub8cc\ub85c</strong> \ub4dc\ub9bd\ub2c8\ub2e4.<br>
            \uc81c\ud488 \uc0ac\uc9c4 \ud55c \uc7a5\ub9cc \uc5c5\ub85c\ub4dc\ud574 \ubcf4\uc138\uc694.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">\ubb34\ub8cc\ub85c \ubc1b\uc744 \uc218 \uc788\ub294 \uac83</p>
          ${featureRow("\u2705", "HS\ucf54\ub4dc 6\uc790\ub9ac \uc790\ub3d9 \ubd84\ub958", "\uad00\uc138\uc728 \ud655\uc778 \ud3ec\ud568")}
          ${featureRow("\u2705", "31\uac1c\uad6d \uc218\ucd9c \uc801\ud569\ub3c4 \ubd84\uc11d", "\uc2dc\uc7a5 \uaddc\ubaa8 \ubc0f \uacbd\uc7c1 \ubd84\uc11d")}
          ${featureRow("\u2705", "FTA \ud61c\ud0dd \ubd84\uc11d", "\uc801\uc6a9 \uac00\ub2a5\ud55c \ud2b9\ud61c\uc138\uc728 \ud655\uc778")}
          ${featureRow("\u2705", "\uaddc\uc81c \uc694\uac74 \uc694\uc57d", "\ub300\uc0c1\uad6d \uc218\uc785 \uaddc\uc81c \uc548\ub0b4")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">\uc2e0\uc6a9\uce74\ub4dc \uc5c6\uc774, 1\ubd84\uc774\uba74 \ub429\ub2c8\ub2e4</p>
          ${ctaButton("\ubb34\ub8cc \ubd84\uc11d \ubc1b\uae30", "https://whistle-ai.com/ko")}
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;text-align:center;line-height:1.6">
            \uad81\uae08\ud55c \uc810\uc774 \uc788\uc73c\uc2dc\uba74 <a href="mailto:support@whistle-ai.com" style="color:#0B63F2;text-decoration:none">support@whistle-ai.com</a>\uc73c\ub85c \ubb38\uc758\ud574 \uc8fc\uc138\uc694.
          </p>`,
          unsubscribeUrl,
        ),
      };

    // ─── Global Manufacturer ─────────────────
    case "global_mfg_intro":
      return {
        subject: "Automate Your Export Documents with AI \u2014 Free Trial",
        html: darkBaseLayout(
          "Automate HS codes, FTA analysis, and export documents with AI",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            Export compliance shouldn't slow you down.<br>
            <strong style="color:#ffffff">Whistle AI</strong> automates HS code classification, FTA analysis,
            and document generation \u2014 so you can focus on growing your international sales.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHAT WHISTLE AI DOES FOR EXPORTERS</p>
          ${featureRow("\ud83e\udd16", "AI Document Automation", "Upload a product photo \u2014 get HS codes, tariff rates, and FTA benefits in 60 seconds.")}
          ${featureRow("\ud83c\udf10", "31-Country Market Intelligence", "AI analyzes market size, competition, regulations, and tariffs across 31 countries.")}
          ${featureRow("\ud83d\udcbc", "Global Buyer Network", "Get matched with verified importers actively looking for products in your category.")}
          ${featureRow("\ud83d\udccb", "Compliance Made Simple", "Sanctions screening, export control checks, and documentation \u2014 automated.")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">Ready to Export Smarter?</p>
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">1 free AI analysis included. No credit card required.</p>
          ${ctaButton("Start Free Trial", "https://whistle-ai.com/en/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_mfg_feature":
      return {
        subject: "Stop Guessing HS Codes \u2014 Let AI Handle It in 60 Seconds",
        html: darkBaseLayout(
          "AI-powered HS code classification and FTA analysis for exporters",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            Manual HS code research takes hours and errors cost thousands in customs penalties.<br>
            <strong style="color:#ffffff">Whistle AI classifies products in 60 seconds</strong> with 95%+ accuracy.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">HOW IT WORKS</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
            <tr>
              ${statBlock("60s", "Classification")}
              ${statBlock("31", "Countries")}
              ${statBlock("80%", "Time Saved")}
            </tr>
          </table>
          ${featureRow("\ud83d\udcf8", "Upload a Product Photo", "Our AI analyzes the image and classifies the HS code to 6-digit level.")}
          ${featureRow("\ud83d\udcb0", "Automatic FTA Benefits", "Instantly see which FTA agreements apply and how much you can save on tariffs.")}
          ${featureRow("\ud83d\udcca", "Market Demand Analysis", "AI shows which countries have the highest demand for your product category.")}
          ${divider()}
          ${ctaButton("Try AI Classification Free", "https://whistle-ai.com/en/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_mfg_case_study":
      return {
        subject: "How Exporters Save 10+ Hours/Week with Whistle AI",
        html: darkBaseLayout(
          "Real results from manufacturers using Whistle AI for export automation",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            Manufacturers across Asia are already using Whistle AI<br>
            to transform their export operations. Here's what they're achieving:
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">RESULTS</p>
          <div style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px;color:#f3f4f6;font-size:14px;font-weight:600">\ud83c\udfed Electronics Manufacturer</p>
            <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;line-height:1.6">
              "We used to spend 3 hours per shipment on HS code research and document prep. Now it takes 15 minutes. The FTA analysis alone saved us $12,000 in tariffs last quarter."
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${statBlock("80%", "Time Saved")}
                ${statBlock("$12K", "Tariff Savings")}
                ${statBlock("5", "New Markets")}
              </tr>
            </table>
          </div>
          ${featureRow("\ud83d\ude80", "Export Voucher Integration", "Korean manufacturers can use export vouchers (수출바우처) to access Whistle AI at no cost.")}
          ${divider()}
          ${ctaButton("Start Your Free Trial", "https://whistle-ai.com/en/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_mfg_cta":
      return {
        subject: "Your Free AI Export Analysis Is Waiting",
        html: darkBaseLayout(
          "Last chance: claim your free AI export analysis",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            Over the past weeks, we've shown you how Whistle AI can<br>
            <strong style="color:#ffffff">automate HS codes, find FTA savings, and connect you with buyers</strong>.<br><br>
            Your free AI analysis is still available. Just upload one product photo.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">YOUR FREE ANALYSIS INCLUDES</p>
          ${featureRow("\u2705", "6-Digit HS Code Classification", "With tariff rates for your target markets")}
          ${featureRow("\u2705", "31-Country Export Suitability", "Market size and competition analysis")}
          ${featureRow("\u2705", "FTA Benefit Analysis", "Applicable preferential tariff rates")}
          ${featureRow("\u2705", "Regulatory Requirements", "Import regulations for target countries")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">No credit card. Takes 1 minute.</p>
          ${ctaButton("Get Free Analysis", "https://whistle-ai.com/en/")}`,
          unsubscribeUrl,
        ),
      };

    // ─── Global Buyer ────────────────────────
    case "global_buyer_intro":
      return {
        subject: "Source Quality Products from Asia \u2014 AI-Powered Platform",
        html: darkBaseLayout(
          "Find verified Asian manufacturers with AI-powered matching and secure escrow",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            Finding reliable manufacturers in Asia shouldn't be this hard.<br>
            <strong style="color:#ffffff">Whistle AI</strong> connects you with verified Korean and Asian manufacturers,
            handles compliance, and manages procurement \u2014 all in one platform.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHY BUYERS CHOOSE WHISTLE AI</p>
          ${featureRow("\ud83d\udd0d", "Verified Manufacturers", "Every supplier is pre-screened. Business registration, export history, and quality certifications verified.")}
          ${featureRow("\ud83d\udcca", "AI-Powered Matching", "Describe what you need \u2014 our AI finds the best-fit manufacturers by capability and track record.")}
          ${featureRow("\ud83d\udee1\ufe0f", "Secure Transactions", "Escrow payments protect both parties. Funds released only when you confirm delivery.")}
          ${featureRow("\ud83d\udce6", "End-to-End Management", "Sourcing to shipping \u2014 customs, freight, documentation handled in-platform.")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">Start Sourcing Smarter</p>
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">100% free for buyers. No commitment required.</p>
          ${ctaButton("Find Suppliers Now", "https://whistle-ai.com/global-buyer/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_buyer_feature":
      return {
        subject: "Every Supplier Verified \u2014 Here's How We Do It",
        html: darkBaseLayout(
          "How Whistle AI verifies every manufacturer on the platform",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            The biggest risk in international sourcing? <strong style="color:#ffffff">Unverified suppliers.</strong><br><br>
            That's why every manufacturer on Whistle AI goes through our verification process.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">OUR VERIFICATION PROCESS</p>
          ${featureRow("\ud83d\udcdd", "Business Registration", "We verify official business registration, tax ID, and company history.")}
          ${featureRow("\ud83c\udfed", "Factory Verification", "Production capacity, quality certifications (ISO, GMP, HACCP), and facility details confirmed.")}
          ${featureRow("\ud83d\udce6", "Export Track Record", "Real export history verified through trade data and customs records.")}
          ${featureRow("\ud83d\udee1\ufe0f", "Sanctions Screening", "Every company screened against global sanctions lists before approval.")}
          ${divider()}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
            <tr>
              ${statBlock("100%", "Verified")}
              ${statBlock("K-Beauty", "K-Food & More")}
              ${statBlock("FREE", "For Buyers")}
            </tr>
          </table>
          ${ctaButton("Browse Verified Suppliers", "https://whistle-ai.com/global-buyer/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_buyer_case_study":
      return {
        subject: "Your Money Is Safe \u2014 How Escrow Protects Every Transaction",
        html: darkBaseLayout(
          "Secure escrow payments protect every transaction on Whistle AI",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            International payments are stressful. Wire money overseas and hope for the best?<br>
            <strong style="color:#ffffff">Not with Whistle AI.</strong> Our escrow system protects every transaction.
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">HOW ESCROW WORKS</p>
          ${featureRow("1\ufe0f\u20e3", "Place Order", "Agree on terms with the manufacturer and place your order through the platform.")}
          ${featureRow("2\ufe0f\u20e3", "Funds Held Securely", "Your payment is held in escrow by Stripe \u2014 the manufacturer sees the commitment but can't access funds yet.")}
          ${featureRow("3\ufe0f\u20e3", "Receive & Inspect", "When goods arrive, inspect quality. You have 14 days to confirm satisfaction.")}
          ${featureRow("4\ufe0f\u20e3", "Release Payment", "Confirm delivery and funds are released to the manufacturer. Everyone wins.")}
          ${divider()}
          <div style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px;color:#f3f4f6;font-size:14px;font-weight:600">\ud83d\udee1\ufe0f Your Protection Guarantees</p>
            <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.8">
              \u2022 Full refund if goods don't match description<br>
              \u2022 Dispute resolution with evidence review<br>
              \u2022 Powered by Stripe \u2014 bank-grade security<br>
              \u2022 Auto-cancel if manufacturer doesn't accept within 3 days
            </p>
          </div>
          ${ctaButton("Start Sourcing Safely", "https://whistle-ai.com/global-buyer/")}`,
          unsubscribeUrl,
        ),
      };

    case "global_buyer_cta":
      return {
        subject: "Start Sourcing from Asia \u2014 Free, No Commitment",
        html: darkBaseLayout(
          "Join Whistle AI for free and start sourcing from verified Asian manufacturers",
          `<p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
            ${companyName ? "Hi " + companyName + " team," : "Hi there,"}<br><br>
            We've shown you how Whistle AI <strong style="color:#ffffff">verifies manufacturers</strong> and
            <strong style="color:#ffffff">protects your payments with escrow</strong>.<br><br>
            Ready to find your next supplier?
          </p>
          ${divider()}
          <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHAT YOU GET \u2014 FREE</p>
          ${featureRow("\u2705", "AI-Powered Supplier Matching", "Describe your needs, get matched with verified manufacturers")}
          ${featureRow("\u2705", "Instant Cost Analysis", "HS codes, tariffs, FTA benefits calculated automatically")}
          ${featureRow("\u2705", "Secure Escrow Payments", "Your money is protected until you confirm delivery")}
          ${featureRow("\u2705", "End-to-End Support", "Customs, freight, documentation \u2014 all in-platform")}
          ${divider()}
          <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">100% Free for Buyers. Always.</p>
          ${ctaButton("Create Free Account", "https://whistle-ai.com/global-buyer/")}
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;text-align:center;line-height:1.6">
            Sourcing from <strong style="color:#9ca3af">Korea, Vietnam, Thailand, China</strong> and more.<br>
            Questions? <a href="mailto:support@whistle-ai.com" style="color:#0B63F2;text-decoration:none">support@whistle-ai.com</a>
          </p>`,
          unsubscribeUrl,
        ),
      };

    // ─── Fallback ────────────────────────────
    default:
      return {
        subject: "Whistle AI \u2014 AI-Powered Export Management",
        html: darkBaseLayout(
          "Discover how AI can transform your export business",
          `<p style="color:#e5e7eb;font-size:16px;line-height:1.7">
            Visit <a href="https://whistle-ai.com" style="color:#0B63F2">whistle-ai.com</a> to learn more.
          </p>
          ${ctaButton("Learn More", "https://whistle-ai.com")}`,
          unsubscribeUrl,
        ),
      };
  }
}

// ─── Rate Limiter ────────────────────────────────────────

async function checkRateLimit(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ isAllowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  const { data } = await sbAdmin
    .from("marketing_rate_limits")
    .select("send_count")
    .gte("window_start", windowStart.toISOString())
    .single();

  const currentCount = data?.send_count ?? 0;
  const remaining = Math.max(0, MAX_EMAILS_PER_HOUR - currentCount);
  return { isAllowed: remaining > 0, remaining };
}

async function incrementRateLimit(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<void> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  const { data: existing } = await sbAdmin
    .from("marketing_rate_limits")
    .select("id, send_count")
    .gte("window_start", windowStart.toISOString())
    .single();

  if (existing) {
    await sbAdmin
      .from("marketing_rate_limits")
      .update({ send_count: existing.send_count + 1 })
      .eq("id", existing.id);
  } else {
    await sbAdmin.from("marketing_rate_limits").insert({
      window_start: windowStart.toISOString(),
      send_count: 1,
    });
  }
}

// ─── Main Handler ────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Auth: cron secret or service_role bearer
    const reqCronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const isAuthorized =
      (cronSecret && reqCronSecret === cronSecret) ||
      (token && token === serviceKey);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Parse optional body
    let timezoneGroup = "all";
    try {
      const body = await req.json();
      if (body.timezone_group) timezoneGroup = body.timezone_group;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Check rate limit
    const { isAllowed, remaining } = await checkRateLimit(sbAdmin);
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ message: "Rate limit reached, skipping this run", remaining: 0 }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Determine batch size (respect rate limit)
    const batchSize = Math.min(MAX_BATCH_SIZE, remaining);

    // Find due enrollments
    let query = sbAdmin
      .from("drip_enrollments")
      .select(`
        id, current_step, contact_id, sequence_id,
        marketing_contacts!inner(id, email, name, company_name, country, language, is_subscribed),
        drip_sequences!inner(id, name, audience_type, is_active)
      `)
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString())
      .eq("drip_sequences.is_active", true)
      .limit(batchSize);

    // Filter by timezone group
    if (timezoneGroup === "asia") {
      query = query.eq("marketing_contacts.language", "ko");
    } else if (timezoneGroup === "americas_europe") {
      query = query.neq("marketing_contacts.language", "ko");
    }

    const { data: enrollments, error: fetchErr } = await query;

    if (fetchErr) {
      console.error("Failed to fetch enrollments:", fetchErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch enrollments", detail: fetchErr.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No due enrollments", processed: 0 }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const results = { processed: 0, sent: 0, failed: 0, completed: 0, skipped: 0 };

    for (const enrollment of enrollments) {
      results.processed++;

      const contact = enrollment.marketing_contacts as any;
      const sequence = enrollment.drip_sequences as any;

      // Skip unsubscribed
      if (!contact.is_subscribed) {
        await sbAdmin
          .from("drip_enrollments")
          .update({ status: "unsubscribed" })
          .eq("id", enrollment.id);
        results.skipped++;
        continue;
      }

      // Get current step
      const { data: step } = await sbAdmin
        .from("drip_steps")
        .select("*")
        .eq("sequence_id", enrollment.sequence_id)
        .eq("step_number", enrollment.current_step)
        .single();

      if (!step) {
        // No more steps — mark completed
        await sbAdmin
          .from("drip_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        results.completed++;
        continue;
      }

      // Build unsubscribe URL
      const unsubscribeToken = btoa(contact.email);
      const unsubscribeUrl = `https://whistle-ai.com/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(contact.email)}`;

      // Get template
      const template = getDripTemplate(step.template_key, unsubscribeUrl, contact);
      const emailSubject = (contact.language === "ko" && step.subject_ko)
        ? step.subject_ko
        : (step.subject_en || template.subject);

      // Log event as queued
      const { data: eventRow } = await sbAdmin
        .from("marketing_events")
        .insert({
          contact_id: contact.id,
          to_email: contact.email,
          subject: emailSubject,
          template_type: step.template_key,
          status: "queued",
        })
        .select("id")
        .single();

      // Send via Resend
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [contact.email],
          subject: emailSubject,
          html: template.html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      if (!resendResponse.ok) {
        const errText = await resendResponse.text();
        console.error(`Failed to send to ${contact.email}:`, errText);

        if (eventRow?.id) {
          await sbAdmin
            .from("marketing_events")
            .update({ status: "failed", error_message: errText.substring(0, 500) })
            .eq("id", eventRow.id);
        }

        results.failed++;
        continue;
      }

      const resendResult = await resendResponse.json();

      // Update event as sent
      if (eventRow?.id) {
        await sbAdmin
          .from("marketing_events")
          .update({
            status: "sent",
            resend_id: resendResult.id,
            sent_at: new Date().toISOString(),
          })
          .eq("id", eventRow.id);
      }

      // Increment rate limit
      await incrementRateLimit(sbAdmin);

      // Check if there's a next step
      const { data: nextStep } = await sbAdmin
        .from("drip_steps")
        .select("step_number, delay_days")
        .eq("sequence_id", enrollment.sequence_id)
        .eq("step_number", enrollment.current_step + 1)
        .single();

      if (nextStep) {
        // Advance to next step
        const nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + nextStep.delay_days);

        await sbAdmin
          .from("drip_enrollments")
          .update({
            current_step: nextStep.step_number,
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt.toISOString(),
          })
          .eq("id", enrollment.id);
      } else {
        // Sequence complete
        await sbAdmin
          .from("drip_enrollments")
          .update({
            status: "completed",
            last_sent_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id);
        results.completed++;
      }

      results.sent++;

      // Small delay between sends (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Update automation log (existing schema: name, schedule, last_run, config)
    const automationName = timezoneGroup === "asia"
      ? "Drip Engine — Morning (KST 09:00)"
      : "Drip Engine — Evening (KST 21:00)";

    await sbAdmin
      .from("marketing_automations")
      .update({
        last_run: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("name", automationName);

    return new Response(
      JSON.stringify({
        message: "Drip engine completed",
        timezone_group: timezoneGroup,
        ...results,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("marketing-drip error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: "Internal error", detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
