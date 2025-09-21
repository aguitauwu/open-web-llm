import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

// Skeleton componente predefinidos para diferentes casos de uso
export function MessageSkeleton() {
  return (
    <div className="flex space-x-3 p-4" data-testid="skeleton-message">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="p-3 space-y-2" data-testid="skeleton-conversation">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="p-4 space-y-4" data-testid="skeleton-sidebar">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatAreaSkeleton() {
  return (
    <div className="flex flex-col h-full" data-testid="skeleton-chat-area">
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
      <div className="p-4 border-t">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
