import { MinimalLoader } from "./MinimalLoader";

export default function SectionLoading() {
  return (
    <div className="ui-page-loading">
      <MinimalLoader label="Loading section" />
    </div>
  );
}
