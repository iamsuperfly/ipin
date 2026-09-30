import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "./chain";

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
