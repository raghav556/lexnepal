"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

type Continuation = {
  data?: unknown[]; hasMore?: boolean; isFetching?: boolean; isError?: boolean;
  isFetchNextPageError?: boolean; enabled?: boolean;
  hasData?: boolean;
  error?: unknown;
  fetchNextPage?: () => unknown; refetch: () => unknown;
};
/** Counts describe loaded records; continuation is never presented as a lifetime total. */
export function CollectionContinuation({ query, noun, inMenu = false }: { query: Continuation; noun: "documents" | "events" | "notifications"; inMenu?: boolean }) {
  const { language } = useI18n();
  const ne = language === "ne", name = ne ? { documents: "कागजात", events: "घटना", notifications: "सूचना" }[noun] : noun;
  if (query.enabled === false) return null;
  const status = query.error && typeof query.error === "object" && "status" in query.error ? query.error.status : undefined;
  const denied = status === 401 || status === 403 || status === 404;
  const loaded = denied || query.hasData === false ? undefined : query.data?.length;
  return <div role={inMenu ? "none" : undefined} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3" data-collection={noun}>
    <p role={inMenu ? "none" : "status"} className="text-sm text-muted-foreground">
      {loaded === undefined ? query.isError ? ne ? "अभिलेख उपलब्ध छैन।" : "Records unavailable." : ne ? "लोड हुँदैछ…" : `Loading ${name}…` : ne ? `${loaded.toLocaleString("ne-NP")} ${name} लोड भयो।` : `${loaded} ${name} loaded.`}
      {!denied && query.hasMore ? ne ? " थप अभिलेख उपलब्ध छन्।" : " More records available." : null}
      {query.isError ? ne ? " लोड गर्न सकिएन। फेरि प्रयास गर्नुहोस्।" : " Could not load records. Please retry." : null}
    </p>
    {query.isError || query.hasMore ? <Button role={inMenu ? "menuitem" : undefined} type="button" variant="outline" className="min-h-10" disabled={query.isFetching} aria-busy={query.isFetching}
      onClick={() => { void (query.isError && !query.isFetchNextPageError ? query.refetch() : query.fetchNextPage?.()); }}>
      {query.isFetching ? ne ? "लोड हुँदैछ…" : "Loading…" : query.isError ? ne ? "फेरि प्रयास गर्नुहोस्" : `Retry ${name}` : ne ? `थप ${name} लोड गर्नुहोस्` : `Load more ${name}`}
    </Button> : null}
  </div>;
}
