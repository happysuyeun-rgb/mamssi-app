interface CalendarIconProps {
  isActive?: boolean;
  size?: number;
}

export default function CalendarIcon({ isActive = false, size = 24 }: CalendarIconProps) {
  const fillColor = isActive ? '#4A7068' : '#D9D9D9';
  const penFillColor = isActive ? '#D8D9D9' : '#D9D9D9';

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
        d="M7.5 4C7.77614 4 8 4.22386 8 4.5V5H14V4.5C14 4.22386 14.2239 4 14.5 4C14.7761 4 15 4.22386 15 4.5V5H16.4443C17.3038 5 18 5.69622 18 6.55566V17.4443C18 18.3038 17.3038 19 16.4443 19H5.55566C4.69622 19 4 18.3038 4 17.4443V6.55566C4 5.69622 4.69622 5 5.55566 5H7V4.5C7 4.22386 7.22386 4 7.5 4Z"
        fill={fillColor}
      />
      <rect x="4.9375" y="10" width="12" height="8" fill="white" />
      <path
        d="M12.3922 15.9353L10.5913 16.0158L11.2096 14.3224L17.6609 9.59168C18.1063 9.26509 18.7321 9.36139 19.0587 9.80676C19.3853 10.2521 19.289 10.8779 18.8436 11.2045L12.3922 15.9353Z"
        fill={penFillColor}
      />
      <rect
        x="17.231"
        y="12.3867"
        width="2"
        height="1"
        transform="rotate(-126.252 17.231 12.3867)"
        fill="white"
      />
    </svg>
  );
}
