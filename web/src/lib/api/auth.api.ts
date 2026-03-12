import { api } from "./client";

export type ForgotPasswordResponse = {
  ok: boolean;
  message: string;
};

export function requestPasswordReset(email: string, redirectTo?: string) {
  return api<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: {
      email,
      redirectTo,
    },
  });
}
