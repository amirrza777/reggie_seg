'use client';

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!initialOpenQuestion) {
      return;
    }
    const nextIndex = items.findIndex((item) => item.question === initialOpenQuestion);
    setOpenIndex(nextIndex >= 0 ? nextIndex : null);
  }, [initialOpenQuestion, items]);

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <details
            key={item.question}
            className="faq__item"
            data-reveal={reveal ? "" : undefined}
            open={isOpen}
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
