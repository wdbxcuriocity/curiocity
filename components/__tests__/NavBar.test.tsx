import React from 'react';
import { render, screen } from '@testing-library/react';
import NavBar from '@/components/GeneralComponents/NavBar';
import '@testing-library/jest-dom';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image({
    src,
    alt,
    width = 100,
    height = 100,
    ...props
  }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} {...props} />;
  },
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('NavBar', () => {
  it('renders without crashing', () => {
    render(<NavBar />);
    expect(screen.getByText('APEX')).toBeInTheDocument();
  });

  it('renders logo', () => {
    render(<NavBar />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
  });

  it('calls onLogoClick when logo is clicked', () => {
    const onLogoClick = jest.fn();
    render(<NavBar onLogoClick={onLogoClick} />);
    const logoContainer = screen.getByAltText('Logo').parentElement;
    logoContainer?.click();
    expect(onLogoClick).toHaveBeenCalled();
  });
});
