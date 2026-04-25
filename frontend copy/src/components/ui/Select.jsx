import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative group">
      <select
        className={cn(
          "flex h-14 w-full appearance-none items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 px-6 py-2 text-sm font-medium ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <ChevronDown className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
      </div>
    </div>
  );
});

Select.displayName = "Select";

export { Select };
