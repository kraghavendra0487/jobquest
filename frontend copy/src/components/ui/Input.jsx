import * as React from "react" 
import { cn } from "../../lib/utils" 
 
const Input = React.forwardRef(({ className, type, ...props }, ref) => { 
  return ( 
    <input 
      type={type} 
      className={cn( 
        "flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all", 
        className 
      )} 
      ref={ref} 
      {...props} 
    /> 
  ) 
}) 
Input.displayName = "Input" 
 
export { Input } 
