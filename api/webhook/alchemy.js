import crypto from "crypto";
import redis from "../_lib/redis.js";
import { sendConfirmationEmail, sendOwnerAlert } from "../_lib/email.js";

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, signature, signingKey) {
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");
  return signature === digest;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-alchemy-signature"];

  if (
    !verifySignature(rawBody, signature, process.env.ALCHEMY_WEBHOOK_SIGNING_KEY)
  ) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body = JSON.parse(rawBody);
  const activities = body.event?.activity;
  if (!activities) return res.status(200).json({ ok: true });

  const wallet = (process.env.STORE_WALLET || "").toLowerCase();

  for (const activity of activities) {
    if (activity.toAddress?.toLowerCase() !== wallet) continue;

    const amount = parseFloat(activity.value);
    const asset = activity.asset || "ETH";
    const token = asset === "USDC" ? "USDC" : asset === "ETH" ? "ETH" : asset;
    const txHash = activity.hash;

    let matchedOrderId = null;

    if (token === "ETH") {
      // Exact lookup by rounded amount
      const rounded = parseFloat(amount.toFixed(6));
      matchedOrderId = await redis.get(`order:byeth:${rounded}`);

      // Fallback: scan pending orders for approximate match
      if (!matchedOrderId) {
        const keys = await redis.keys("order:pending:*");
        for (const key of keys) {
          const raw = await redis.get(key);
          const order = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Math.abs(order.ethAmount - amount) < 0.0001) {
            matchedOrderId = order.orderId;
            break;
          }
        }
      }
    } else if (token === "USDC") {
      const rounded = parseFloat(amount.toFixed(2));
      matchedOrderId = await redis.get(`order:byusdc:${rounded}`);
    }

    if (matchedOrderId) {
      const raw = await redis.get(`order:pending:${matchedOrderId}`);
      if (raw) {
        const order = typeof raw === "string" ? JSON.parse(raw) : raw;
        order.status = "confirmed";
        order.txHash = txHash;
        order.confirmedAt = Date.now();

        // Move to confirmed (keep 30 days)
        await redis.set(
          `order:confirmed:${matchedOrderId}`,
          JSON.stringify(order),
          { ex: 2592000 }
        );
        await redis.del(`order:pending:${matchedOrderId}`);
        await redis.del(`order:byeth:${order.ethAmount}`);
        await redis.del(`order:byusdc:${order.usdcAmount}`);

        // Send confirmation emails
        const itemsList = order.items
          .map((i) => `${i.name} (${i.size}) x${i.qty} — $${i.price * i.qty}`)
          .join("\n");

        await sendConfirmationEmail({
          to: order.customer.email,
          name: order.customer.firstName || order.customer.name,
          orderId: matchedOrderId,
          items: itemsList,
          total: order.totalUSD,
          txHash,
        });

        await sendOwnerAlert({
          orderId: matchedOrderId,
          txHash,
          amount,
          token,
          matched: true,
        });
      }
    } else {
      // No match — alert owner
      await sendOwnerAlert({
        orderId: null,
        txHash,
        amount,
        token,
        matched: false,
      });
    }
  }

  return res.status(200).json({ ok: true });
}
