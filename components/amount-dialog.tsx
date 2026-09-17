"use client"

import { useState, type ReactNode } from "react"

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

type AmountDialogProps = {
  id: string
  triggerIcon: ReactNode
  triggerLabel: string
  title: string
  description: string
  submitLabel: string
}

export function AmountDialog({
  id,
  triggerIcon,
  triggerLabel,
  title,
  description,
  submitLabel,
}: AmountDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setAmount("")
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor={`${id}-amount`}>Amount</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>£</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id={`${id}-amount`}
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
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
