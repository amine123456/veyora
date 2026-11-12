import { readFileSync } from "node:fs";

// Throwaway inbox domains, from github.com/disposable-email-domains/disposable-email-domains.
// Refresh with: npm run update-disposable-domains
const disposable = new Set(
  readFileSync(new URL("./lists/disposable-email-domains.txt", import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith("#")),
);

const GMAIL = new Set(["gmail.com", "googlemail.com"]);

function split(email) {
  const at = email.lastIndexOf("@");
  return [email.slice(0, at), email.slice(at + 1)];
}

// Matches the domain and every parent, so "x.mailinator.com" is caught too.
export function isDisposableEmail(email) {
  const labels = split(email)[1].split(".");
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (disposable.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

// The inbox an address really delivers to. Keep in step with db/migrations/002_email_canonical.sql.
export function canonicalEmail(email) {
  const [local, domain] = split(email);
  const base = local.split("+")[0];
  return GMAIL.has(domain) ? `${base.replaceAll(".", "")}@gmail.com` : `${base}@${domain}`;
}
