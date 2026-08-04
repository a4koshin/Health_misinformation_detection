import { cn } from "@/lib/utils";

/** Shared table shell — same chrome for admin and user roles. */
export function DataTableCard({
  header,
  toolbar,
  children,
  footer,
  className,
  tableClassName,
}: {
  header?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white",
        className,
      )}
    >
      {header ? (
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          {header}
        </div>
      ) : null}
      {toolbar ? (
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          {toolbar}
        </div>
      ) : null}
      <div className="min-w-0 overflow-x-auto">
        <table
          className={cn("w-full min-w-0 text-left text-sm", tableClassName)}
        >
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}
