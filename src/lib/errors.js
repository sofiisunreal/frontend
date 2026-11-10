// Presentation only. Raw API details stay on the original error for contract
// checks (for example legal-version conflicts); they are never rendered here.
export const FIELD_LABELS = Object.freeze({
  username: "Username", email: "Email address", first_name: "First name", last_name: "Last name",
  password: "Password", password_confirm: "Confirm password", old_password: "Current password",
  new_password: "New password", confirm_password: "Confirm new password", age_eligibility: "Age confirmation",
  accept_terms: "Terms agreement", accept_privacy_policy: "Privacy acknowledgement",
  name: "Name", description: "Description", title: "Title", note: "Note", account: "Account",
  account_type: "Account type", currency: "Currency", balance: "Starting balance", starting_balance: "Starting balance",
  amount: "Amount", from_amount: "Amount to send", to_amount: "Amount received", from_account: "From account",
  to_account: "To account", exchange_rate: "Exchange rate", rate_source: "Rate source", category: "Category",
  category_type: "Category type", transaction_type: "Transaction type", transaction_date: "Transaction date",
  date: "Date", month: "Month", period_type: "Budget period", start_date: "Start date", end_date: "End date",
  rollover: "Rollover", loan: "Loan", loan_type: "Loan type", person_name: "Person's name",
  original_amount: "Principal amount", repayment_date: "Repayment date", interest_method: "Interest agreement",
  interest_type: "Interest type", interest_frequency: "Interest frequency", annual_interest_rate: "Annual interest rate",
  periodic_interest_rate: "Interest rate", fixed_interest_amount: "Fixed interest amount",
  fixed_charge_behavior: "Fixed charge behavior", loan_date: "Loan date", due_date: "Due date",
  goal: "Savings goal", target_amount: "Target amount", target_date: "Target date", saving_method: "Saving method",
  contribution_date: "Contribution date", withdrawal_date: "Withdrawal date", frequency: "Frequency", status: "Status",
});

const FALLBACKS = {
  default: "We couldn't complete that request. Please try again.",
  load: "We couldn't load this information. Please try again.",
  dashboard: "We couldn't load your overview. Please try again.",
  spending: "We couldn't load spending by category. Please try again.",
  save: "We couldn't save your changes. Please try again.",
  record: "We couldn't save this record. Please try again.",
  remove: "We couldn't remove this record. Please try again.",
  archive: "We couldn't archive this account. Please try again.",
  savings: "We couldn't update this savings plan or goal. Please try again.",
  login: "We couldn't sign you in. Please try again.",
  register: "We couldn't create your account. Please review your details and try again.",
  session: "We couldn't confirm your sign-in right now. Please try again.",
  forgot: "We couldn't request reset instructions. Please try again shortly.",
  reset: "We couldn't reset your password. Please try again.",
  profile: "We couldn't save your profile. Please try again.",
  password: "We couldn't change your password. Please try again.",
  deleteAccount: "We couldn't delete your account. Please try again or use Help to contact Budgetly.",
  export: "We couldn't prepare your data export. No file was downloaded. Please try again.",
  feedback: "We couldn't send your feedback. Please try again.",
  feedbackLoad: "We couldn't load your previous feedback. Please try again.",
  exchange: "We couldn't check the exchange rate. Please try again shortly.",
  legal: "We couldn't load or verify the official documents. Please reload them before continuing.",
  legalAccept: "We couldn't confirm your agreement. Review the current documents and try again.",
  checkout: "We couldn't open checkout. Please check your access before trying again.",
  paymentVerify: "We couldn't confirm your payment status. Check again before starting another payment.",
  googleLogin: "We couldn't confirm your Google sign-in. Please try again or use your password.",
  googleRegister: "We couldn't confirm account creation with Google. Try Google again to check your account, or use your password.",
  googleLink: "We couldn't confirm the Google connection. Try again to check it, or keep using your password.",
};

// Reviewed validation copy used by the existing Django serializers/services.
// Unknown backend prose is not trusted simply because it looks like a sentence.
const VALIDATION_COPY = new Set([
  "This password is too common.", "This password is entirely numeric.",
  "This password is too similar to your other personal information.",
  "The password is too similar to the username.", "The password is too similar to the email address.",
  "The password is too similar to the first name.", "The password is too similar to the last name.",
  "You must confirm that you are 18 years of age or older.",
  "You must accept the Terms of Service.", "You must accept the Privacy Policy.",
  "Current password is incorrect.", "Passwords do not match.", "New passwords do not match.",
  "Use a three-letter currency code, such as KES or USD.", "Use a three-letter currency code.",
  "Currency must be a valid 3-letter currency code.", "Target amount must be greater than zero.",
  "Contribution amount must be greater than zero.", "Withdrawal amount must be greater than zero.",
  "Plan amount must be greater than zero.", "Amount must be greater than zero.",
  "Unable to retrieve the live exchange rate.", "Exchange rate is required for custom rates.",
  "An account is required.", "This account is not available to you.", "This category is not available to you.",
  "This loan is not available to you.", "The category type must match the transaction type.",
  "The destination account must be different.", "Both accounts must belong to you.",
  "Exchange rate must be greater than zero.", "Same-currency transfers must use an exchange rate of 1.",
  "Repayment account currency must match the loan currency.", "Repayment date cannot be before the loan date.",
  "Repayment date cannot be in the future.", "Loan currency must match the account currency.",
  "Original amount cannot be less than recorded repayments.",
  "Financial loan terms cannot be changed after the first repayment.",
  "Interest cannot be enabled retroactively for an existing loan.",
  "No-interest loans cannot include interest values.",
  "Annual percentage requires only a positive annual interest rate.",
  "This method requires only a positive periodic interest rate.",
  "This method requires a positive fixed amount and valid charge behavior.",
  "Fixed total requires one positive fixed interest amount.",
  "Repayment cannot exceed the outstanding loan obligation.",
  "Budgets can only be set for expense categories.", "End date must be on or after start date.",
  "End date cannot be earlier than the start date.", "Weekly budgets must span seven days.",
  "Monthly budgets must cover a calendar month.", "Default categories cannot be modified.",
  "Default categories cannot be deleted.", "You can only use your own account for a savings goal.",
  "You can only contribute to your own savings goals.", "You can only withdraw from your own savings goals.",
  "You can only create a savings plan for your own savings goal.",
]);

function validationCopy(value, field, context) {
  if (typeof value !== "string" || value.length > 400) return null;
  const text = value.trim();
  if (/^(This field is required\.|This field may not be (?:blank|null)\.|This field cannot be (?:blank|null)\.)$/.test(text)) return "This is required.";
  if (/^Enter a valid email address\.$/.test(text)) return "Enter a valid email address.";
  if (/^Enter a valid username[\s\S]*$/.test(text)) return "Use a username containing only letters, numbers and @ . + - _ characters.";
  if (/^A user with that username already exists\.$/i.test(text)) return context === "register" ? "This username isn't available. Choose another." : "Choose another username.";
  if (/^(?:This email is already registered\.|A user with this email already exists\.|user with this email already exists\.|This field must be unique\.)$/i.test(text)) return field === "email" ? "This email address can't be used. Try signing in or resetting your password." : "This value is already in use. Choose another.";
  if (/^(?:Passwords|New passwords) do not match\.$/.test(text)) return "Your passwords don't match.";
  if (text === "Current password is incorrect.") return ["password", "deleteAccount"].includes(context) ? "Your current password is incorrect." : null;
  if (/^(?:Invalid pk .+ - object does not exist\.|Invalid choice\.|.+ is not a valid choice\.)$/.test(text)) return "Choose an available option.";
  if (/^(?:A valid (?:number|integer) is required\.|Enter a (?:valid number|number)\.)$/.test(text)) return "Enter a valid number.";
  if (/^Date has wrong format\./.test(text)) return "Enter a valid date.";
  if (text === "Use YYYY-MM.") return "Choose a valid month.";
  if (/^Ensure (?:this field has (?:at least|no more than) \d+ characters\.|this value is (?:greater than or equal to|less than or equal to) -?\d+(?:\.\d+)?\.|that there are no more than \d+ (?:digits in total|decimal places|digits before the decimal point)\.)$/.test(text)) return text;
  if (/^This password is too short\. It must contain at least \d+ characters\.$/.test(text)) return text;
  if (/^Withdrawal cannot exceed the current saved amount of -?\d+(?:\.\d+)?\.$/.test(text)) return text;
  if (/^You cannot (?:contribute to|withdraw from|create a plan for) a (?:paused|closed|cancelled|target_reached) savings goal\.$/.test(text)) return text.replace("target_reached", "completed");
  if (/^Only (?:active|paused) (?:goals|plans) can be (?:paused|resumed|completed)\.$/.test(text)) return text;
  if (/^(?:This savings (?:goal|plan) is already (?:closed|cancelled|completed)\.|A (?:closed|cancelled|completed) savings (?:goal|plan) cannot be (?:closed|cancelled|paused|resumed|completed)\.)$/.test(text)) return text;
  if (/^Historical transfer financial fields cannot be changed: (?:from account|to account|from amount|exchange rate|rate source)(?:, (?:from account|to account|from amount|exchange rate|rate source))*\.$/.test(text)) return text;
  if (VALIDATION_COPY.has(text)) return text;
  return null;
}

function collect(value, path = [], out = [], seen = new WeakSet(), depth = 0) {
  if (depth > 7 || out.length >= 40) return out;
  if (typeof value === "string") { out.push({ path, value });return out; }
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) value.slice(0, 20).forEach((child, index) => collect(child, typeof child === "object" && child !== null ? [...path, String(index)] : path, out, seen, depth + 1));
  else Object.entries(value).slice(0, 40).forEach(([key, child]) => { if (!["__proto__", "constructor", "prototype", "code", "status", "status_code"].includes(key)) collect(child, [...path, key], out, seen, depth + 1); });
  return out;
}

/** Returns safe UI copy only. Original errors/payloads are intentionally absent. */
export function normalizeError(error, { context = "default", fields, aliases = {} } = {}) {
  const statusValue = error?.response?.status ?? error?.status;
  const status = Number.isInteger(statusValue) ? statusValue : null;
  const data = error?.response?.data ?? error?.details ?? (error && !(error instanceof Error) ? error : null);
  const fallback = FALLBACKS[context] || FALLBACKS.default;
  const result = (kind, message, extra = {}) => ({ kind, message, fieldErrors: {}, formErrors: [], issues: [], retryable: false, cancelled: false, ...extra });
  const payment = context === "paymentVerify";
  const transport = error?.transport;
  if (transport === "timeout" || [408, 504].includes(status) || error?.name === "TimeoutError" || ["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) return result("timeout", payment ? "The payment check took too long. Your payment status is still unknown. Check again before starting another payment." : context === "checkout" ? "Checkout took too long to respond. A payment attempt may already exist. Check your access before trying again." : "That request took too long. Please try again shortly.", { retryable: true });
  if (transport === "cancelled" || error?.name === "AbortError" || error?.code === "ERR_CANCELED") return result("cancelled", payment ? "The payment check was interrupted. Your payment status is still unknown. Check again before starting another payment." : context === "checkout" ? "Checkout was interrupted. A payment attempt may already exist. Check your access before trying again." : "The request was interrupted. You can try again.", { cancelled: true, retryable: true });
  if (status === 0 || error?.code === "ERR_NETWORK" || (error?.isAxiosError && !error.response)) return result("network", payment ? "We couldn't check your payment status. It may still be processing. Check again before starting another payment." : context === "checkout" ? "We couldn't confirm checkout started. A payment attempt may already exist. Check your access before trying again." : "We couldn't connect to Budgetly. Check your connection and try again.", { retryable: true });
  if (["googleLogin", "googleRegister", "googleLink"].includes(context)) {
    const code = data?.code || error?.code;
    const messages = {
      google_not_configured: "Google sign-in isn't available right now. You can continue with your username and password.",
      google_auth_unavailable: "Google sign-in is temporarily unavailable. Try again later or use your password.",
      google_sdk_unavailable: "Google sign-in couldn't load. Check your connection or browser settings, then try again. You can also use your password.",
      invalid_google_credential: "Google sign-in couldn't be verified. Try again to get a fresh sign-in, or use your password.",
      google_response_invalid: "We couldn't confirm your Budgetly session from Google. Please try again or use your password.",
      inactive_user: "We couldn't complete Google sign-in for this account. Use your password or account recovery to continue.",
      identity_in_use: "This Google account is connected to a different Budgetly account. Choose another Google account or sign in to the connected account.",
      user_already_linked: "This Budgetly account already has a Google account connected. Use that Google account or keep signing in with your password.",
      link_required: "Sign in with your Budgetly username and password first. You can then connect Google in Settings.",
      legal_acceptance_required: "Review the current Terms and Privacy Policy and confirm that you're 18 or older before creating an account with Google.",
      google_popup_closed: "Google sign-in was canceled. You can try again or continue with your password.",
      google_popup_blocked: "The Google window couldn't open. Allow it in your browser or continue with your password.",
    };
    if (Object.hasOwn(messages, code)) return result("google", messages[code], { action: code === "link_required" ? "password-link" : code === "legal_acceptance_required" ? "register" : null });
    if (status === 404) return result("google", "Google sign-in isn't available on Budgetly right now. Try again later or use your password.");
    if (context !== "googleLink" && status === 401) return result("google", "Google sign-in couldn't be verified. Try again or use your password.");
  }
  if (status === 401 && error?.sessionUnresolved) return result("session-unresolved", "We couldn’t confirm your sign-in right now. Your saved sign-in has been kept. Please try again.", { retryable: true });
  if (status === 401) return result("authentication", context === "login" ? "The username or password you entered is incorrect." : "Your session has expired. Please sign in again.");
  if (status === 403 && data?.code === "payment_required") return result("payment-required", "Lifetime access is required for financial features. Check your access or unlock Budgetly to continue.", { action: "payment" });
  if (status === 403 && context === "login") return result("authentication", "We couldn't sign you in with those details. Check your username and password, or use password reset.");
  if (status === 429) return result("rate-limit", payment ? "Payment checks are temporarily limited. Wait a moment, then check again before making another payment." : "You've made several requests in a short time. Wait a moment, then try again.", { retryable: true });
  if (status >= 500) {
    const message = payment ? "Payment confirmation is temporarily unavailable. Your payment status is still unknown. Check again before starting another payment."
      : context === "checkout" ? "Checkout is temporarily unavailable. A payment attempt may already exist. Check your access before trying again later."
      : ["default", "load", "dashboard", "spending"].includes(context) ? "Budgetly is temporarily unavailable. Please try again shortly." : fallback;
    return result("service", message, { retryable: true });
  }
  if (status === 403) return result("permission", data?.detail === "Default categories cannot be modified." || data?.detail === "Default categories cannot be deleted." ? "Default categories can't be changed or deleted. Create a personal category instead." : "You don't have permission to do that. Choose a record available to your account.");
  if (status === 404) return result("not-found", payment ? "We couldn't find this purchase for your account. Check the return link and sign in with the account used at checkout." : context === "reset" ? "This reset link is invalid or has expired. Request a new link to continue." : context === "forgot" ? fallback : context.startsWith("legal") ? "The official documents aren't available right now. Please try again later." : "This record is no longer available to your account. Refresh the page and try again.");
  if ([400, 409].includes(status) && context.startsWith("legal") && ["terms_document", "privacy_document", "legal_documents"].some(key => data?.[key])) return result("legal-stale", "The documents changed or are unavailable. Reload and review the current versions before agreeing again.");
  if (context === "deleteAccount" && status === 409) return result("conflict", "Some linked records are preventing account deletion. Use Help to contact Budgetly about your request.");
  if (context === "checkout" && status === 409) return result("conflict", "A payment or access update may already be in progress. Check your existing payment or wait before starting another checkout.");
  if (payment) return result("payment-unconfirmed", fallback, { retryable: true });
  if (context === "reset" && collect(data).some(({ value }) => /^Invalid (?:or expired )?password reset link\.$/.test(value))) return result("reset-link", "This reset link is invalid or has expired. Request a new link to continue.");
  // Do not distinguish disabled/deleted/nonexistent accounts in public auth copy.
  if (["login", "forgot"].includes(context) && collect(data).some(({ value }) => /account|credentials|user.*(?:exist|found|inactive)|email.*(?:registered|found)/i.test(value))) return result("authentication", context === "login" ? "The username or password you entered is incorrect." : fallback);

  const available = fields ? Object.fromEntries(Array.isArray(fields) ? fields.map(field => [field.name, field.label]) : Object.entries(fields)) : null;
  const labels = { ...FIELD_LABELS, ...available };
  const fieldErrors = {}, formErrors = [], issues = [];
  for (const { path, value } of collect(data)) {
    const keys = path.filter(key => !["detail", "error", "message", "non_field_errors"].includes(key));
    const leaf = keys.filter(key => !/^\d+$/.test(key)).at(-1);
    const fullKey = keys.join(".");
    const alias = Object.hasOwn(aliases, fullKey) ? aliases[fullKey] : Object.hasOwn(aliases, leaf) ? aliases[leaf] : null;
    const key = typeof alias === "string" ? alias : available && Object.hasOwn(available, leaf) ? leaf : fullKey;
    let message = validationCopy(value, leaf, context);
    if (!message && (Object.hasOwn(labels, leaf) || Object.hasOwn(available || {}, key))) message = "Check this value and try again.";
    if (!message) continue;
    const candidate = Object.hasOwn(labels, key) ? labels[key] : Object.hasOwn(labels, leaf) ? labels[leaf] : null;
    const label = typeof candidate === "string" ? candidate : null;
    if (key && label && (!available || Object.hasOwn(available, key))) {
      if (!Object.hasOwn(fieldErrors, key)) fieldErrors[key] = message;
      else if (!fieldErrors[key].includes(message)) fieldErrors[key] += ` ${message}`;
      issues.push({ field: key, label, message });
    } else {
      const line = label ? `${label}: ${message}` : message;
      if (!formErrors.includes(line)) formErrors.push(line);
    }
  }
  if (issues.length || formErrors.length) return result("validation", issues.length ? "Please check the highlighted details." : formErrors.join(" "), { fieldErrors, formErrors, issues });
  return result(status === 409 ? "conflict" : "unexpected", fallback, { retryable: status == null || status >= 500 });
}

/** Compatibility for non-form errors: labels, never raw API keys or JSON. */
export function friendlyErrorMessage(error, options) {
  const result = normalizeError(error, options);
  return [...result.issues.map(issue => `${issue.label}: ${issue.message}`), ...result.formErrors].join(" ") || result.message;
}

/** Focus only after a failed submission, never for a background load. */
export function focusFormError(form) {
  if (!form) return;
  const focus = (attempt = 0) => requestAnimationFrame(() => {
    if (!form.isConnected) return;
    const target = form.querySelector('[aria-invalid="true"]:not(:disabled)') || form.querySelector('[data-error-notice]');
    if (target) {
      target.focus({ preventScroll: true });
      // Reveal the label and its explanation together, including inside a
      // scrolling mobile dialog. Focusing only the input can clip its error.
      (target.closest(".field, .check-field-wrap") || target).scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
    // React may still be committing the error and re-enabling the fieldset.
    // Retry only the next two frames; never keep stealing focus in a loop.
    else if (attempt < 2) focus(attempt + 1);
  });
  focus();
}

export function nativeValidationMessage(control) {
  if (control.validity.valueMissing) return control.tagName === "SELECT" ? "Choose an option." : "This is required.";
  if (control.validity.typeMismatch) return control.type === "email" ? "Enter a valid email address." : "Check the format of this value.";
  if (control.validity.tooShort) return `Use at least ${control.minLength} characters.`;
  if (control.validity.tooLong) return `Use no more than ${control.maxLength} characters.`;
  if (control.validity.rangeUnderflow) return `Enter ${control.min} or more.`;
  if (control.validity.rangeOverflow) return `Enter ${control.max} or less.`;
  if (control.validity.stepMismatch) return `Use increments of ${control.step}.`;
  return "Check this value and try again.";
}

/** Development diagnostics deliberately omit URL, payload, text, tokens and PII. */
export function errorDiagnostic(error, method = "GET") {
  const result = normalizeError(error);
  const status = Number.isInteger(error?.status) && (error.status === 0 || error.status >= 100 && error.status <= 599) ? error.status : null;
  return { event: "budgetly.request_failed", method: ["GET", "POST", "PATCH", "DELETE", "PUT"].includes(method) ? method : "OTHER", status, kind: result.kind };
}
