"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon } from "lucide-react";

import { AmountDialogType } from "@/components/types/amount-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

const CONFIG: Record<
  AmountDialogType,
  {
    icon: ReactNode;
    triggerLabel: string;
    title: string;
    description: string;
    submitLabel: string;
    url: string;
  }
> = {
  [AmountDialogType.DEPOSIT]: {
    icon: <ArrowDownToLineIcon data-icon="inline-start" />,
    triggerLabel: "Deposit",
    title: "Deposit funds",
    description: "Add money to your account.",
    submitLabel: "Deposit",
    url: "/api/transactions/deposit",
  },
  [AmountDialogType.WITHDRAWAL]: {
    icon: <ArrowUpFromLineIcon data-icon="inline-start" />,
    triggerLabel: "Withdraw",
    title: "Withdraw funds",
    description: "Move money out of your account.",
    submitLabel: "Withdraw",
    url: "/api/transactions/withdraw",
  },
};

type AmountDialogProps = {
  id: string;
  type: AmountDialogType;
  accountNumber: string;
};

export function AmountDialog({ id, type, accountNumber }: AmountDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { icon, triggerLabel, title, description, submitLabel, url } =
    CONFIG[type];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAmount("");
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          accountNumber,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      handleOpenChange(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        {icon}
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
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? `${submitLabel}ing` : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
