import {
  AlertTriangle,
  ArrowRight,
  ArrowUpLeft,
  Ban,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  FolderKanban,
  HelpCircle,
  History,
  Info,
  Key,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  LogIn,
  Pencil,
  Plus,
  Radar,
  SearchCheck,
  ShieldCheck,
  Terminal,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon
} from "lucide-react";

const NAME_TO_LUCIDE: Record<string, LucideIcon> = {
  folder_managed: FolderKanban,
  manage_search: SearchCheck,
  approval_delegation: ClipboardCheck,
  key: Key,
  menu_book: BookOpen,
  contact_support: LifeBuoy,
  notifications: Bell,
  arrow_forward: ArrowRight,
  check_circle: CheckCircle2,
  admin_panel_settings: ShieldCheck,
  workspaces: LayoutGrid,
  group: Users,
  schedule: Clock,
  chevron_right: ChevronRight,
  add: Plus,
  edit: Pencil,
  visibility: Eye,
  block: Ban,
  person_add: UserPlus,
  vpn_key: KeyRound,
  warning: AlertTriangle,
  content_copy: Copy,
  terminal: Terminal,
  radar: Radar,
  calendar_today: Calendar,
  history: History,
  north_west: ArrowUpLeft,
  info: Info,
  rule: ListChecks,
  cancel: XCircle,
  login: LogIn
};

type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
};

export function Icon({ name, className, filled, style }: Props) {
  const Cmp = NAME_TO_LUCIDE[name] ?? HelpCircle;
  return (
    <Cmp
      className={`kontex-icon ${className ?? ""}`}
      size="1em"
      strokeWidth={filled ? 2.4 : 2}
      style={style}
      aria-hidden="true"
    />
  );
}
