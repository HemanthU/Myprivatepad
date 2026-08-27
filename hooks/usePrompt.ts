"use client";

import { useState, useCallback } from "react";

type PromptConfig = {
  title: string;
  message?: string;
  type?: "text" | "confirm";
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  requiredConfirmText?: string;
};

export function usePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PromptConfig>({ title: "" });
  const [resolveFn, setResolveFn] = useState<((value: any) => void) | null>(null);

  const prompt = useCallback((newConfig: Omit<PromptConfig, "type">) => {
    return new Promise<string | null>((resolve) => {
      setConfig({ ...newConfig, type: "text" });
      setResolveFn(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const confirm = useCallback((newConfig: Omit<PromptConfig, "type" | "placeholder" | "defaultValue">) => {
    return new Promise<boolean>((resolve) => {
      setConfig({ ...newConfig, type: "confirm" });
      setResolveFn(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((newConfig: Omit<PromptConfig, "type" | "placeholder" | "defaultValue" | "cancelText">) => {
    return new Promise<void>((resolve) => {
      setConfig({ ...newConfig, type: "confirm", cancelText: "hidden" });
      setResolveFn(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(
    (value: string | null | boolean) => {
      setIsOpen(false);
      if (resolveFn) {
        resolveFn(value);
        setResolveFn(null);
      }
    },
    [resolveFn]
  );

  return {
    prompt,
    confirm,
    alert,
    isOpen,
    config,
    handleClose,
  };
}
