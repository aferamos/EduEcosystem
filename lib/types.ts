export type UserRole = 'super_admin' | 'admin' | 'coordenador' | 'professor' | 'aluno' | 'responsavel';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  institution_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  institution?: Institution;
  profile?: Profile;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'web' | null;
  os: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  expires_at: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  language: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  biometric_login: boolean;
  updated_at: string;
}

export interface UserActiveContext {
  user_id: string;
  institution_id: string | null;
  role: UserRole | null;
  profile_id: string | null;
  updated_at: string;
}

export interface UserMFA {
  id: string;
  user_id: string;
  totp_enabled: boolean;
  totp_secret: string | null;
  totp_verified_at: string | null;
  backup_codes: string[];
  method_preference: 'none' | 'totp' | 'sms' | 'email';
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'manage' | 'export';
  scope: 'own' | 'institution' | 'all';
  created_at: string;
}

export interface Course {
  id: string;
  institution_id: string;
  name: string;
  level: string;
  duration_years: number;
  active: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  institution_id: string;
  course_id: string | null;
  name: string;
  year: number;
  shift: 'morning' | 'afternoon' | 'evening' | 'full' | null;
  max_students: number;
  active: boolean;
  created_at: string;
  course?: Course;
}

export interface Subject {
  id: string;
  institution_id: string;
  name: string;
  code: string | null;
  workload_hours: number | null;
  active: boolean;
  created_at: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  weekly_hours: number;
  created_at: string;
  subject?: Subject;
  class?: Class;
  teacher_profile?: Profile;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  institution_id: string;
  enrollment_number: string | null;
  enrollment_date: string;
  status: 'ativo' | 'transferido' | 'concluido' | 'cancelado';
  created_at: string;
  class?: Class;
  profile?: Profile;
}

export interface AcademicPeriod {
  id: string;
  institution_id: string;
  name: string;
  type: 'bimestre' | 'trimestre' | 'semestre' | 'anual';
  start_date: string;
  end_date: string;
  year: number;
  active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  class_subject_id: string;
  student_id: string;
  date: string;
  status: 'presente' | 'falta' | 'justificado' | 'atraso';
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Assessment {
  id: string;
  class_subject_id: string;
  academic_period_id: string | null;
  title: string;
  type: 'prova' | 'teste' | 'trabalho' | 'projeto' | 'quiz' | 'recuperacao';
  date: string | null;
  max_score: number;
  weight: number;
  created_at: string;
  class_subject?: ClassSubject;
  academic_period?: AcademicPeriod;
}

export interface Grade {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number | null;
  status: 'pendente' | 'lancada' | 'falta' | 'dispensado';
  note: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  assessment?: Assessment;
}

export interface Occurrence {
  id: string;
  institution_id: string;
  student_id: string;
  reported_by: string;
  class_id: string | null;
  type: 'disciplinar' | 'academico' | 'comportamental' | 'elogio' | 'observacao';
  title: string;
  description: string | null;
  severity: 'baixa' | 'media' | 'alta' | null;
  status: 'aberta' | 'em_andamento' | 'resolvida' | 'encerrada';
  created_at: string;
  updated_at: string;
  student_profile?: Profile;
  reporter_profile?: Profile;
}

export interface Notification {
  id: string;
  institution_id: string;
  recipient_id: string;
  sender_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'alerta' | 'sucesso' | 'urgente' | 'nota' | 'frequencia' | 'ocorrencia';
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface Communication {
  id: string;
  institution_id: string;
  sender_id: string;
  title: string;
  message: string;
  audience: string[];
  class_ids: string[];
  pinned: boolean;
  published_at: string;
  created_at: string;
  sender_profile?: Profile;
}

export interface Event {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  type: 'feriado' | 'avaliacao' | 'reuniao' | 'atividade' | 'geral';
  class_ids: string[];
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  institution_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profile?: Profile;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
  roles: UserRoleRecord[];
  currentInstitution: Institution | null;
  currentRole: UserRole | null;
  permissions: RolePermission[];
  settings: UserSettings | null;
  mfa: UserMFA | null;
  sessions: UserSession[];
}
