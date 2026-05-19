"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATUS_FADE_DURATION = 400;
const STATUS_DISPLAY_DURATION = 3000;
const STATUS_VISIBLE_TOTAL = STATUS_FADE_DURATION + STATUS_DISPLAY_DURATION;

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const hasMessage = useMemo(() => email.trim().length > 0, [email]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const banClickRef = useRef(false);
  const isDisabled = useMemo(() => formState.status === "submitting", [formState.status]);
  const placeholderText = "Enter email here";

  const isValidEmail = useCallback((value: string) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
  }, []);

  const clearStatusMessage = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setIsStatusVisible(false);
    setStatusMessage(null);
  }, []);

  const showStatusMessage = useCallback(
    (text: string) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }

      const startShow = () => {
        setStatusMessage(text);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsStatusVisible(true);
          });
        });

        hideTimerRef.current = setTimeout(() => {
          setIsStatusVisible(false);
          clearTimerRef.current = setTimeout(() => {
            setStatusMessage(null);
          }, STATUS_FADE_DURATION);
        }, STATUS_VISIBLE_TOTAL);
      };

      if (statusMessage) {
        setIsStatusVisible(false);
        clearTimerRef.current = setTimeout(() => {
          startShow();
        }, STATUS_FADE_DURATION);
      } else {
        startShow();
      }
    },
    [statusMessage]
  );

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setEmail("");
      const invalidEmailMessage = "Please enter a valid email address";
      setFormState({ status: "error", message: invalidEmailMessage });
      showStatusMessage(invalidEmailMessage);
      return;
    }

    if (banClickRef.current) {
      return;
    }
    banClickRef.current = true;
    setTimeout(() => {
      banClickRef.current = false;
    }, 50);

    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: trimmedEmail })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Failed to send feedback.");
      }

      setEmail("");
      setFormState({ status: "success" });
      showStatusMessage("See you soon!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setFormState({ status: "error", message: errorMessage });
      showStatusMessage(errorMessage);
    }
  }

  return (
    <form className="landing-feedback-form" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isDisabled} aria-busy={isDisabled}>
        <div className="landing-feedback-input">
          <input
            id="feedback-message"
            name="message"
            type="email"
            value={email}
            onChange={(event) => {
              if (statusMessage) {
                clearStatusMessage();
              }
              setEmail(event.target.value);
            }}
            placeholder={statusMessage ? "" : placeholderText}
            aria-describedby={statusMessage ? "feedback-status" : undefined}
          />
          {statusMessage ? (
            <span
              id="feedback-status"
              role="status"
              aria-live="polite"
              className={`landing-feedback-status ${isStatusVisible ? "is-visible" : ""}`}
            >
              {statusMessage}
            </span>
          ) : null}
        </div>

        <button
          id="composer-submit-button"
          aria-label="Send prompt"
          data-testid="send-button"
          className={`landing-feedback-submit ${
            hasMessage ? "is-active" : "is-inactive"
          }`}
          type="submit"
          disabled={isDisabled}
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 20 20"
            fill="#ffffff"
            xmlns="http://www.w3.org/2000/svg"
            className="icon"
          >
            <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
          </svg>
        </button>
      </fieldset>
    </form>
  );
}
