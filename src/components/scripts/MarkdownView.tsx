import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
  source: string;
  className?: string;
}

export default function MarkdownView({ source, className }: Props) {
  if (!source?.trim()) return null;
  return (
    <div className={cn("markdown-view text-white/85 leading-relaxed text-[15px]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-2xl font-semibold tracking-tight text-white mt-8 mb-4" {...p} />,
          h2: (p) => <h2 className="text-xl font-semibold tracking-tight text-white mt-7 mb-3" {...p} />,
          h3: (p) => <h3 className="text-lg font-semibold tracking-tight text-white mt-6 mb-3" {...p} />,
          p: (p) => <p className="mb-4 text-white/75 leading-[1.75]" {...p} />,
          strong: (p) => <strong className="text-white font-semibold" {...p} />,
          em: (p) => <em className="italic text-white/85" {...p} />,
          a: (p) => <a className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white" target="_blank" rel="noreferrer" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 mb-4 space-y-1.5 text-white/75 marker:text-white/40" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-white/75 marker:text-white/40" {...p} />,
          li: (p) => <li className="leading-[1.7]" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-5 pl-5 border-l-2 border-white/30 bg-white/[0.03] py-3 pr-4 rounded-r-xl text-white/80" {...p} />
          ),
          code: ({ inline, ...p }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[13px] font-mono" {...p} />
            ) : (
              <code className="block p-4 rounded-2xl bg-black/60 border border-white/10 text-white/80 text-[13px] font-mono overflow-x-auto whitespace-pre" {...p} />
            ),
          hr: () => <hr className="my-8 border-white/10" />,
          img: (p) => (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img loading="lazy" className="my-6 rounded-2xl border border-white/10 max-w-full mx-auto shadow-2xl" {...p} />
          ),
          table: (p) => (
            <div className="my-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="text-left bg-white/5 px-4 py-2 font-semibold text-white" {...p} />,
          td: (p) => <td className="px-4 py-2 border-t border-white/5 text-white/75" {...p} />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
