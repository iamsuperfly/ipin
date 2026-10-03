import { DEPLOYER, explorerAddress } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 px-5 py-10 text-sm text-mute">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>A share is a share. Paid once.</p>
        <p>
          Publisher{" "}
          <a className="font-mono text-laterite hover:underline" href={explorerAddress(DEPLOYER)} target="_blank" rel="noreferrer">
            {shortAddr(DEPLOYER)}
          </a>
          . MIT \u00a9 Superfly.
        </p>
      </div>
    </footer>
  );
}
