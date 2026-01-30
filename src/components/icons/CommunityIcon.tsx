interface CommunityIconProps {
  isActive?: boolean;
  size?: number;
}

export default function CommunityIcon({ isActive = false, size = 24 }: CommunityIconProps) {
  const fillColor = isActive ? '#4A7068' : '#D9D9D9';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" fill="white" />
      <path
        d="M11.3379 3.44531C11.7337 2.85162 12.6061 2.85162 13.002 3.44531L17.1338 9.64258C17.5109 10.2085 17.2203 10.9346 16.6328 11.1387L20.1797 16.6562C20.6074 17.3216 20.1298 18.197 19.3389 18.1973H13.1699V19.1973C13.1699 19.7495 12.7222 20.1973 12.1699 20.1973C11.6177 20.1972 11.17 19.7495 11.1699 19.1973V18.1973H5.00195C4.2109 18.1972 3.73256 17.3217 4.16016 16.6562L7.70703 11.1387C7.11987 10.9344 6.82995 10.2084 7.20703 9.64258L11.3379 3.44531Z"
        fill={fillColor}
      />
    </svg>
  );
}
