interface HomeIconProps {
  isActive?: boolean;
  size?: number;
}

export default function HomeIcon({ isActive = false, size = 24 }: HomeIconProps) {
  const fillColor = isActive ? '#4A7068' : '#D9D9D9';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.3184 4.25195C11.697 3.91592 12.2678 3.91594 12.6465 4.25195L20.9658 11.6348H19.9941V19.6631H13.9941V15.6631C13.9941 14.5585 13.0987 13.6631 11.9941 13.6631C10.8896 13.6631 9.99418 14.5585 9.99414 15.6631V19.6631H3.99414V11.6348H3L11.3184 4.25195Z"
        fill={fillColor}
      />
    </svg>
  );
}
