"use client"

import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AccountSwitcherProps = {
  accountNumbers: string[]
  selectedAccountNumber: string
}

export function AccountSwitcher({
  accountNumbers,
  selectedAccountNumber,
}: AccountSwitcherProps) {
  const router = useRouter()

  return (
    <Select
      value={selectedAccountNumber}
      onValueChange={(value) => router.push(`/account?account=${value}`)}
    >
      <SelectTrigger aria-label="Select account">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {accountNumbers.map((accountNumber) => (
            <SelectItem key={accountNumber} value={accountNumber}>
              Account {accountNumber}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
