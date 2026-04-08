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
import { EmptyState } from "./system/EmptyState.tsx";

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
        <EmptyState
          title="No rows available"
          description="This surface will populate when LLMTap receives matching data for the current view."
        />
      )
    );
  }

  return (
    <div className="dashboard-shell relative overflow-hidden rounded-[calc(var(--radius-panel)+8px)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--ch-accent),0.28),transparent)]" />
      <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-[var(--color-accent)]/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-[var(--color-accent-2)]/8 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.025)] px-4 py-3.5 sm:px-5">
        <div>
          <div className="hud-label">Operator ledger</div>
          <div className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
            {data.length} visible rows
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge hidden md:inline-flex">
            dense mode
          </span>
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-tertiary)]" />
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
            <SelectTrigger className="h-8 w-42.5 rounded-[var(--radius-panel)] border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-xs text-[var(--color-text-secondary)]">
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
        <Table className="min-w-195 w-full table-auto text-[13px]">
          <TableHeader className="sticky top-0 z-20 bg-[rgba(var(--ch-bg-base),0.96)] backdrop-blur-xl">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-[var(--border-dim)] bg-[linear-gradient(90deg,rgba(var(--ch-bg-panel),0.8),rgba(var(--ch-bg-base),0.98),rgba(var(--ch-bg-panel),0.8))] hover:bg-[linear-gradient(90deg,rgba(var(--ch-bg-panel),0.8),rgba(var(--ch-bg-base),0.98),rgba(var(--ch-bg-panel),0.8))]"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sort = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-12 whitespace-nowrap border-b border-[var(--border-dim)] px-4 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-text-tertiary)]",
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
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-text-primary)]"
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
                  "group border-b border-[var(--border-dim)] bg-transparent transition-colors odd:bg-[rgba(var(--ch-text-primary),0.012)] hover:bg-[rgba(var(--ch-accent),0.035)]",
                  onRowClick ? "cursor-pointer" : undefined,
                  typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                )}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "border-b border-[var(--border-dim)] px-4 py-3.5 align-middle transition-colors duration-200 group-hover:border-[var(--color-accent)]/10",
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

      <div className="relative z-10 flex items-center justify-between gap-3 border-t border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.02)] px-4 py-3 sm:px-5">
        <div className="hidden items-center gap-2 text-xs text-[var(--color-text-tertiary)] md:flex">
          <span>Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-20 rounded-[var(--radius-panel)] border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-xs">
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
        <div className="text-xs font-medium text-[var(--color-text-secondary)]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
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
