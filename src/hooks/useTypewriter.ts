import { useState, useEffect } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
}

export const useTypewriter = ({
  text,
  speed = 100,
  delay = 0,
}: UseTypewriterOptions) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  // CRITICAL: Track if component has mounted on client-side
  // This prevents hydration mismatches by ensuring animation only starts after hydration
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after client-side hydration completes
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset state when text changes (but only if mounted)
    if (mounted) {
      setDisplayText("");
      setCurrentIndex(0);
      setIsComplete(false);
    }
  }, [text, mounted]);

  useEffect(() => {
    // CRITICAL: Don't start animation until after client-side mount
    // This ensures server and client both render empty string initially
    // Preventing React Error #418 (hydration mismatch)
    if (!mounted) return;

    // Initial delay before starting to type
    if (currentIndex === 0 && delay > 0) {
      const delayTimeout = setTimeout(() => {
        setCurrentIndex(1);
      }, delay);
      return () => clearTimeout(delayTimeout);
    }

    // Type characters one by one
    if (currentIndex > 0 && currentIndex <= text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }

    // Mark as complete when done
    if (currentIndex > text.length && !isComplete) {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed, delay, isComplete, mounted]);

  return { displayText, isComplete };
};
