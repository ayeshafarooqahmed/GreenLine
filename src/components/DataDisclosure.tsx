import { Info } from 'lucide-react';
import type { DataSourceMeta } from '../types/market';

interface DataDisclosureProps {
  meta: DataSourceMeta | null;
}

export function DataDisclosure({ meta }: DataDisclosureProps) {
  if (!meta) return null;
  const formattedTime = new Date(meta.asOfTimestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#101713] border border-[#25332A] text-xs text-[#89968D]">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-[#8BE9A8] shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-medium text-[#F2F5F2]">
            {meta.dataMode === 'live' ? 'Live PSX Feed' : 'Illustrative PSX Dataset'}
          </strong>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>
            {meta.dataMode === 'live'
              ? 'Quotes provided via configured market feed.'
              : 'Reference figures for demonstration only, not live exchange quotes.'}
          </span>
        </span>
      </div>
      <span className="font-mono text-[11px] text-[#89968D]">As of {formattedTime} PKT</span>
    </div>
  );
}
