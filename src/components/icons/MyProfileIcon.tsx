interface MyProfileIconProps {
  isActive?: boolean;
  size?: number;
}

export default function MyProfileIcon({ isActive = false, size = 24 }: MyProfileIconProps) {
  const fillColor = isActive ? '#4A7068' : '#D9D9D9';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4" fill={fillColor} />
      <path
        d="M4 19C4 15.6863 6.68629 13 10 13H14C17.3137 13 20 15.6863 20 19H4Z"
        fill={fillColor}
      />
    </svg>
  );
}
