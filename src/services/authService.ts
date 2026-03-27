import { apiClient } from "./apiClient";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  role: "Lawyer" | "Law Student" | "Business/Corporate" | "Normal Person" | "Individual";
  preferredLanguage?: string;
  active_case_id?: string | null;
}

export const authService = {
  signup(payload: {
    name: string;
    email: string;
    phone: string;
    gender?: string;
    dateOfBirth?: string;
    password: string;
    role: ApiUser["role"];
  }) {
    return apiClient.post<{ ok: boolean }>("/auth/signup", payload, { skipAuth: true });
  },
  requestPasswordReset(email: string) {
    return apiClient.post<{ ok: boolean }>("/auth/password/forgot", { email }, { skipAuth: true });
  },
  resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return apiClient.post<{ ok: boolean }>("/auth/password/reset", payload, { skipAuth: true });
  },
  resend(emailOrPhone: string) {
    return apiClient.post<{ ok: boolean }>("/auth/resend", { emailOrPhone }, { skipAuth: true });
  },
  verify(emailOrPhone: string, code: string) {
    return apiClient.post<{ ok: boolean }>("/auth/verify", { emailOrPhone, code }, { skipAuth: true });
  },
  login(emailOrPhone: string, password: string) {
    return apiClient.post<{ token: string; user: ApiUser }>("/auth/login", { emailOrPhone, password }, { skipAuth: true });
  },
  me() {
    return apiClient.get<{ user: ApiUser }>("/auth/me");
  },
  setActiveCase(caseId: string) {
    return apiClient.patch<{ user: ApiUser }>("/auth/me/active-case", { case_id: caseId });
  },
};
