import { useEffect, useState } from "react";

interface TooltipProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({
  message,
  isVisible,
  onHide,
  position = "top",
}: TooltipProps) {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShown(true);
      const timer = setTimeout(() => {
        setIsShown(false);
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isShown) return null;

  const positionClasses = {
    top: "bottom-full ",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} left-1/2 transform -translate-x-1/2 z-50`}
    >
      <div className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg shadow-lg whitespace-nowrap font-delicious">
        {message}
      </div>
    </div>
  );
}
