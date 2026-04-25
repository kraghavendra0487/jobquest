import * as React from "react" 
import { cn } from "../../lib/utils" 
 
function Badge({ className, variant, ...props }) { 
  const variants = { 
    default: "border-transparent bg-indigo-600 text-white hover:bg-indigo-600/80", 
    secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80", 
    outline: "text-gray-950 border-gray-200", 
    success: "border-transparent bg-green-100 text-green-700 hover:bg-green-100/80", 
    warning: "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100/80", 
    danger: "border-transparent bg-red-100 text-red-700 hover:bg-red-100/80", 
  } 
 
  return ( 
    <div 
      className={cn( 
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2", 
        variants[variant || "default"], 
        className 
      )} 
      {...props} 
    /> 
  ) 
} 
 
export { Badge } 
