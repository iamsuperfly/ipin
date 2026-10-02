import { getAddress, isAddress, zeroAddress } from "viem";

export const IPIN_TESTNET = "0x48377ba080A05b85E4966418C46db2C0890f9287" as const;

export function ipinAddress() {
  const raw = process.env.NEXT_PUBLIC_IPIN_ADDRESS || IPIN_TESTNET;
  if (!raw || !isAddress(raw) || getAddress(raw) === zeroAddress) return undefined;
  return getAddress(raw);
}
