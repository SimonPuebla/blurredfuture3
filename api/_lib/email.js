import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Blurred Future Inc. <orders@blurredfuture.xyz>";
const OWNER = process.env.OWNER_EMAIL || "simopuebla@gmail.com";

export async function sendPendingEmail({ to, name, orderId, items, total, ethAmount, usdcAmount }) {
  await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Order ${orderId} — Awaiting Payment`,
    text: [
      `Hey ${name}!`,
      "",
      `Your order ${orderId} has been created.`,
      "",
      "Items:",
      items,
      "",
      `Total: $${total} USD`,
      `Send exactly ${ethAmount} ETH or ${usdcAmount} USDC to complete your purchase.`,
      "",
      "We'll confirm automatically once your payment arrives.",
      "",
      "— Blurred Future Inc.",
    ].join("\n"),
  });

  await resend.emails.send({
    from: FROM,
    to: [OWNER],
    subject: `NEW ORDER ${orderId} — Awaiting Crypto`,
    text: [
      `New crypto order ${orderId}`,
      "",
      `Customer: ${name}`,
      `Email: ${to}`,
      "",
      "Items:",
      items,
      "",
      `Total: $${total} USD`,
      `ETH amount: ${ethAmount}`,
      `USDC amount: ${usdcAmount}`,
    ].join("\n"),
  });
}

export async function sendConfirmationEmail({ to, name, orderId, items, total, txHash }) {
  await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Order Confirmed — ${orderId}`,
    text: [
      `Hey ${name}!`,
      "",
      `Your payment has been received and order ${orderId} is confirmed.`,
      "",
      "Items:",
      items,
      "",
      `Total: $${total} USD`,
      `Tx: ${txHash}`,
      "",
      "We'll reach out via WhatsApp to coordinate pickup at Crecimiento Hub.",
      "",
      "— Blurred Future Inc.",
    ].join("\n"),
  });

  await resend.emails.send({
    from: FROM,
    to: [OWNER],
    subject: `PAYMENT CONFIRMED — ${orderId}`,
    text: `Payment received for ${orderId}.\nEmail: ${to}\n\n${items}\n\nTotal: $${total} USD\nTx: ${txHash}`,
  });
}

export async function sendOwnerAlert({ orderId, txHash, amount, token, matched }) {
  await resend.emails.send({
    from: FROM,
    to: [OWNER],
    subject: matched
      ? `PAYMENT MATCHED — ${orderId}`
      : "UNMATCHED PAYMENT — Manual Review",
    text: matched
      ? `Incoming ${amount} ${token} matched to order ${orderId}.\nTx: ${txHash}`
      : `Incoming ${amount} ${token} could not be matched to any pending order.\nTx: ${txHash}\nPlease check manually.`,
  });
}
