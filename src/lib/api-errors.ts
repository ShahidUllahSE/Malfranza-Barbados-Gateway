export type ApiFieldError = {
  path: string;
  message: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  password: "Password",
  phone: "Phone",
};

function friendlyFieldMessage(path: string, message: string): string {
  const label = FIELD_LABELS[path] ?? path;
  const lower = message.toLowerCase();

  if (path === "phone" && lower.includes("too small")) {
    return "Enter a valid phone number (at least 6 characters) or leave it blank.";
  }
  if (path === "password" && lower.includes("too small")) {
    return "Password must be at least 8 characters.";
  }
  if (path === "name" && lower.includes("too small")) {
    return "Please enter your full name.";
  }
  if (path === "email" && (lower.includes("invalid") || lower.includes("email"))) {
    return "Please enter a valid email address.";
  }

  return `${label}: ${message}`;
}

export function parseApiErrorPayload(
  payload: unknown,
  status: number,
): ApiError {
  const body = payload as {
    message?: string;
    errors?: ApiFieldError[];
  } | null;

  const fieldErrors: Record<string, string> = {};
  for (const issue of body?.errors ?? []) {
    if (issue.path) {
      fieldErrors[issue.path] = friendlyFieldMessage(issue.path, issue.message);
    }
  }

  const fieldMessages = Object.values(fieldErrors);
  let message = body?.message ?? `Request failed (${status})`;

  if (message === "Validation failed" && fieldMessages.length > 0) {
    message = fieldMessages.join(" ");
  } else if (status === 409 && message.toLowerCase().includes("already exists")) {
    message = "An account with this email already exists. Try signing in instead.";
    fieldErrors.email = message;
  } else if (status === 401) {
    message = "Incorrect email or password. Please try again.";
    fieldErrors.password = message;
  }

  return new ApiError(message, status, fieldErrors);
}

export function validateRegisterForm(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 2) {
    errors.name = "Please enter your full name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (input.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  const phone = input.phone.trim();
  if (phone && phone.length < 6) {
    errors.phone = "Enter a valid phone number (at least 6 characters) or leave it blank.";
  }

  return errors;
}

export function validateLoginForm(input: { email: string; password: string }): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!input.password) {
    errors.password = "Please enter your password.";
  }

  return errors;
}
