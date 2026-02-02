'use client';

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <details key={item.question} className="faq__item" data-reveal open={isOpen}>
            <summary
              onClick={(event) => {
                event.preventDefault();
                handleToggle(index);
              }}
            >
              {item.question}
            </summary>
            <p className="faq__answer">{item.answer}</p>
          </details>
        );
      })}
    </div>
  );
}
