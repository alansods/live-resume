"use client";

import { X } from "@phosphor-icons/react";
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import styles from "./primitives.module.css";

export { SegmentedProgress } from "./SegmentedProgress";
export { StageChecklist, type StageItem, type StageItemState } from "./StageChecklist";

/**
 * Primitivos de interface, construídos sobre os tokens do Nocturne.
 *
 * As classes `btn`, `btn-primary`, `btn-secondary` e `btn-ghost` vêm do próprio
 * design system (`claude-design/styles.css`), então o botão só as compõe — não
 * redefine aparência.
 */

// ── Botão ───────────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, className].filter(Boolean).join(" ");
  return <button type="button" className={classes} {...props} />;
}

// ── Cartão ──────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")}>{children}</div>
  );
}

// ── Campo ───────────────────────────────────────────────────────────────────────

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Mensagem de erro. Presente significa campo inválido. */
  error?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, className, style, ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-erro`;

  return (
    <div
      className={["field", styles.field, className].filter(Boolean).join(" ")}
      style={style}
    >
      {/* Sem classe: quem estiliza o rótulo é `.field > label` do design system. */}
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        ref={ref}
        className={`input ${styles.control}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  error?: string;
};

export function TextArea({ label, error, className, ...props }: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-erro`;

  return (
    <div className={["field", styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id}>{label}</label>
      <textarea
        {...props}
        id={id}
        className={`input ${styles.control} ${styles.textarea}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

// ── Caixa de seleção ────────────────────────────────────────────────────────────

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** O que a caixa marca, ao lado dela. */
  label: ReactNode;
};

/**
 * Caixa de seleção com a forma do handoff.
 *
 * O controle nativo do navegador traz a cor do sistema operacional — azul do macOS num
 * tema que não tem azul —, e nenhum guard de cor pega isso: a cor não está no nosso CSS.
 * A saída é a do design system: o `input` some da vista mas continua sendo o elemento de
 * verdade, dentro do `<label>`, recebendo clique, foco e teclado. O quadrado ao lado é
 * decoração e não é anunciado.
 */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(" ")}>
      <input type="checkbox" {...props} />
      <span className={styles.checkboxBox} aria-hidden />
      <span>{label}</span>
    </label>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────────────

export function Chip({
  value,
  label,
  removeLabel,
  onChange,
  onRemove,
}: {
  value: string;
  label: string;
  removeLabel: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <span className={styles.chip}>
      <input
        className={`input ${styles.chipInput}`}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="btn btn-ghost"
        aria-label={removeLabel}
        onClick={onRemove}
        style={{ padding: "2px 4px" }}
      >
        <X size={13} />
      </button>
    </span>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────────

/**
 * Modal sobre overlay fixo, centralizado na tela via flexbox — como o handoff pede.
 *
 * Um `<dialog>` nativo centraliza sozinho pelo `margin: auto` do user-agent, mas o
 * reset do Tailwind zera margin em todo elemento e anula isso, jogando a caixa para o
 * canto. O overlay explícito não depende desse comportamento do navegador.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        // Clique no overlay fecha; clique dentro da caixa, não.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.dialogBody}>
          <h2 className={styles.dialogTitle}>{title}</h2>
          {children}
          <div className={styles.dialogActions}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
