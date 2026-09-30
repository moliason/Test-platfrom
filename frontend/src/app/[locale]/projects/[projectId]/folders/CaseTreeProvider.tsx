'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Config from '@/config/config';
import { CaseType } from '@/types/case';
import { TokenContext } from '@/utils/TokenProvider';
import { logError } from '@/utils/errorHandler';

type Entry = { cases?: CaseType[]; error?: boolean };
type Messages = { selected: string; noCasesFound: string; loadError: string; retry: string };
type CaseTreeState = {
  messages: Messages;
  entries: Record<number, Entry>;
  loadCases: (folderId: number, refresh?: boolean) => Promise<CaseType[] | undefined>;
  refreshCases: () => Promise<void>;
  selectedIds: Set<number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
};

export const CaseTreeContext = createContext<CaseTreeState | null>(null);

export default function CaseTreeProvider({ children, messages }: { children: ReactNode; messages: Messages }) {
  const { token } = useContext(TokenContext);
  const query = useSearchParams().toString();
  const scope = `${token.access_token}:${query}`;
  const cache = useRef(new Map<string, Entry>());
  const pending = useRef(new Map<string, Promise<CaseType[] | undefined>>());
  const loadedFolders = useRef(new Set<number>());
  const [entries, setEntries] = useState<Record<string, Record<number, Entry>>>({});
  const [selectedIds, setSelectedIds] = useState(new Set<number>());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [token.access_token]);

  const loadCases = useCallback(
    (folderId: number, refresh = false) => {
      if (!token.access_token) return Promise.resolve(undefined);
      const key = `${scope}:${folderId}`;
      const cached = cache.current.get(key);
      if (!refresh && cached?.cases) return Promise.resolve(cached.cases);
      const request = pending.current.get(key);
      if (!refresh && request) return request;
      loadedFolders.current.add(folderId);
      const params = new URLSearchParams(query);
      params.set('folderId', String(folderId));
      const promise: Promise<CaseType[] | undefined> = Promise.resolve().then(async () => {
        try {
          const response = await fetch(`${Config.apiServer}/cases?${params}`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const cases: CaseType[] = await response.json();
          cases.sort((a, b) => (a.caseNo ?? a.id) - (b.caseNo ?? b.id));
          if (pending.current.get(key) !== promise) return undefined;
          cache.current.set(key, { cases });
          setEntries((current) => ({ ...current, [scope]: { ...current[scope], [folderId]: { cases } } }));
          return cases;
        } catch (error) {
          if (pending.current.get(key) === promise) {
            setEntries((current) => ({
              ...current,
              [scope]: { ...current[scope], [folderId]: { ...cached, error: true } },
            }));
            logError('Error fetching case tree', error);
          }
          return undefined;
        } finally {
          if (pending.current.get(key) === promise) pending.current.delete(key);
        }
      });
      pending.current.set(key, promise);
      return promise;
    },
    [query, scope, token.access_token]
  );

  const refreshCases = useCallback(async () => {
    cache.current.clear();
    pending.current.clear();
    await Promise.all(Array.from(loadedFolders.current, (id) => loadCases(id, true)));
  }, [loadCases]);

  return (
    <CaseTreeContext.Provider
      value={{ messages, entries: entries[scope] ?? {}, loadCases, refreshCases, selectedIds, setSelectedIds }}
    >
      {children}
    </CaseTreeContext.Provider>
  );
}
