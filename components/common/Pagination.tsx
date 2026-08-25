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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 rounded-b-xl text-xs text-slate-600 dark:text-slate-400 transition-colors">
      <div>
        Menampilkan <span className="font-bold text-slate-900 dark:text-slate-100">{startItem}</span> -{" "}
        <span className="font-bold text-slate-900 dark:text-slate-100">{endItem}</span> dari{" "}
        <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span> data
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-slate-900 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
        >
          Sebelumnya
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg font-black text-xs transition-all cursor-pointer ${
              currentPage === pageNum
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-2 border-slate-900 dark:border-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
                : "border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-slate-900 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export { Pagination };
