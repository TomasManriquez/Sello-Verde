'use client';

import React from 'react';
import { TC6_ESTADOS, Tc6Estado } from '@/lib/constants';

interface StepperProps {
  current: Tc6Estado | string;
  onStepClick?: (estado: Tc6Estado) => void;
  interactive?: boolean;
}

export function Stepper({ current, onStepClick, interactive = false }: StepperProps) {
  const currentIndex = TC6_ESTADOS.findIndex(s => s.key === current);

  return (
    <div className="stepper">
      {TC6_ESTADOS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive    = i === currentIndex;
        const stepClass   = isCompleted ? 'completed' : isActive ? 'active' : '';
        const canClick    = interactive && onStepClick && i === currentIndex + 1;

        return (
          <div key={step.key} className={`stepper-step ${stepClass}`}>
            <button
              className="stepper-dot"
              onClick={() => canClick && onStepClick && onStepClick(step.key as Tc6Estado)}
              disabled={!canClick}
              style={{
                cursor: canClick ? 'pointer' : 'default',
                border: 'none',
                font: 'inherit',
              }}
              title={canClick ? `Avanzar a "${step.label}"` : step.label}
              aria-label={step.label}
            >
              {isCompleted ? '✓' : i + 1}
            </button>
            <span className="stepper-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
