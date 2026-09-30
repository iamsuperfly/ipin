import { getAddress, isAddress, zeroAddress } from "viem";

export function ipinAddress() {
  const raw = process.env.NEXT_PUBLIC_IPIN_ADDRESS;
  if (!raw || !isAddress(raw) || getAddress(raw) === zeroAddress) return undefined;
  return getAddress(raw);
}
