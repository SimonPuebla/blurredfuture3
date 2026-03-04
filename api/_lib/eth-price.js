let cachedPrice = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getEthPrice() {
  if (cachedPrice && Date.now() - cacheTime < CACHE_TTL) return cachedPrice;

  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const data = await res.json();
  cachedPrice = data.ethereum.usd;
  cacheTime = Date.now();
  return cachedPrice;
}
