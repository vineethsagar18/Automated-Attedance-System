"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

const multiStepFormVariants = cva("flex flex-col", {
  variants: {
    size: {
      default: "w-full md:w-[700px]",
      sm: "w-full md:w-[550px]",
      lg: "w-full md:w-[860px]",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface MultiStepFormProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiStepFormVariants> {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  onBack: () => void;
  onNext: () => void;
  nextButtonText?: string;
  backButtonText?: string;
  disableNext?: boolean;
  footerContent?: React.ReactNode;
}

const MultiStepForm = React.forwardRef<HTMLDivElement, MultiStepFormProps>(
  (
    {
      className,
      size,
      currentStep,
      totalSteps,
      title,
      description,
      onBack,
      onNext,
      nextButtonText = "Next Step",
      backButtonText = "Back",
      disableNext = false,
      footerContent,
      children,
      ...props
    },
    ref,
  ) => {
    const progress = Math.round((currentStep / totalSteps) * 100);

    const variants = {
      hidden: { opacity: 0, x: 90 },
      enter: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -90 },
    };

    return (
      <div
        ref={ref}
        className={cn(
          multiStepFormVariants({ size }),
          "rounded-3xl border border-[#FFC193]/80 bg-white/90 shadow-[0_20px_55px_-28px_rgba(255,55,55,0.35)]",
          className,
        )}
        {...props}
      >
        <div className="border-b border-[#FFC193]/70 p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-[#1f1f1f]">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFEDCE]">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#FF8383] to-[#FF3737] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mono-label whitespace-nowrap">
              {currentStep}/{totalSteps}
            </p>
          </div>
        </div>

        <div className="min-h-[280px] overflow-hidden p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={variants}
              initial="hidden"
              animate="enter"
              exit="exit"
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#FFC193]/70 p-5 sm:p-6">
          <div>{footerContent}</div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={onBack} className="rounded-xl border-[#FFC193]">
                {backButtonText}
              </Button>
            )}
            <Button onClick={onNext} disabled={disableNext} className="rounded-xl bg-[#FF3737] text-white hover:bg-[#e43131]">
              {nextButtonText}
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

MultiStepForm.displayName = "MultiStepForm";

export { MultiStepForm };
