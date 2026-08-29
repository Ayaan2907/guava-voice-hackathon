export type Vertical =
  | "insurance"
  | "healthcare"
  | "logistics"
  | "ecommerce"
  | "custom";

export type FieldType =
  | "text"
  | "date"
  | "datetime"
  | "integer"
  | "multiple_choice"
  | "calendar_slot";

export type PlaybookField = {
  key: string;
  fieldType: FieldType;
  description: string;
  required: boolean;
  choices?: string[];
};

export type Intent = {
  id: string;
  label: string;
  description: string;
  action: "collect" | "answer" | "negotiate" | "book" | "escalate";
};

export type KnowledgeDoc = {
  id: string;
  title: string;
  body: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  language: "english" | "spanish" | "french";
  reason: string;
  context: string;
  status: "queued" | "dialing" | "live" | "completed" | "no_answer";
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  vertical: Vertical;
  city: string;
  tagline: string;
  agentName: string;
  voice: "grace" | "jack";
  brandColor: string;
  languages: {
    primary: "english" | "spanish" | "french" | "german" | "italian";
    secondary: Array<"english" | "spanish" | "french" | "german" | "italian">;
  };
  webrtcCode: string;
  openingScript: string;
  persona: string;
  purpose: string;
  authority: {
    maxConcession: string;
    cannotDo: string[];
    notes: string;
  };
  intents: Intent[];
  fields: PlaybookField[];
  knowledge: KnowledgeDoc[];
  negotiationMoves: string[];
  leads: Lead[];
  createdAt: string;
};

export type TranscriptRole = "caller" | "agent" | "operator" | "system";

export type TranscriptLine = {
  id: string;
  role: TranscriptRole;
  text: string;
  at: string;
  language?: string;
  translated?: string;
};

export type Session = {
  id: string;
  tenantSlug: string;
  direction: "inbound" | "outbound";
  status: "ringing" | "live" | "escalated" | "ended";
  language: string;
  callerName: string;
  subject: string;
  leadId?: string;
  fields: Record<string, string>;
  transcript: TranscriptLine[];
  pendingWhisper: string | null;
  pendingLanguage: string | null;
  createdAt: string;
  endedAt: string | null;
};

export type PactEvent = {
  type:
    | "session.created"
    | "session.updated"
    | "session.ended"
    | "tenant.updated"
    | "whisper.sent";
  tenantSlug: string;
  sessionId?: string;
  at: string;
};

export type StoreShape = {
  tenants: Tenant[];
};
