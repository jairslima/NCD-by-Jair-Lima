export interface DirNode {
  name: string;
  path: string;
  children: DirNode[] | null; // null = not loaded yet
  expanded: boolean;
  level: number;
  hasKids: boolean | null;    // null = unknown
}
