import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/70 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b border-neutral-200 dark:border-neutral-800", className)} {...props} />
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-serif font-semibold", className)} {...props} />
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />
}
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-t border-neutral-200 dark:border-neutral-800", className)} {...props} />
}
