export interface DirNode {
  name: string;
  path: string;
  children: DirNode[] | null; // null = not loaded yet
  expanded: boolean;
  level: number;
  hasKids: boolean | null;    // null = unknown
}

export interface KeypressInfo {
  ctrl?: boolean;
  meta?: boolean;
}
