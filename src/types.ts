export interface Profile {
  user_id: string;
  display_name: string;
  other_name: string;
  species: string;
  ethnicity: string;
  birthday: string | null;
  birthplace: string;
  title: string;
  life_expectancy_years: number;
  gold_label: string;
  gold_value: number | null;
  healthspan_years: number;
  gold_updated_at: string | null;
  avatar_url: string | null;
  friend_order: string[] | null;
  vault_pin_hash: string | null;
  tab_order: string[] | null;
  tab_muted: string[] | null;
}

export interface Metric {
  id: string;
  key: string;
  label: string;
  unit: string;
  category: 'vitals' | 'body' | 'labs' | 'performance' | string;
  target_low: number | null;
  target_high: number | null;
  direction: 'higher' | 'lower' | 'range' | string;
  display_order: number;
  panel: string;
  is_focus: boolean;
  cadence_months: number | null;
  test_group: string;
  target_source: string;
  why: string;
  focus_order: number;
  focus_goal: string;
  is_public: boolean;
}

export interface Measurement {
  id: string;
  metric_key: string;
  value: number | null;
  text_value: string | null;
  unit: string;
  measured_at: string;
  source: string;
  note: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'physical' | 'mental' | 'craft' | 'world' | string;
  mastery_def: string;
  icon: string;
  pursuing: boolean;
  hidden: boolean;
  display_order: number;
  is_public: boolean;
}

export interface SkillMilestone {
  id: string;
  skill_id: string;
  label: string;
  level: number;
  achieved: boolean;
  achieved_on: string | null;
  progress_current: number | null;
  progress_total: number | null;
  note: string;
  pinned: boolean;
}

export interface Quest {
  id: string;
  title: string;
  kind: 'main' | 'side' | 'retired' | string;
  track: string;
  phase: string;
  status: 'done' | 'active' | 'locked' | string;
  completed_on: string | null;
  progress_current: number | null;
  progress_total: number | null;
  note: string;
  display_order: number;
  is_public: boolean;
  pinned: boolean;
}

export interface AtlasEntry {
  id: string;
  kind: string;
  name: string;
  detail: string;
  happened_on: string | null;
  years: number | null;
  display_order: number;
  is_public: boolean;
}

export interface MedicalEntry {
  id: string;
  kind: string;
  name: string;
  body_part: string;
  happened_on: string | null;
  resolved_on: string | null;
  severity: string;
  note: string;
}

export interface DocumentRow {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  kind: string;
  taken_on: string | null;
  created_at: string;
}

export interface CounterRow {
  id: string;
  key: string;
  label: string;
  value: number | null;
  unit: string;
  category: string;
  note: string;
  display_order: number;
  is_public: boolean;
}

export interface LifeEvent {
  id: string;
  title: string;
  kind: string;
  happened_on: string | null;
  ended_on: string | null;
  place: string;
  note: string;
}

export interface MoneyRow {
  id: string; key: string; label: string; value: number | null;
  unit: string; category: string; note: string; display_order: number;
  recorded_on: string | null;
}

export interface ItemRow {
  id: string; name: string; slot: string; brand: string;
  acquired_on: string | null; value: number | null; note: string;
}

export interface NoteRow {
  id: string; kind: string; title: string; body: string;
  status: string; answer: string; severity: string; display_order: number;
}

export interface Sheet {
  profile: Profile | null;
  metrics: Metric[];
  measurements: Measurement[];
  skills: Skill[];
  milestones: SkillMilestone[];
  quests: Quest[];
  atlas: AtlasEntry[];
  medical: MedicalEntry[];
  documents: DocumentRow[];
  counters: CounterRow[];
  events: LifeEvent[];
  money: MoneyRow[];
  items: ItemRow[];
  notes: NoteRow[];
}

export const EMPTY_SHEET: Sheet = {
  profile: null,
  metrics: [],
  measurements: [],
  skills: [],
  milestones: [],
  quests: [],
  atlas: [],
  medical: [],
  documents: [],
  counters: [],
  events: [],
  money: [],
  items: [],
  notes: [],
};
