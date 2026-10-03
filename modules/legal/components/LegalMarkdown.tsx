import Link from "next/link";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INLINE_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { slugifyHeading } from "../utils/legalSections";

type HastElement = NonNullable<ExtraProps["node"]>;
type HastNode = HastElement | HastElement["children"][number];

// Texto plano de un nodo hast: el mismo título que lee `getLegalSections`, para que el índice y los ids coincidan.
function getNodeText(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(getNodeText).join("");
  return "";
}

const SECTION_HEADING =
  "mt-10 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight first:mt-0";
const LIST = "mb-4 space-y-2 pl-6 marker:text-muted-foreground";

function SectionHeading({ node, ...props }: React.ComponentProps<"h2"> & ExtraProps) {
  return <h2 id={slugifyHeading(getNodeText(node))} className={SECTION_HEADING} {...props} />;
}

function MinorHeading({ node: _node, ...props }: React.ComponentProps<"h4"> & ExtraProps) {
  return <h4 className="mt-6 mb-2 text-base font-bold" {...props} />;
}

function MarkdownLink({
  node: _node,
  href = "",
  children,
  ...props
}: React.ComponentProps<"a"> & ExtraProps) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={INLINE_LINK} {...props}>
        {children}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={INLINE_LINK}
        {...props}
      >
        {children}
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    );
  }
  // `#ancla`, `mailto:` y cualquier otro valor que deje pasar el `urlTransform` por defecto.
  return (
    <a href={href} className={INLINE_LINK} {...props}>
      {children}
    </a>
  );
}

const components: Components = {
  h1: SectionHeading,
  h2: SectionHeading,
  h3: ({ node: _node, ...props }) => <h3 className="mt-8 mb-3 text-lg font-bold" {...props} />,
  h4: MinorHeading,
  h5: MinorHeading,
  h6: MinorHeading,
  p: ({ node: _node, ...props }) => <p className="mb-4 text-base leading-relaxed" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className={cn(LIST, "list-disc")} {...props} />,
  ol: ({ node: _node, ...props }) => <ol className={cn(LIST, "list-decimal")} {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
  a: MarkdownLink,
  strong: ({ node: _node, ...props }) => <strong className="font-bold" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-6 rounded-2xl border-l-4 border-primary bg-muted p-4 text-sm [&>p]:mb-0"
      {...props}
    />
  ),
  hr: () => <Separator className="my-8" />,
  table: ({ node: _node, ...props }) => <Table className="my-6" {...props} />,
  thead: ({ node: _node, ...props }) => <TableHeader {...props} />,
  tbody: ({ node: _node, ...props }) => <TableBody {...props} />,
  tr: ({ node: _node, ...props }) => <TableRow {...props} />,
  th: ({ node: _node, ...props }) => <TableHead {...props} />,
  td: ({ node: _node, ...props }) => <TableCell {...props} />,
  code: ({ node: _node, ...props }) => <code className="rounded bg-muted px-1 text-sm" {...props} />,
};

type LegalMarkdownProps = {
  content: string;
  className?: string;
};

/**
 * Markdown de los documentos legales con estilos de tokens. Sin HTML crudo (no hay `rehype-raw`) ni imágenes.
 * Sin hooks ni directiva: sirve en Server Components y en cliente.
 */
export function LegalMarkdown({ content, className }: LegalMarkdownProps) {
  return (
    <div className={cn("text-foreground", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={["img"]}
        unwrapDisallowed
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
}
