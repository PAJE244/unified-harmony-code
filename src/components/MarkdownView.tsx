import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  source: string;
  className?: string;
}

/** Shared markdown renderer with Apple-glass typography. */
export default function MarkdownView({ source, className = "" }: Props) {
  if (!source?.trim()) {
    return <p className="text-sm text-[#555]">Sem conteúdo.</p>;
  }
  return (
    <div className={`md-content text-[15px] text-zinc-200 leading-relaxed space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-2xl font-display font-semibold text-white mt-6 mb-2 tracking-tight" {...p} />,
          h2: (p) => <h2 className="text-xl font-display font-semibold text-white mt-5 mb-2 tracking-tight" {...p} />,
          h3: (p) => <h3 className="text-lg font-semibold text-white mt-4 mb-1.5" {...p} />,
          p:  (p) => <p className="text-[15px] text-zinc-300 leading-relaxed" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 space-y-1.5 marker:text-zinc-500" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 space-y-1.5 marker:text-zinc-500" {...p} />,
          li: (p) => <li className="text-zinc-300 leading-relaxed" {...p} />,
          a:  (p) => <a className="text-white underline decoration-zinc-600 underline-offset-2 hover:decoration-white transition-colors" target="_blank" rel="noreferrer" {...p} />,
          strong: (p) => <strong className="text-white font-semibold" {...p} />,
          em: (p) => <em className="text-zinc-200 italic" {...p} />,
          blockquote: (p) => (
            <blockquote className="border-l-2 border-white/30 bg-white/[0.03] pl-4 pr-3 py-3 rounded-r-2xl text-zinc-300 italic" {...p} />
          ),
          code: (p) => <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[13px] text-zinc-100 font-mono" {...p} />,
          hr: () => <hr className="border-white/10 my-6" />,
          img: ({ alt, src }) => (
            <img src={src as string} alt={alt || ""} loading="lazy" className="rounded-2xl border border-white/10 my-4 max-w-full" />
          ),
          table: (p) => <table className="w-full text-sm border-collapse my-4" {...p} />,
          th: (p) => <th className="text-left border-b border-white/15 py-2 px-3 font-semibold text-white" {...p} />,
          td: (p) => <td className="border-b border-white/5 py-2 px-3 text-zinc-300" {...p} />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
