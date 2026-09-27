type MomoIconProps = {
  size?: number;
};

export default function MomoIcon({ size = 28 }: MomoIconProps) {
  return (
    <div
      aria-hidden="true"
      className="momo-avatar grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.max(14, size * 0.5)}
        height={Math.max(14, size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <path
          d="M7.25 5.75h9.5A3.25 3.25 0 0 1 20 9v4.5a3.25 3.25 0 0 1-3.25 3.25h-4.7l-3.8 2.5v-2.5h-1A3.25 3.25 0 0 1 4 13.5V9a3.25 3.25 0 0 1 3.25-3.25Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 11.25h8"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
