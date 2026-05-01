import dynamic from "next/dynamic";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false });

export function DiffView({ base, head }: { base: string; head: string }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <ReactDiffViewer oldValue={base} newValue={head} splitView />
    </div>
  );
}
