/**
 * Reusable Data Table Component
 * Built using @tanstack/react-table with built-in search, filter, pagination, and sorting
 */
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import * as Icons from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  filterSlot?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Cari...',
  onRowClick,
  isLoading = false,
  filterSlot,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const tableData = useMemo(() => data, [data]);
  const tableColumns = useMemo(() => columns, [columns]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Search Filter Header */}
      {(searchKey || filterSlot) && (
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          {searchKey && (
            <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
              <Icons.Search className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          )}
          {filterSlot}
        </div>
      )}

      {/* Table Area */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={isSortable ? 'sortable' : ''}
                      onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span style={{ display: 'inline-flex' }}>
                            {header.column.getIsSorted() === 'desc' ? (
                              <Icons.ChevronDown size={14} />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <Icons.ChevronUp size={14} />
                            ) : (
                              <Icons.ChevronsUpDown size={14} style={{ opacity: 0.4 }} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="spinner"></div>
                    <span className="text-muted">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div className="empty-state">
                    <Icons.Inbox className="empty-state-icon" />
                    <div className="empty-state-title">Tidak Ada Data</div>
                    <div className="empty-state-description">Data tidak ditemukan atau belum ditambahkan.</div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && table.getRowModel().rows.length > 0 && (
        <div className="pagination">
          <div>
            Menampilkan {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            dari {table.getFilteredRowModel().rows.length} data
          </div>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <Icons.ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              className="pagination-btn"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <Icons.ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
