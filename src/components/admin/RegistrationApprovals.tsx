import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Search, UserCheck, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { ApprovalStatus, Registration, RegistrationsResponse } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button, PixelSpinner } from "../ui/Button";

const PAGE_SIZE = 20;
const date = (value: number) => new Date(value).toLocaleString("en-IN", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export function RegistrationApprovals() {
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<RegistrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Registration | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const latestRequest = useRef(0);
  const reviewing = useRef(false);

  const clearSelection = () => {
    setAllSelected(false);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  };
  const selectedCount = allSelected ? Math.max(0, (data?.total ?? 0) - excludedIds.size) : selectedIds.size;
  const toggleSelection = (id: string) => {
    const update = (previous: Set<string>) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    };
    if (allSelected) setExcludedIds(update); else setSelectedIds(update);
  };

  const approveSelected = async () => {
    if (reviewing.current || !selectedCount) return;
    reviewing.current = true;
    ++latestRequest.current;
    setBusyId("bulk");
    setError("");
    setNotice("");
    try {
      const result = await api.admin.approveRegistrations({
        ids: allSelected ? [] : [...selectedIds], allPending: allSelected,
        search: allSelected ? search.trim() : "", excludedIds: allSelected ? [...excludedIds] : [],
      });
      clearSelection();
      setNotice(result.approvedCount ? `${result.approvedCount} registration${result.approvedCount === 1 ? " was" : "s were"} approved. They can now sign in.` : "No selected registrations are still pending. The list has been refreshed.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve the selected registrations. Please try again.");
    } finally {
      reviewing.current = false;
      setBusyId(null);
    }
  };

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const response = await api.admin.registrations(status, search.trim(), offset);
      if (request !== latestRequest.current) return;
      setData(response);
      setError("");
      if (offset > 0 && offset >= response.total) {
        setOffset(Math.max(0, Math.ceil(response.total / PAGE_SIZE) - 1) * PAGE_SIZE);
      }
    } catch (err) {
      if (request === latestRequest.current) {
        setError(err instanceof ApiError ? err.message : "Could not load registrations. Please try again.");
      }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [status, search, offset]);

  useEffect(() => {
    const invalidate = () => { ++latestRequest.current; };
    const start = window.setTimeout(() => void load(), 200);
    const poll = window.setInterval(() => {
      if (!reviewing.current) void load();
    }, 5000);
    return () => {
      invalidate();
      window.clearTimeout(start);
      window.clearInterval(poll);
    };
  }, [load]);

  const review = async (entry: Registration, decision: "approved" | "rejected") => {
    if (reviewing.current) return;
    reviewing.current = true;
    ++latestRequest.current;
    setBusyId(entry.id);
    setError("");
    setNotice("");
    try {
      await api.admin.reviewRegistration(entry.id, decision);
      setSelectedIds((previous) => { const next = new Set(previous); next.delete(entry.id); return next; });
      setExcludedIds((previous) => { const next = new Set(previous); next.delete(entry.id); return next; });
      setRejecting(null);
      setNotice(`${entry.fullName}'s registration was ${decision}.${decision === "approved" ? " They can now sign in." : " Sign-in remains blocked."}`);
      await load();
    } catch (err) {
      // A second admin may have reviewed this request; refresh the authoritative list.
      if (err instanceof ApiError && err.code === "already_reviewed") {
        setRejecting(null);
        await load();
      }
      setError(err instanceof ApiError ? err.message : "Could not review this registration. Please try again.");
    } finally {
      reviewing.current = false;
      setBusyId(null);
    }
  };

  return (
    <section className="mt-8 border border-border-default bg-bg-panel p-4 sm:p-6" aria-labelledby="registrations-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="registrations-title" className="flex items-center gap-2 font-display text-3xl text-text-primary">
            <UserCheck size={22} className="text-accent-cyan" /> Account approvals
            {!!data?.counts.pending && (
              <span className="rounded-xs bg-fill-warning px-2 py-1 font-mono text-xs text-warning">
                {data.counts.pending} pending
              </span>
            )}
          </h2>
          <p className="mt-2 font-body text-sm text-text-secondary">
            New participants can sign in only after approval. Rejected registrations stay blocked.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} disabled={busyId !== null} onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 border border-border-default bg-bg-inset p-1" role="group" aria-label="Registration status">
          {(["pending", "approved", "rejected"] as const).map((value) => (
            <button key={value} aria-pressed={status === value} disabled={busyId !== null}
              onClick={() => { clearSelection(); setStatus(value); setOffset(0); setData(null); setLoading(true); setNotice(""); setRejecting(null); }}
              className={cn("px-3 py-2 font-body text-xs font-medium capitalize sm:text-sm", status === value ? "bg-bg-elevated text-accent-cyan" : "text-text-secondary hover:text-text-primary")}
            >
              {value}{data ? ` (${data.counts[value]})` : ""}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-[280px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label="Search registrations by name or email" placeholder="Search name or email…" value={search} maxLength={100} disabled={busyId !== null}
            onChange={(e) => { clearSelection(); setSearch(e.target.value); setOffset(0); setData(null); setLoading(true); setRejecting(null); }}
            className="h-10 w-full rounded-xs border border-border-default bg-bg-inset pl-9 pr-3 font-body text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      {status === "pending" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-border-default bg-bg-inset p-3">
          <Button variant="secondary" size="sm" disabled={!data?.total || busyId !== null || rejecting !== null} onClick={() => { setAllSelected(true); setSelectedIds(new Set()); setExcludedIds(new Set()); }}>
            Select all{data ? ` (${data.total})` : ""}
          </Button>
          <Button variant="primary" size="sm" icon={<Check size={14} />} disabled={!selectedCount || !data || busyId !== null || rejecting !== null} onClick={() => void approveSelected()}>
            {busyId === "bulk" ? "Approving…" : `Approve selected${selectedCount ? ` (${selectedCount})` : ""}`}
          </Button>
          {!!selectedCount && <button className="font-body text-sm text-text-secondary hover:text-text-primary" disabled={busyId !== null} onClick={clearSelection}>Clear selection</button>}
          <p className="w-full font-body text-xs text-text-muted">Select all includes every page{search.trim() ? " matching your search" : " of pending registrations"}. You can uncheck individual accounts before approving.</p>
        </div>
      )}

      {error && <p role="alert" className="mt-4 border border-danger/30 bg-fill-danger p-3 font-body text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mt-4 border border-success/30 bg-fill-success p-3 font-body text-sm text-success">{notice}</p>}

      {rejecting && (
        <div role="group" aria-label="Confirm rejection" className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-danger/30 bg-fill-danger p-4">
          <p className="font-body text-sm text-text-primary">Reject {rejecting.fullName}'s registration? They will not be able to sign in.</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={busyId !== null} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" size="sm" disabled={busyId !== null} onClick={() => void review(rejecting, "rejected")}>
              {busyId === rejecting.id ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto border border-border-default">
        <table className="w-full text-left font-body text-sm">
          <thead className="border-b border-border-default bg-bg-inset text-xs text-text-muted">
            <tr><th className="px-4 py-3 font-medium">Participant</th><th className="px-4 py-3 font-medium">Registered</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Review</th></tr>
          </thead>
          <tbody className="divide-y divide-border-hairline">
            {loading && !data ? <tr><td colSpan={4} className="px-4 py-8 text-center"><span className="inline-flex items-center gap-2 text-text-secondary"><PixelSpinner /> Loading registrations…</span></td></tr>
              : !data ? <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">Registration list unavailable. Use Refresh to try again.</td></tr>
                : data.items.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">{search.trim() ? "No matching registrations." : `No ${status} registrations.`}</td></tr>
                  : data.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-4"><div className="flex items-start gap-3">
                        {status === "pending" && <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-accent-cyan" aria-label={`Select ${entry.fullName}`} checked={allSelected ? !excludedIds.has(entry.id) : selectedIds.has(entry.id)} disabled={busyId !== null || rejecting !== null} onChange={() => toggleSelection(entry.id)} />}
                        <div><div className="font-medium text-text-primary">{entry.fullName}</div><div className="mt-1 break-all text-xs text-text-secondary">{entry.email}</div></div>
                      </div></td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">{date(entry.createdAt)}</td>
                      <td className="px-4 py-4"><span className={cn("rounded-xs px-2 py-1 text-xs capitalize", entry.approvalStatus === "pending" ? "bg-fill-warning text-warning" : entry.approvalStatus === "approved" ? "bg-fill-success text-success" : "bg-fill-danger text-danger")}>{entry.approvalStatus}</span></td>
                      <td className="px-4 py-4">
                        {entry.approvalStatus === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" icon={<Check size={14} />} disabled={busyId !== null || rejecting !== null} aria-label={`Approve ${entry.fullName}`} onClick={() => void review(entry, "approved")}>
                              {busyId === entry.id ? "Approving…" : "Approve"}
                            </Button>
                            <Button variant="danger" size="sm" icon={<X size={14} />} disabled={busyId !== null || rejecting !== null} aria-label={`Reject ${entry.fullName}`} onClick={() => setRejecting(entry)}>Reject</Button>
                          </div>
                        ) : <span className="block whitespace-nowrap text-right text-xs text-text-muted">{entry.reviewedAt ? date(entry.reviewedAt) : "Existing account"}</span>}
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-xs text-text-muted">{offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total} registrations</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0 || busyId !== null} onClick={() => { setOffset(Math.max(0, offset - PAGE_SIZE)); setData(null); setLoading(true); }}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= data.total || busyId !== null} onClick={() => { setOffset(offset + PAGE_SIZE); setData(null); setLoading(true); }}>Next</Button>
          </div>
        </div>
      )}
    </section>
  );
}
