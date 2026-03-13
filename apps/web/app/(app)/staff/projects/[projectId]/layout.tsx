type LayoutProps = {
  children: React.ReactNode;
};

export default function StaffProjectLayout({ children }: LayoutProps) {
  return <div className="stack">{children}</div>;
}
