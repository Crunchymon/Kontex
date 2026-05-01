export function ContextView({ content }: { content: string }) {
  return (
    <pre className="overflow-x-auto rounded border bg-white p-4 text-sm leading-6">
      {content}
    </pre>
  );
}
