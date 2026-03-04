import redis from "../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing order ID" });

  // Check pending
  const pending = await redis.get(`order:pending:${id}`);
  if (pending) {
    const order = typeof pending === "string" ? JSON.parse(pending) : pending;
    return res.status(200).json({ status: order.status });
  }

  // Check confirmed
  const confirmed = await redis.get(`order:confirmed:${id}`);
  if (confirmed) {
    const order =
      typeof confirmed === "string" ? JSON.parse(confirmed) : confirmed;
    return res.status(200).json({ status: "confirmed", txHash: order.txHash });
  }

  return res.status(404).json({ status: "not_found" });
}
