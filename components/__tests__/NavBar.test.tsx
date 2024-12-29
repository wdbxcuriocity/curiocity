import { render, screen } from '@testing-library/react';
import NavBar from '@/components/GeneralComponents/NavBar'; // Adjust the path if necessary
import '@testing-library/jest-dom/extend-expect';

// Mock the Image component from 'next/image' since Next.js's Image component might cause issues in Jest
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => {
    return <img {...props} alt={props.alt} />;
  },
}));

describe('NavBar Component', () => {
  test('renders the logo image with the correct alt text', () => {
    render(<NavBar documentId='' />);

    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
  });

  test('renders the APEX brand text', () => {
    render(<NavBar documentId='' />);

    const brandText = screen.getByText(/APEX/i);
    expect(brandText).toBeInTheDocument();
    expect(brandText).toHaveClass('text-4xl', 'font-extrabold', 'italic');
  });

  test('renders the version number text', () => {
    render(<NavBar documentId='' />);

    const versionText = screen.getByText(/v 0.1/i);
    expect(versionText).toBeInTheDocument();
    expect(versionText).toHaveClass('text-sm', 'text-textSecondary');
  });

  test('renders the Avatar icon', () => {
    render(<NavBar documentId='' />);

    const avatarIcon = screen.getByRole('img', { name: /avataricon/i });
    expect(avatarIcon).toBeInTheDocument();
    expect(avatarIcon).toHaveClass('text-fileBlue');
  });

  test('renders the Gear icon', () => {
    render(<NavBar documentId='' />);

    const gearIcon = screen.getByRole('img', { name: /gearicon/i });
    expect(gearIcon).toBeInTheDocument();
    expect(gearIcon).toHaveClass('text-fileBlue');
  });

  test('renders the Trash icon', () => {
    render(<NavBar documentId='' />);

    const trashIcon = screen.getByRole('img', { name: /trashicon/i });
    expect(trashIcon).toBeInTheDocument();
    expect(trashIcon).toHaveClass('text-fileRed');
  });
});
