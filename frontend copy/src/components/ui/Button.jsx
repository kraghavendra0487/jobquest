import * as React from "react" 
import { cn } from "../../lib/utils" 
 
const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => { 
  const variants = { 
    primary: "bg-indigo-600 text-white hover:bg-indigo-700", 
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200", 
    outline: "border border-gray-200 bg-transparent hover:bg-gray-50", 
    ghost: "hover:bg-gray-100 text-gray-700", 
    danger: "bg-red-600 text-white hover:bg-red-700", 
  } 
   
  const sizes = { 
    default: "h-10 px-4 py-2", 
    sm: "h-9 rounded-md px-3", 
    lg: "h-11 rounded-md px-8", 
    icon: "h-10 w-10", 
  } 
 
  return ( 
    <button 
      ref={ref} 
      className={cn( 
        "inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]", 
        variants[variant || "primary"], 
        sizes[size || "default"], 
        className 
      )} 
      {...props} 
    /> 
  ) 
}) 
Button.displayName = "Button" 
 
export { Button } 
