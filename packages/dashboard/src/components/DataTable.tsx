import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from "lucide-react";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table.tsx";
import { cn } from "../lib/utils.ts";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  emptyState?: ReactNode;
  rowClassName?: string | ((row: Row<TData>) => string | undefined);
  onRowClick?: (row: Row<TData>) => void;
}

export function DataTable<TData>({
  columns,
  data,
  sorting,
  onSortingChange,
  emptyState,
  rowClassName,
  onRowClick,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting ?? [],
      columnVisibility,
      pagination,
    },
    onSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  if (data.length === 0) {
    return (
      emptyState ?? (
        <div className="empty-state h-65 text-slate-500">No rows available.</div>
      )
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(6,11,20,0.95),rgba(3,8,15,0.96))] shadow-[inset_0_1px_0_rgba(186,230,253,0.08),0_0_0_1px_rgba(14,165,233,0.08),0_20px_46px_rgba(0,0,0,0.45),0_0_38px_rgba(6,182,212,0.14)] animate-[cyber-glow-pulse_4.6s_ease-in-out_infinite]">
      <div className="pointer-events-none absolute -left-28 top-0 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-44 w-44 rounded-full bg-emerald-400/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[repeating-linear-gradient(to_bottom,rgba(56,189,248,0.07)_0px,rgba(56,189,248,0.07)_1px,transparent_1px,transparent_6px)] opacity-35 mix-blend-screen animate-[cyber-scanline_11s_linear_infinite]" />
      <div className="pointer-events-none absolute -left-1/2 top-0 z-[2] h-full w-1/2 bg-[linear-gradient(100deg,transparent_10%,rgba(34,211,238,0.18)_40%,rgba(167,243,208,0.22)_55%,transparent_85%)] opacity-0 blur-sm animate-[cyber-sweep_4.4s_ease-in-out_infinite]" />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-white/3 px-4 py-3.5 sm:px-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">
          Data Grid
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-cyan-300/80" />
          <Select
            value={table.getAllColumns().filter((column) => column.getIsVisible()).length.toString()}
            onValueChange={(value) => {
              const target = Number(value);
              const hidable = table
                .getAllColumns()
                .filter((column) => column.getCanHide() && typeof column.accessorFn !== "undefined");
              hidable.forEach((column, index) => {
                column.toggleVisibility(index < target);
              });
            }}
          >
            <SelectTrigger className="h-8 w-42.5 border-cyan-300/20 bg-slate-900/60 text-xs text-slate-200">
              <SelectValue placeholder="Visible columns" />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  Show {count} columns
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative max-h-[62vh] overflow-auto">
        <Table className="min-w-195 w-full table-auto">
          <TableHeader className="sticky top-0 z-20 bg-[rgba(8,14,26,0.96)] backdrop-blur-xl">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-cyan-300/10 bg-[linear-gradient(90deg,rgba(14,116,144,0.08),rgba(15,23,42,0.15),rgba(6,95,70,0.07))] hover:bg-[linear-gradient(90deg,rgba(14,116,144,0.08),rgba(15,23,42,0.15),rgba(6,95,70,0.07))]"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sort = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-12 whitespace-nowrap border-b border-cyan-300/10 px-4 text-[10px] font-semibold tracking-[0.18em] text-slate-400",
                        header.column.columnDef.meta &&
                          typeof header.column.columnDef.meta === "object" &&
                          "className" in header.column.columnDef.meta
                          ? String(header.column.columnDef.meta.className)
                          : undefined
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-cyan-100"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sort === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sort === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-35" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "group border-b border-white/7 bg-transparent transition-colors hover:bg-cyan-400/4.5",
                  onRowClick ? "cursor-pointer" : undefined,
                  typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                )}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "border-b border-white/7 px-4 py-3.5 align-middle transition-colors duration-200 group-hover:border-cyan-300/10",
                      index === 0 ? "pl-5" : undefined,
                      index === row.getVisibleCells().length - 1 ? "pr-5" : undefined,
                      cell.column.columnDef.meta &&
                        typeof cell.column.columnDef.meta === "object" &&
                        "cellClassName" in cell.column.columnDef.meta
                        ? String(cell.column.columnDef.meta.cellClassName)
                        : undefined
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/8 bg-white/2 px-4 py-3 sm:px-5">
        <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
          <span>Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-20 border-cyan-300/20 bg-slate-900/60 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs font-medium text-slate-300">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
