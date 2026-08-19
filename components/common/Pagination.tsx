import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Jangan render apa pun jika total data <= itemsPerPage
  if (totalItems <= itemsPerPage) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white rounded-b-xl text-xs text-slate-600">
      <div>
        Menampilkan <span className="font-semibold text-slate-900">{startItem}</span> -{" "}
        <span className="font-semibold text-slate-900">{endItem}</span> dari{" "}
        <span className="font-semibold text-slate-900">{totalItems}</span> data
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Sebelumnya
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg font-semibold transition-colors ${
              currentPage === pageNum
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export { Pagination };
