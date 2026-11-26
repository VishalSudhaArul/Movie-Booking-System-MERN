// The CineBook UI kit. Import from here: import { Button, Tabs } from "../components/ui";
// Class-level styles live in src/index.css (@layer components) and the tokens
// they use in tailwind.config.js. See docs/design-system.md.

export { default as Button, IconButton } from "./Button";
export { default as Card } from "./Card";
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as Drawer } from "./Drawer";
export { default as Field } from "./Field";
export { default as Icon } from "./Icon";
export { default as Modal } from "./Modal";
export { default as PageHeader, StatCard } from "./PageHeader";
export { default as Tabs, TabPanel, SegmentedControl } from "./Tabs";
export { default as Tooltip } from "./Tooltip";
export { ToastProvider, useToast } from "./Toast";
export { TextField, PasswordField, SearchInput, Select, TextArea, Choice, Switch } from "./Input";
export { Breadcrumbs, Pagination } from "./Navigation";
export {
  Spinner,
  PageLoader,
  InlineLoader,
  EmptyState,
  ErrorState,
  MovieCardSkeleton,
  MovieGridSkeleton,
  Skeleton,
  SkeletonText,
  TableSkeleton,
} from "./Feedback";
