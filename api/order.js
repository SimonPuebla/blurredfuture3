import redis from "./_lib/redis.js";
import { getEthPrice } from "./_lib/eth-price.js";
import { sendPendingEmail } from "./_lib/email.js";

function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BFI-";
  for (let i = 0; i < 4; i++)
    id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customer, items, totalUSD } = req.body;

    if (!customer?.email || !customer?.name || !items?.length || !totalUSD) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = generateOrderId();
    const ethPrice = await getEthPrice();

    // Count pending orders to create unique micro-offset
    const pendingKeys = await redis.keys("order:pending:*");
    const offset = pendingKeys.length;

    // ETH: unique amount with 0.0001 ETH offset per concurrent order
    const baseEth = totalUSD / ethPrice;
    const uniqueEth = parseFloat((baseEth + offset * 0.0001).toFixed(6));

    // USDC: unique amount with $0.01 offset per concurrent order
    const uniqueUsdc = parseFloat((totalUSD + offset * 0.01).toFixed(2));

    const order = {
      orderId,
      customer,
      items,
      totalUSD,
      ethAmount: uniqueEth,
      usdcAmount: uniqueUsdc,
      ethPrice,
      status: "pending",
      createdAt: Date.now(),
    };

    // Store with 2-hour TTL
    await redis.set(`order:pending:${orderId}`, JSON.stringify(order), {
      ex: 7200,
    });

    // Index by amount for fast webhook lookup
    await redis.set(`order:byeth:${uniqueEth}`, orderId, { ex: 7200 });
    await redis.set(`order:byusdc:${uniqueUsdc}`, orderId, { ex: 7200 });

    // Send pending order emails
    const itemsList = items
      .map((i) => `${i.name} (${i.size}) x${i.qty} — $${i.price * i.qty}`)
      .join("\n");

    await sendPendingEmail({
      to: customer.email,
      name: customer.firstName || customer.name,
      orderId,
      items: itemsList,
      total: totalUSD,
      ethAmount: uniqueEth,
      usdcAmount: uniqueUsdc,
    });

    return res.status(200).json({
      orderId,
      ethAmount: uniqueEth,
      usdcAmount: uniqueUsdc,
      ethPrice,
      wallet: process.env.STORE_WALLET,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
