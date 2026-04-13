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
    : 0;
  const [openIndex, setOpenIndex] = useState<number | null>(
    initialIndex >= 0 ? initialIndex : 0,
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
          <div
            key={item.question}
            data-reveal={reveal ? "" : undefined}
            style={revealStyle}
          >
            <div className={`faq__item${isOpen ? " faq__item--open" : ""}`}>
              <button
                type="button"
                className="faq__trigger"
                aria-expanded={isOpen}
                onClick={() => handleToggle(index)}
              >
                {item.question}
              </button>
              <div className="faq__body">
                <div className="faq__body-inner">
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
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
