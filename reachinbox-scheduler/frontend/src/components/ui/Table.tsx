import React from 'react';
import { cn } from '../../utils/cn';

export const TableContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <table className={cn('w-full text-left border-collapse text-xs', className)} {...props}>
    {children}
  </table>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead className={cn('border-b border-slate-100 bg-transparent text-[11px] uppercase tracking-wider text-slate-400 select-none', className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn('divide-y divide-slate-100 text-slate-700', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr className={cn('transition-colors duration-100 hover:bg-slate-50/70', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={cn('px-4 py-3.5 font-semibold text-slate-400', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={cn('px-4 py-3.5 align-middle', className)} {...props}>
    {children}
  </td>
);
