'use client';

import type { CSSProperties } from "react";
import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

type FaqAccordionProps = {
  items: FaqItem[];
  reveal?: boolean;
  initialOpenQuestion?: string;
};

export function FaqAccordion({ items, reveal = true, initialOpenQuestion }: FaqAccordionProps) {
  const initialIndex = initialOpenQuestion
    ? items.findIndex((item) => item.question === initialOpenQuestion)
    : -1;
  const [openIndex, setOpenIndex] = useState<number | null>(
    initialIndex >= 0 ? initialIndex : null,
  );

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const revealStyle = reveal
          ? ({ "--reveal-delay": `${120 + index * 70}ms` } as CSSProperties)
          : undefined;
        return (
          <details
            key={item.question}
            className="faq__item"
            open={isOpen}
            data-reveal={reveal ? "" : undefined}
            style={revealStyle}
          >
            <summary
              onClick={(event) => {
                event.preventDefault();
                handleToggle(index);
              }}
            >
              {item.question}
            </summary>
            <p className="faq__answer">{item.answer}</p>
            {item.links && item.links.length > 0 ? (
              <div className="faq__links">
                {item.links.map((link) => (
                  <a key={link.href} href={link.href} className="link-ghost">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </details>
        );
      })}
    </div>
  );
}
