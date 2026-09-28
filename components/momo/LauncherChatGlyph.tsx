export const LAUNCHER_ICON_RATIO = 0.62;

export default function LauncherChatGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="text-white"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.25 5.75h9.5A3.25 3.25 0 0 1 20 9v4.5a3.25 3.25 0 0 1-3.25 3.25h-4.7l-3.8 2.5v-2.5h-1A3.25 3.25 0 0 1 4 13.5V9a3.25 3.25 0 0 1 3.25-3.25Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.25h8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
