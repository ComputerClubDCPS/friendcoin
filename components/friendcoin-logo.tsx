interface FriendCoinLogoProps {
  size?: number
  showStars?: boolean
  className?: string
}

export function FriendCoinLogo({ size = 32, showStars = false, className = "" }: FriendCoinLogoProps) {
  if (showStars) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size + 40, height: size + 40 }}
      >
        <svg width={size + 40} height={size + 40} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Decorative stars around the logo */}
          <g fill="currentColor" opacity="0.4">
            {/* Top stars */}
            <g transform="translate(40, 8)">
              <path d="M0 0L1 3L4 2L2 5L5 6L2 7L4 10L1 9L0 12L-1 9L-4 10L-2 7L-5 6L-2 5L-4 2L-1 3L0 0Z" />
            </g>
            <g transform="translate(20, 16)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>
            <g transform="translate(60, 16)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>

            {/* Side stars */}
            <g transform="translate(8, 40)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>
            <g transform="translate(72, 40)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>

            {/* Bottom stars */}
            <g transform="translate(20, 64)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>
            <g transform="translate(60, 64)">
              <path d="M0 0L0.8 2.4L3.2 1.6L1.6 4L4 4.8L1.6 5.6L3.2 8L0.8 7.2L0 9.6L-0.8 7.2L-3.2 8L-1.6 5.6L-4 4.8L-1.6 4L-3.2 1.6L-0.8 2.4L0 0Z" />
            </g>
          </g>

          {/* Main logo circle background with gradient */}
          <defs>
            <radialGradient id="logoGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </radialGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r="20"
            fill="url(#logoGradient)"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeOpacity="0.2"
          />

          {/* Main f€ logo - perfectly centered */}
          <g transform="translate(40, 40)">
            {/* Stylized f - centered at origin */}
            <path
              d="M-8 -8L-8 8M-8 -8L2 -8M-8 -1L-1 -1"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Euro symbol € - centered at origin */}
            <path
              d="M4 -6C0.5 -6 -2 -3.5 -2 0C-2 3.5 0.5 6 4 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="-5" y1="-2" x2="1" y2="-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="-5" y1="2" x2="1" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background circle with gradient */}
        <defs>
          <radialGradient id="simpleGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="url(#simpleGradient)"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.2"
        />

        {/* Main f€ logo - perfectly centered */}
        <g transform="translate(20, 20)">
          {/* Stylized f - centered at origin */}
          <path
            d="M-6 -6L-6 6M-6 -6L2 -6M-6 -1L-1 -1"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Euro symbol € - centered at origin */}
          <path
            d="M4 -4C1 -4 -1 -2 -1 0C-1 2 1 4 4 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <line x1="-3" y1="-1.5" x2="1" y2="-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="-3" y1="1.5" x2="1" y2="1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}
