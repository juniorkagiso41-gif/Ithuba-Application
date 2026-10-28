export type UserRole = "graduate" | "employer" | "verifier";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  headline: string | null;
  bio: string | null;
  location: string | null;
  skills: string | null;
  work_preference: string | null;
  education: string | null;
  updated_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string;
  company_name?: string | null;
  department?: string | null;
  experience_level?: string | null;
  education_level?: string | null;
  work_arrangement?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  benefits?: string | null;
  application_deadline?: string | null;
  openings?: number;
  skills?: string | null;
  created_at: string;
  employer_name?: string;
}

export interface WorkExperience {
  id: string;
  graduate_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  employment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string;
  created_at: string;
}

export interface GraduateProject {
  id: string;
  graduate_id: string;
  title: string;
  description: string;
  technologies: string | null;
  project_url: string | null;
  evidence_path: string | null;
  created_at: string;
}

export interface GraduateDocument {
  id: string;
  graduate_id: string;
  document_type: "cv" | "project";
  file_name: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  graduate_id: string;
  cover_letter: string;
  status: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
  candidate_name?: string;
}
