"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

/** Input de contraseña con botón mostrar/ocultar. `className` va a la caja (InputGroup); el resto de props, al `<input>`. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={cn("h-11", className)}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} className="h-full" />
      <InputGroupAddon align="inline-end">
        {/* Visual 36px; el ::after amplía el área táctil a 44×44. */}
        <InputGroupButton
          size="icon-sm"
          className="relative size-9 cursor-pointer duration-200 after:absolute after:-inset-1"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
