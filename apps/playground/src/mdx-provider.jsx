import {
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Code,
  ExternalLink,
  FileText,
  Info,
  Search as SearchIcon,
  Settings,
  Terminal as TerminalIcon,
} from "lucide-react";
import { MDXProvider } from "@mdx-js/react";
import { defineMdxComponentRegistry } from "@moyarich/moyaforge/headless";
import { Console, Terminal } from "@moyarich/console";
import { CustomBlock } from "../vendor/packages/moyaforge-ui/src/components/CustomBlock/index.ts";
import { CodeBlock } from "../vendor/packages/moyaforge-ui/src/components/CodeBlock/index.ts";
import {
  CodeGroup,
  CodeTab,
} from "../vendor/packages/moyaforge-ui/src/components/CodeGroup/index.ts";
import { CopyButton } from "../vendor/packages/moyaforge-ui/src/components/CopyButton/index.ts";
import { Demo } from "../vendor/packages/moyaforge-ui/src/components/Demo/index.ts";
import { NavigationTree } from "../vendor/packages/moyaforge-ui/src/components/NavigationTree/index.ts";
import { Page } from "../vendor/packages/moyaforge-ui/src/components/Page/index.ts";
import { Search } from "../vendor/packages/moyaforge-ui/src/components/Search/index.ts";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from "../vendor/packages/moyaforge-ui/src/components/SidebarV2/index.ts";
import { Source } from "../vendor/packages/moyaforge-ui/src/components/Source/index.ts";
import { TableOfContents } from "../vendor/packages/moyaforge-ui/src/components/TableOfContents/index.ts";
import { EmptyState } from "../vendor/packages/moyaforge-ui/src/components/EmptyState/index.ts";
import { EditPageLink } from "../vendor/packages/moyaforge-ui/src/components/EditPageLink/index.ts";
import { DocOutline } from "../vendor/packages/moyaforge-ui/src/components/DocOutline/index.ts";
import { SidebarV1 } from "../vendor/packages/moyaforge-ui/src/components/SidebarV1/index.ts";
import { DocsLayout } from "../vendor/packages/moyaforge-ui/src/components/Layout/DocsLayout/DocsLayout.tsx";
import { DocumentationSite } from "../vendor/packages/moyaforge-ui/src/components/Layout/DocumentationSite/DocumentationSite.tsx";
import { DocsShellFocused } from "../vendor/packages/moyaforge-ui/src/components/DocsShellFocused/index.ts";
import { DocsShellWide } from "../vendor/packages/moyaforge-ui/src/components/DocsShellWide/index.ts";
import { PlaygroundCallout } from "./components/index.js";
import { PreviewDirective } from "./components/PreviewDirective.jsx";
import {
  DocumentationLink,
  DocumentationRoutesContext,
} from "./components/DocumentationLink.jsx";

const components = defineMdxComponentRegistry({
  a: DocumentationLink,
  pre: CodeBlock,
  CodeBlock,
  CustomBlock,
  PreviewDirective,
  CodeGroup,
  CodeTab,
  CopyButton,
  Demo,
  NavigationTree,
  Page,
  Search,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
  Source,
  TableOfContents,
  EditPageLink,
  EmptyState,
  DocOutline,
  SidebarV1,
  DocsLayout,
  DocumentationSite,
  DocsShellFocused,
  DocsShellWide,
  Console,
  Terminal,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Code,
  ExternalLink,
  FileText,
  Info,
  SearchIcon,
  Settings,
  TerminalIcon,
  Callout: PlaygroundCallout,
});

export function PlaygroundMdxProvider({
  children,
  components: overrides = {},
  routes = [],
}) {
  return (
    <DocumentationRoutesContext.Provider value={routes}>
      <MDXProvider components={{ ...components, ...overrides }}>
        {children}
      </MDXProvider>
    </DocumentationRoutesContext.Provider>
  );
}
