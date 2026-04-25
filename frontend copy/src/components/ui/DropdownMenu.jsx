import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";

const DropdownMenuRoot = DropdownMenu.Root;
const DropdownMenuTrigger = DropdownMenu.Trigger;
const DropdownMenuContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 text-gray-900 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
);
DropdownMenuContent.displayName = DropdownMenu.Content.displayName;

const DropdownMenuItem = React.forwardRef(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Item>
  )
);
DropdownMenuItem.displayName = DropdownMenu.Item.displayName;

const DropdownMenuSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DropdownMenu.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-gray-100", className)}
      {...props}
    />
  )
);
DropdownMenuSeparator.displayName = DropdownMenu.Separator.displayName;

export {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
