"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export function useTablePagination<T>(items: T[], initialRowsPerPage = 10) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  }, [items, safePage, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [rowsPerPage, totalItems]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(safePage * rowsPerPage, totalItems);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(
      1,
      Math.min(safePage - 2, totalPages - maxButtons + 1),
    );
    return Array.from({ length: maxButtons }, (_, i) => start + i);
  }, [safePage, totalPages]);

  return {
    page: safePage,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageItems,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    pageNumbers,
  };
}

type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rows: number) => void;
  rowsPerPageOptions?: number[];
  className?: string;
};

export function TablePagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  pageNumbers,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 20, 50],
  className,
}: TablePaginationProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-sm text-[#64748b]">
          Showing {rangeStart}–{rangeEnd} of {totalItems} results
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
        </p>
        {onRowsPerPageChange && rowsPerPage != null ? (
          <label className="flex items-center gap-2 text-sm text-[#64748b]">
            Rows
            <select
              value={String(rowsPerPage)}
              onChange={(event) =>
                onRowsPerPageChange(Number(event.target.value))
              }
              className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm text-[#475569] outline-none focus:border-[#ff8a4d]"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#475569] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {pageNumbers.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            className={cn(
              "size-8 cursor-pointer rounded-lg text-sm font-medium transition-colors",
              number === page
                ? "bg-brand text-white"
                : "border border-gray-200 bg-white text-[#475569] hover:bg-orange-50",
            )}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#475569] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
