import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet, baseSepolia, sepolia } from "./chain";

export const config = createConfig({
  chains: [arcTestnet, baseSepolia, sepolia],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
