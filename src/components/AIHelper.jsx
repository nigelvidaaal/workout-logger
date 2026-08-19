import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { sendAIMessage } from "../api/workouts";
import styles from "../styles/AIHelper.module.css";

// Perry's replies come back as plain text but often use **bold** and
// line-by-line tips (see the system prompt in server/routes/ai.js). Without
// this, "**Progressive Overload**" would render as literal asterisks and
// every line would run together into one paragraph, since a plain string
// dropped into JSX ignores \n. This turns that text into real React nodes —
// deliberately NOT dangerouslySetInnerHTML, since the reply is influenced by
// what the user typed, and injecting raw HTML from that would be an XSS risk.
function renderMessageText(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {renderBoldSegments(line)}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

// splits one line on **bold** markers, wrapping matches in <strong> —
// everything else is returned as plain text, which React escapes for us
function renderBoldSegments(line) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

// isOpen/onClose now come from App.jsx instead of local state — the button
// that used to float bottom-right and toggle this itself has moved into the
// top Navbar (the "AI Persisting Perry" icon), so this component and Navbar
// need to share one open/closed value rather than each tracking their own.
export function AIHelper({ isOpen, onClose }) {
  const { token } = useAuth();

  // array of { role, text }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // anchor element at the bottom of the message list — scrolled into view
  // whenever messages/loading change, so new messages (and the "thinking"
  // bubble) are always visible without the user having to scroll manually
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    // dont send empty messages
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };

    // add user's message immediately
    // append to existing array
    setMessages((prev) => [...prev, userMessage]);

    // clear input box and load
    setInput("");
    setLoading(true);

    try {
      // await the backend
      const data = await sendAIMessage(token, userMessage.text);
      const aiMessage = { role: "assistant", text: data.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.log(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Persisting Perry</h3>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.messageList}>
        {messages.length === 0 && (
          <p className={styles.emptyState}>
            Ask Persisting Perry anything about training!
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${
              m.role === "user" ? styles.userBubble : styles.assistantBubble
            }`}
          >
            {renderMessageText(m.text)}
          </div>
        ))}

        {loading && (
          <div className={`${styles.bubble} ${styles.assistantBubble}`}>
            <span className={styles.thinking}>Thinking…</span>
          </div>
        )}

        {/* scroll target — always the last element in the list */}
        <div ref={bottomRef} />
      </div>

      <form
        className={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>,
    document.body,
  );
}
