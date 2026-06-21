"use client";

import { useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { askAssistant, type AssistantMessage } from "@/app/assistant/actions";

const initialMessages: AssistantMessage[] = [
  {
    role: "assistant",
    content: "Ask about logged issues, modules, status, priorities, business units, screenshots, or trends visible in this app."
  }
];

export function AssistantPanel() {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setQuestion("");

    startTransition(async () => {
      const result = await askAssistant(messages, trimmed);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.ok && result.answer ? result.answer : result.message
        }
      ]);
    });
  }

  return (
    <section className="panel assistant-shell">
      <div className="panel-header">
        <h2 className="panel-title">Issue assistant</h2>
        <span className="topbar-meta">app data only</span>
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
            <div className="assistant-role">{message.role === "user" ? "You" : "Assistant"}</div>
            <div className="assistant-bubble">{message.content}</div>
          </div>
        ))}
        {pending ? (
          <div className="assistant-message assistant">
            <div className="assistant-role">Assistant</div>
            <div className="assistant-bubble muted">Checking app data...</div>
          </div>
        ) : null}
      </div>
      <form className="assistant-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistantQuestion">
          Ask the assistant
        </label>
        <textarea
          id="assistantQuestion"
          name="question"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about open critical issues, module-wise problems, aging, or business-unit patterns"
          rows={2}
          value={question}
        />
        <button className="button primary" disabled={pending || !question.trim()} type="submit">
          <SendHorizontal size={16} />
          Ask
        </button>
      </form>
    </section>
  );
}
