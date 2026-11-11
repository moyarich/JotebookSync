import { HighlightedCode } from "./HighlightedCode.js";
import "./Preview.css";
import { Check, CodeXml, Copy, Eye, CircleAlert } from "lucide-react";
import {
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type ReactElement,
  type MouseEvent,
} from "react";
import { CopyButton } from "../CopyButton/CopyButton.js";

type View = "preview" | "code";
interface PreviewState {
  view: View;
  setView: (view: View) => void;
  contentId: string;
  source?: string;
}
const PreviewContext = createContext<PreviewState | null>(null);
function usePreview() {
  const context = useContext(PreviewContext);
  if (!context)
    throw new Error("Preview slots must be rendered inside <Preview>.");
  return context;
}

/** Source is supplied by the caller (or MDX tooling), not extracted from React children. */
export interface PreviewProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "title"
> {
  title?: string;
  source?: string;
  language?: string;
  defaultView?: View;
}
export function Preview({
  children,
  title = "Component preview",
  source,
  language = "tsx",
  defaultView = "preview",
  className,
  ...props
}: PreviewProps) {
  const [view, setView] = useState<View>(defaultView);
  const contentId = useId();
  const state: PreviewState = { view, setView, contentId, source };
  const hasSlots = Array.isArray(children)
    ? children.some((child) => isPreviewSlot(child))
    : isPreviewSlot(children);
  return (
    <PreviewContext.Provider value={state}>
      <section
        data-moyaforge-preview=""
        data-view={view}
        aria-label={title}
        className={className}
        {...props}
      >
        {hasSlots ? (
          children
        ) : (
          <>
            <PreviewHeader>
              <PreviewTitle>{title}</PreviewTitle>
              {source !== undefined && (
                <PreviewActions>
                  <PreviewCodeToggle />
                  <PreviewCopyButton />
                </PreviewActions>
              )}
            </PreviewHeader>
            <PreviewContent>{children}</PreviewContent>
            {source !== undefined && (
              <PreviewSource code={source} language={language} />
            )}
          </>
        )}
      </section>
    </PreviewContext.Provider>
  );
}
const slotComponents = new Set<unknown>();
function isPreviewSlot(value: ReactNode): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    slotComponents.has(value.type)
  );
}
export function PreviewHeader(props: ComponentPropsWithoutRef<"div">) {
  return <div data-moyaforge-preview-toolbar="" {...props} />;
}
export function PreviewTitle(props: ComponentPropsWithoutRef<"span">) {
  return <span data-moyaforge-preview-title="" {...props} />;
}
export function PreviewActions(props: ComponentPropsWithoutRef<"div">) {
  return <div data-moyaforge-preview-actions="" {...props} />;
}
export interface PreviewCodeToggleProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "type"
> {
  /** Merge trigger behavior onto one child button or forwardRef button component. */
  asChild?: boolean;
}

/** The child must forward onClick and ARIA props; no extra button is rendered. */
export function PreviewCodeToggle({
  asChild = false,
  children,
  onClick,
  ...props
}: PreviewCodeToggleProps) {
  const { view, setView, contentId } = usePreview();
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) setView(view === "code" ? "preview" : "code");
  };
  const triggerProps = {
    ...props,
    "aria-controls": contentId,
    "aria-expanded": view === "code",
    "data-moyaforge-preview-toggle": "",
    onClick: toggle,
  };
  if (asChild) {
    if (!isValidElement(children) || children.type === Fragment)
      throw new Error(
        "PreviewCodeToggle asChild requires exactly one non-fragment element.",
      );
    const child = children as ReactElement<ComponentPropsWithoutRef<"button">>;
    if (typeof child.type === "string" && child.type !== "button")
      throw new Error(
        "PreviewCodeToggle asChild requires a button or button-like component.",
      );
    return cloneElement(child, {
      ...triggerProps,
      ...child.props,
      "aria-controls": contentId,
      "aria-expanded": view === "code",
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) toggle(event);
      },
    });
  }
  return (
    <button type="button" {...triggerProps}>
      {children ?? (
        <>
          {view === "code" ? (
            <Eye size={15} aria-hidden="true" />
          ) : (
            <CodeXml size={15} aria-hidden="true" />
          )}
          <span>{view === "code" ? "Preview" : "Code"}</span>
        </>
      )}
    </button>
  );
}
export function PreviewCopyButton(
  props: Omit<
    ComponentPropsWithoutRef<typeof CopyButton>,
    "value" | "getValue"
  > & { code?: string },
) {
  const { source } = usePreview();
  const {
    code,
    children = "Copy",
    icon = (
      <span data-moyaforge-preview-copy-icons="" aria-hidden="true">
        <Copy size={15} data-copy-icon="idle" />
        <Check size={15} data-copy-icon="copied" />
        <CircleAlert size={15} data-copy-icon="error" />
      </span>
    ),
    ...rest
  } = props;
  return (
    <CopyButton
      aria-label="Copy example source"
      data-moyaforge-preview-copy=""
      icon={icon}
      {...rest}
      value={code ?? source ?? ""}
    >
      {children}
    </CopyButton>
  );
}
type SlotProps = ComponentPropsWithoutRef<"div"> & { asChild?: boolean };

/** Merge state and DOM attributes onto a single child that forwards DOM props. */
function Slot({ children, asChild, ...props }: SlotProps) {
  if (!asChild) return <div {...props}>{children}</div>;
  if (!isValidElement(children) || children.type === Fragment)
    throw new Error(
      "Preview asChild requires exactly one non-fragment React element.",
    );
  const child = children as ReactElement<ComponentPropsWithoutRef<"div">>;
  return cloneElement(child, {
    ...child.props,
    ...props,
    className:
      [child.props.className, props.className].filter(Boolean).join(" ") ||
      undefined,
    style: { ...child.props.style, ...props.style },
  });
}

export function PreviewContent({
  asChild = false,
  children,
  ...props
}: SlotProps) {
  const { view, contentId } = usePreview();
  return (
    <Slot
      asChild={asChild}
      id={contentId}
      data-moyaforge-preview-content=""
      hidden={view === "code"}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <div data-moyaforge-preview-stage="">{children}</div>
      )}
    </Slot>
  );
}

export interface PreviewSourceProps extends Omit<
  ComponentPropsWithoutRef<"pre">,
  "children"
> {
  /** When asChild is enabled, the sole child receives visibility and data attributes. */
  asChild?: boolean;
  children?: ReactNode;
  code?: string;
  language?: string;
}
export function PreviewSource({
  asChild = false,
  children,
  code,
  language = "tsx",
  ...props
}: PreviewSourceProps) {
  const { view, source } = usePreview();
  const displayCode = code ?? source ?? "";
  if (asChild) {
    if (!isValidElement(children) || children.type === Fragment)
      throw new Error(
        "PreviewSource asChild requires exactly one non-fragment React element.",
      );
    const child = children as ReactElement<
      ComponentPropsWithoutRef<"pre"> & {
        "data-moyaforge-preview-source"?: string;
        "data-language"?: string;
      }
    >;
    return cloneElement(child, {
      ...child.props,
      ...props,
      "data-moyaforge-preview-source": "",
      "data-language": language,
      hidden: view !== "code",
    });
  }
  return (
    <pre
      data-moyaforge-preview-source=""
      data-language={language}
      hidden={view !== "code"}
      {...props}
    >
      <HighlightedCode code={displayCode} language={language} />
    </pre>
  );
}
export function PreviewFooter(props: ComponentPropsWithoutRef<"div">) {
  return <div data-moyaforge-preview-footer="" {...props} />;
}
for (const component of [
  PreviewHeader,
  PreviewTitle,
  PreviewActions,
  PreviewContent,
  PreviewSource,
  PreviewFooter,
])
  slotComponents.add(component);
