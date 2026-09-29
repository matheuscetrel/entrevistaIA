const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const TOKEN_KEY = "ai_interview_token";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 401) clearToken();
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.message ?? body.detail ?? "Erro ao acessar o servidor");
  }

  const body = await response.json();
  return (body.success === true ? body.data : body) as T;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export async function apiLogin(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(data.message ?? data.detail ?? "Credenciais inválidas");
  }
  const data = (await response.json()) as TokenResponse;
  setToken(data.access_token);
  return data;
}

export function apiRegister(payload: {
  email: string;
  username: string;
  full_name?: string;
  password: string;
  cpf: string;
  security_question: string;
  security_answer: string;
}): Promise<UserResponse> {
  return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export interface InterviewResponse {
  id: number;
  user_id: number;
  title: string;
  interview_type: string;
  difficulty_level: string;
  seniority?: string;
  job_role: string | null;
  company_context: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  total_questions: number;
  answered_questions: number;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface InterviewStats {
  total_interviews: number;
  completed_interviews: number;
  average_score: number | null;
  total_time_spent_minutes: number;
}

export function apiCreateInterview(payload: {
  title: string;
  interview_type?: string;
  difficulty_level?: string;
  job_role?: string;
  company_context?: string;
  seniority?: string;
}): Promise<InterviewResponse> {
  return request("/interviews/", { method: "POST", body: JSON.stringify(payload) });
}

export const apiStartInterview = (id: number) =>
  request<InterviewResponse>(`/interviews/${id}/start`, { method: "POST" });
export const apiCompleteInterview = (id: number) =>
  request<InterviewResponse>(`/interviews/${id}/complete`, { method: "POST" });
export const apiListInterviews = () => request<InterviewResponse[]>("/interviews/");
export const apiGetStats = () => request<InterviewStats>("/interviews/stats/summary");
export const apiGetMe = () => request<UserResponse>("/auth/me");
export const apiGetInterview = (id: number) => request<InterviewResponse>(`/interviews/${id}`);

export interface AnswerResponse {
  id: number;
  question_id: number;
  answer_text: string;
  answer_method: string;
  time_taken_seconds: number | null;
  analyzed: boolean;
  score: number | null;
  feedback: Record<string, unknown> | null;
  sentiment_score: number | null;
  keywords: string[] | null;
  created_at: string;
  analyzed_at: string | null;
}

export interface QuestionResponse {
  id: number;
  interview_id: number;
  question_text: string;
  question_type: string;
  category: string | null;
  difficulty: string;
  order_number: number;
  expected_duration_seconds: number;
  ai_generated: boolean;
  created_at: string;
  asked_at: string | null;
  answer?: AnswerResponse | null;
}

export function apiGenerateQuestion(interviewId: number, language = "pt-BR") {
  return request<QuestionResponse>(`/questions/interviews/${interviewId}/generate-question`, {
    method: "POST",
    body: JSON.stringify({ language }),
  });
}

export function apiSubmitAnswer(payload: {
  question_id: number;
  answer_text: string;
  answer_method?: string;
  time_taken_seconds?: number;
}) {
  return request<AnswerResponse>(`/questions/${payload.question_id}/answer`, {
    method: "POST",
    body: JSON.stringify({
      question_id: payload.question_id,
      answer_text: payload.answer_text,
      answer_method: payload.answer_method ?? "text",
      time_taken_seconds: payload.time_taken_seconds,
    }),
  });
}

export const apiGetInterviewQuestions = (id: number) =>
  request<QuestionResponse[]>(`/questions/interviews/${id}/questions`);

export const apiGetSecurityQuestion = (email: string) =>
  request<{ security_question: string }>("/auth/security-question", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const apiResetPassword = (
  email: string,
  cpf: string,
  security_answer: string,
  new_password: string,
) =>
  request<{ result: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, cpf, security_answer, new_password }),
  });
