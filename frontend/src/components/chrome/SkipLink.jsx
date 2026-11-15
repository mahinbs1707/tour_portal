import { messages } from "../../i18n/messages.js";

export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      {messages.a11y.skipToMain}
    </a>
  );
}
