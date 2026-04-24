"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** --- Types --- */
type Row = {
  id: number;
  name: string;
  email: string;
  role: string;
  location: string;
  status: "Active" | "Inactive" | "Suspended";
  balance: number;
};

type ColumnDef = {
  key: keyof Row;
  label: string;
  width?: string; // optional width
  sticky?: boolean;
};

/** --- Example data --- */
const defaultRows: Row[] = [
  { id: 1, name: "Arjun Mehta", email: "arjun.mehta@company.com", role: "Manager", location: "Bangalore", status: "Active", balance: 1250 },
  { id: 2, name: "Hannah Park", email: "hannah.park@company.com", role: "Designer", location: "Seoul", status: "Active", balance: 600 },
  { id: 3, name: "Oliver Scott", email: "oliver.scott@company.com", role: "Engineer", location: "Manchester", status: "Inactive", balance: 650 },
  { id: 4, name: "Camila Torres", email: "camila.torres@company.com", role: "HR", location: "Bogotá", status: "Active", balance: 0 },
  { id: 5, name: "Kenji Tanaka", email: "kenji.tanaka@company.com", role: "Developer", location: "Osaka", status: "Suspended", balance: -1000 },
];

/** --- Default columns --- */
const defaultColumns: ColumnDef[] = [
  { key: "name", label: "Name", width: "220px", sticky: true },
  { key: "email", label: "Email", width: "260px" },
  { key: "role", label: "Role", width: "140px" },
  { key: "location", label: "Location", width: "160px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "balance", label: "Balance", width: "120px" },
];

/** --- localStorage keys --- */
const LS_ORDER = "reorderable_table_order_v1";
const LS_VISIBLE = "reorderable_table_visible_v1";

export function DataTable() {
  const [rows] = useState<Row[]>(defaultRows);
  const columnKeys = defaultColumns.map((c) => c.key as string);

  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => {
      if (typeof window === "undefined") return columnKeys;
      return JSON.parse(localStorage.getItem(LS_ORDER) || "null") || columnKeys;
    }
  );

  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem(LS_VISIBLE) || "null");
      if (saved) return saved;
    }
    const initial: Record<string, boolean> = {};
    columnKeys.forEach((k) => (initial[k] = true));
    return initial;
  });

  const [query, setQuery] = useState("");

  useEffect(() => {
    const all = columnKeys;
    setColumnOrder((prev) => {
      const missing = all.filter((k) => !prev.includes(k));
      const next = [...prev.filter((k) => all.includes(k)), ...missing];
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_ORDER, JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem(LS_VISIBLE, JSON.stringify(visible));
  }, [visible]);

  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((key) => defaultColumns.find((c) => c.key === key))
      .filter(Boolean) as ColumnDef[];
  }, [columnOrder]);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      [r.name, r.email, r.role, r.location, r.status].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  const dragSrcRef = React.useRef<number | null>(null);

  function onDragStart(e: React.DragEvent, index: number) {
    dragSrcRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // ignore
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    const srcIndex = dragSrcRef.current ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(srcIndex)) return;
    if (srcIndex === targetIndex) return;
    
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(srcIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    dragSrcRef.current = null;
  }

  function moveColumn(key: string, direction: -1 | 1) {
    setColumnOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx === -1) return prev;
      const newIndex = idx + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  }

  function toggleVisible(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetLayout() {
    setColumnOrder(columnKeys);
    const defaultVis: Record<string, boolean> = {};
    columnKeys.forEach((k) => (defaultVis[k] = true));
    setVisible(defaultVis);
    localStorage.removeItem(LS_ORDER);
    localStorage.removeItem(LS_VISIBLE);
  }

  return (
    <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-3 mb-6 bg-white/88 p-4 rounded-xl border border-[#FFC193]">
        <div className="flex gap-2 items-center flex-1">
          <Input 
            placeholder="Search name, email, role..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="md:max-w-100 h-10 border-[#FFC193] bg-[#FFEDCE]/35 focus-visible:ring-[#FF3737]/40 rounded-xl" 
          />
          {query && (
            <Button variant="ghost" onClick={() => setQuery("")} className="h-10 px-4 text-muted-foreground hover:text-foreground">
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 border-[#FFC193] rounded-xl hover:bg-[#FFEDCE]/35">
                Presets <span className="ml-2 text-[10px] text-muted-foreground">&#9662;</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-[#FFC193]">
              <DropdownMenuItem onClick={() => setVisible(columnKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<string, boolean>))}>
                Show All Columns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVisible((prev) => ({ ...prev, email: false, location: false }))}>
                Compact View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={resetLayout}>Reset Layout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 border-[#FFC193] rounded-xl hover:bg-[#FFEDCE]/35">
                Columns <span className="ml-2 text-[10px] text-muted-foreground">&#9660;</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-xl border-[#FFC193]" align="end">
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm leading-none tracking-tight">Toggle Columns</h4>
                  <p className="text-[11px] text-muted-foreground">Select what to display.</p>
                </div>
                <div className="flex flex-col gap-2 max-h-55 overflow-y-auto pr-2">
                  {defaultColumns.map((col) => (
                    <label key={String(col.key)} className="flex items-center gap-3 p-1 rounded-md hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={!!visible[String(col.key)]} onCheckedChange={() => toggleVisible(String(col.key))} />
                      <span className="text-sm font-medium">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between pt-3 border-t mt-1">
                  <Button variant="ghost" size="sm" onClick={resetLayout} className="h-8 text-xs hover:text-destructive">Reset</Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const visKeys = Object.entries(visible).filter(([, v]) => v).map(([k]) => k);
                    setColumnOrder((prev) => [...visKeys, ...prev.filter(k => !visKeys.includes(k))]);
                  }} className="h-8 text-xs font-semibold">Active First</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="border border-[#FFC193] rounded-xl overflow-hidden bg-white/90">
        <Table className="min-w-full border-separate border-spacing-0">
          <TableHeader className="bg-[#FFEDCE]/65 relative z-20 backdrop-blur-md">
            <TableRow className="hover:bg-transparent border-none">
              {orderedColumns.map((colDef, idx) => {
                const key = String(colDef.key);
                if (!visible[key]) return null;
                return (
                  <TableHead
                    key={key}
                    style={{ width: colDef.width }}
                    className="p-0 border-b border-[#FFC193] h-12 align-middle font-medium text-foreground tracking-wide"
                  >
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, idx)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, idx)}
                      className="flex items-center justify-between gap-2 select-none h-full px-4 hover:bg-[#FFEDCE]/45 transition-colors group cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] uppercase tracking-wider">{colDef.label}</span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded hover:bg-background shadow-sm" onClick={() => moveColumn(key, -1)} aria-label={`Move ${colDef.label} left`}>
                          <span className="text-[10px] font-bold">&lsaquo;</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded hover:bg-background shadow-sm" onClick={() => moveColumn(key, 1)} aria-label={`Move ${colDef.label} right`}>
                          <span className="text-[10px] font-bold">&rsaquo;</span>
                        </Button>
                      </div>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((row, i) => (
                <TableRow key={row.id} className={cn("hover:bg-[#FFEDCE]/35 transition-colors group border-b border-[#FFC193]/55", i % 2 === 0 ? "bg-white/85" : "bg-[#FFEDCE]/25")}>
                  {orderedColumns.map((colDef) => {
                    const key = String(colDef.key);
                    if (!visible[key]) return null;
                    const value = row[colDef.key];
                    let content: React.ReactNode = String(value);
                    if (colDef.key === "balance") {
                      content = <span className="font-mono">${(value as number).toLocaleString()}</span>;
                    }
                    if (colDef.key === "status") {
                      content = (
                        <span className={cn("inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase",
                          value === "Active" ? "bg-[#FFC193]/45 text-[#1f1f1f]" :
                          value === "Inactive" ? "bg-muted text-muted-foreground" :
                          "bg-[#FF8383]/28 text-[#8e2b2b]")}>
                          {value}
                        </span>
                      );
                    }
                    return <TableCell key={key} className="p-4 align-middle text-sm font-medium">{content}</TableCell>;
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={orderedColumns.filter(c => visible[String(c.key)]).length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <span className="text-xl opacity-50">¯\_(ツ)_/¯</span>
                    No results found.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          <TableFooter className="bg-[#FFEDCE]/65 relative z-10 font-semibold shadow-[0_-1px_0_hsl(var(--border))]">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={orderedColumns.filter(c => visible[String(c.key)]).length - 1} className="p-4 align-middle text-sm">
                Total ({filtered.length} rows)
              </TableCell>
              {orderedColumns.some((c) => c.key === "balance" && visible[String(c.key)]) ? (
                <TableCell className="p-4 align-middle text-right text-sm">
                  <span className="font-mono text-[#1f1f1f]">${filtered.reduce((acc, r) => acc + r.balance, 0).toLocaleString()}</span>
                </TableCell>
              ) : (
                <TableCell className="p-4 align-middle text-right text-muted-foreground">—</TableCell>
              )}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
