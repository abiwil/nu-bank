"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function LogoutButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    await fetch("/api/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={handleLogout}
      disabled={isLoggingOut}
      {...props}
    >
      {isLoggingOut ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <LogOutIcon data-icon="inline-start" />
      )}
      {isLoggingOut ? "Logging out..." : "Log out"}
    </Button>
  )
}
