export type TargetName = 'claude' | 'agents';

export interface Target {
  skills: string;
  agents: string | null;
  label: string;
}

export interface RegistrySkill {
  name: string;
  source: string;
  summary: string;
  tags?: string[];
  /** Skills this one bundles; installed automatically, recorded only in the lock. */
  requires?: string[];
  /** Subagents (agents/<name>.md in the library) installed alongside. */
  agents?: string[];
  /** Project types this skill is recommended for by `bee init`. */
  for?: string[];
}

export interface Registry {
  registryVersion: number;
  skills: RegistrySkill[];
}

export interface ProjectInfo {
  type: string;
  stage: 'new' | 'existing' | string;
  workflow: 'full' | 'build' | 'lean' | string;
  description?: string;
}

export interface Manifest {
  name?: string;
  project?: ProjectInfo;
  targets?: TargetName[];
  /** skill name → source spec */
  skills: Record<string, string>;
  /** Commit installed skills instead of gitignoring them. */
  vendor?: boolean;
}

export interface LockEntry {
  source: string;
  resolved: string;
  integrity: string;
  commit?: string;
  agents?: string[];
  requiredBy?: string[];
}

export interface Lock {
  lockfileVersion?: number;
  generatedBy?: string;
  skills: Record<string, LockEntry>;
}

export type Source =
  | { kind: 'bee'; name: string }
  | { kind: 'git'; url: string; sub: string; ref: string | null }
  | { kind: 'file'; path: string };

export interface InstallOptions {
  update?: boolean;
  only?: string[] | null;
  frozen?: boolean;
  force?: boolean;
}

export interface InstallResult {
  results: { name: string; entry: LockEntry; changed: boolean }[];
  problems: string[];
  lock: Lock;
}

export type Flags = Record<string, string | boolean | undefined>;
