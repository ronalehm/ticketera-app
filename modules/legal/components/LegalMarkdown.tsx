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

// Quita `node` (el nodo hast que pasa react-markdown) para no llevarlo al DOM ni a componentes cliente.
function omitNode<P extends ExtraProps>(props: P): Omit<P, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

type StyledTag = "h3" | "h4" | "p" | "ul" | "ol" | "li" | "strong" | "em" | "blockquote" | "code";

// Elemento nativo con las clases de tokens del documento legal (más las que traiga el markdown, p. ej. listas de tareas).
function styled<T extends StyledTag>(tag: T, baseClassName: string) {
  return function StyledElement({ className, ...props }: React.ComponentProps<T> & ExtraProps) {
    const Tag = tag as React.ElementType;
    return <Tag className={cn(baseClassName, className)} {...omitNode(props)} />;
  };
}

function SectionHeading({ className, ...props }: React.ComponentProps<"h2"> & ExtraProps) {
  return (
    <h2
      id={slugifyHeading(getNodeText(props.node))}
      className={cn("mt-10 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight first:mt-0", className)}
      {...omitNode(props)}
    />
  );
}

function MarkdownLink({ href = "", children, ...props }: React.ComponentProps<"a"> & ExtraProps) {
  const linkProps = { ...omitNode(props), className: cn(INLINE_LINK, props.className) };
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...linkProps}>
        {children}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...linkProps}>
        {children}
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    );
  }
  // `#ancla`, `mailto:` y cualquier otro valor que deje pasar el `urlTransform` por defecto.
  return (
    <a href={href} {...linkProps}>
      {children}
    </a>
  );
}

const LIST = "mb-4 space-y-2 pl-6 marker:text-muted-foreground";
const MinorHeading = styled("h4", "mt-6 mb-2 text-base font-bold");

const components: Components = {
  h1: SectionHeading,
  h2: SectionHeading,
  h3: styled("h3", "mt-8 mb-3 text-lg font-bold"),
  h4: MinorHeading,
  h5: MinorHeading,
  h6: MinorHeading,
  p: styled("p", "mb-4 text-base leading-relaxed"),
  ul: styled("ul", cn(LIST, "list-disc")),
  ol: styled("ol", cn(LIST, "list-decimal")),
  li: styled("li", "pl-1 leading-relaxed"),
  a: MarkdownLink,
  strong: styled("strong", "font-bold"),
  em: styled("em", "italic"),
  blockquote: styled(
    "blockquote",
    "my-6 rounded-2xl border-l-4 border-primary bg-muted p-4 text-sm [&>p]:mb-0",
  ),
  hr: () => <Separator className="my-8" />,
  table: (props) => <Table {...omitNode(props)} className={cn("my-6", props.className)} />,
  thead: (props) => <TableHeader {...omitNode(props)} />,
  tbody: (props) => <TableBody {...omitNode(props)} />,
  tr: (props) => <TableRow {...omitNode(props)} />,
  th: (props) => <TableHead {...omitNode(props)} />,
  td: (props) => <TableCell {...omitNode(props)} />,
  code: styled("code", "rounded bg-muted px-1 text-sm"),
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
