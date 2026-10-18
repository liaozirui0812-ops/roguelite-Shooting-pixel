'use client';

// 静音按钮 - 右上角
// 由 B1.2 从 page.tsx 机械抽取。
interface MuteButtonProps {
  t: (key: string) => string;
  isMuted: boolean;
  toggleMute: () => void;
}

export const MuteButton: React.FC<MuteButtonProps> = ({ t, isMuted, toggleMute }) => {
  return (
    <>
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-500 hover:border-white flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          backdropFilter: 'blur(5px)',
        }}
        title={isMuted ? t('enable_sound') : t('mute')}
      >
        {isMuted ? (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>
    </>
  );
};
