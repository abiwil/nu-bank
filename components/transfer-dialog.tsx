"use client"

import { useState } from "react"
import { ArrowLeftRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

export function TransferDialog() {
  const [open, setOpen] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setRecipient("")
      setAmount("")
      setReference("")
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ArrowLeftRightIcon data-icon="inline-start" />
        Transfer
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Transfer money</DialogTitle>
            <DialogDescription>
              Send money to another nu-bank account.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="transfer-recipient">
                Recipient account number
              </FieldLabel>
              <Input
                id="transfer-recipient"
                placeholder="12345678"
                maxLength={8}
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-amount">Amount</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>£</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="transfer-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-reference">
                Reference <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="transfer-reference"
                placeholder="e.g. Rent"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Transfer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
