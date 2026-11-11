// Sends transactional emails via Resend (https://resend.com/docs/api-reference/emails/send-email).
// Zero dependencies — uses the global fetch().

export function createMailer({ apiKey, fromAddress, baseUrl, fetchImpl = globalThis.fetch }) {
  if (!apiKey || !fromAddress) return null;

  async function send({ to, subject, html }) {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress, to: [to], subject, html }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend ${response.status}: ${body}`);
    }
    return response.json();
  }

  function verificationEmail(to, token) {
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return send({
      to,
      subject: "Verify your Veyora account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f4">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#161615;padding:24px 32px;text-align:center">
    <span style="color:#FFDD1F;font-size:22px;font-weight:700;letter-spacing:-0.5px">veyora</span>
  </div>
  <div style="padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px;color:#161615">Verify your email</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.5">Click the button below to verify your email address and activate your Veyora account.</p>
    <a href="${link}" style="display:inline-block;background:#FFDD1F;color:#161615;font-weight:600;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none">Verify email</a>
    <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5">If you didn't create an account, ignore this email. The link expires in 24 hours.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#aaa;word-break:break-all">Or copy this link: ${link}</p>
  </div>
</div></body></html>`,
    });
  }

  return { send, verificationEmail };
}
