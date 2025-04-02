export const initBalance = 0n;

export function getRandomBigInt(max: bigint) {
  return BigInt(Math.floor(Math.random() * Number(max.toString())));
}
