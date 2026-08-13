import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { sendAIMessage } from "../api/workouts";
import styles from "../styles/AIHelper.module.css";

export function AIHelper() {
  const { token } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      <button
        type="button"
        className={styles.floatingBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI helper" : "Open AI helper"}
      >
        {isOpen ? (
          "×"
        ) : (
          <img
            src="/ai_logo_trans.png"
            alt="AI helper"
            className={styles.logoImg}
          />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div className={styles.panel}>
            <div className={styles.header}>
              <h3 className={styles.title}>AI Helper</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.messageList}>
              {messages.length === 0 && (
                <p className={styles.emptyState}>
                  Ask me anything about training!
                </p>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.bubble} ${
                    m.role === "user" ? styles.userBubble : styles.assistantBubble
                  }`}
                >
                  {m.text}
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
        )}
    </>
  );
}
