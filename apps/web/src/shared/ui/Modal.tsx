import type { ReactNode } from "react";

type ModalProps = {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({ title, footer, children }: ModalProps) {
  return (
    <div className="modal">
      <div className="modal__dialog">
        {title ? (
          <header className="modal__header">
            <h3>{title}</h3>
          </header>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
