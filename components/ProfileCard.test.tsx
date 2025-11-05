import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileCard from './ProfileCard';

export type ProfileData = {
  id: string;
  first_name: string;
  photo_url: string | null;
  city: string | null;
  neighborhood: string | null;
  role: string;
  bio_excerpt: string | null;
  last_online_at: string;
};

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  );

  MockLink.displayName = 'Link';

  return MockLink;
});

describe('ProfileCard', () => {
  const mockOnMessage = jest.fn();
  const user = userEvent.setup();

  const baseProfile: ProfileData = {
    id: '123-abc',
    first_name: 'John',
    photo_url: 'https://example.com/photo.jpg',
    city: 'New York',
    neighborhood: 'Brooklyn',
    role: 'dog_owner',
    bio_excerpt: 'Loves dogs and long walks in the park. Looking for a walking buddy.',
    last_online_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockOnMessage.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a complete profile correctly', () => {
    render(<ProfileCard profile={baseProfile} onMessage={mockOnMessage} />);

    // Check header
    expect(screen.getByText('John')).toBeInTheDocument();
    const profileImage = screen.getByAltText('John');
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveAttribute('src', baseProfile.photo_url);

    // Check role
    const roleContainer = screen.getByText('John').nextElementSibling;
    expect(roleContainer).toHaveTextContent('🐕');
    expect(screen.getByText(/dog owner/i)).toBeInTheDocument();

    // Check location
    expect(
      screen.getByText(`📍 ${baseProfile.neighborhood}, ${baseProfile.city}`)
    ).toBeInTheDocument();

    // Check bio
    expect(screen.getByText(baseProfile.bio_excerpt as string)).toBeInTheDocument();

    // Check action buttons
    const viewDetailsLink = screen.getByRole('link', { name: 'View Details' });
    expect(viewDetailsLink).toBeInTheDocument();
    expect(viewDetailsLink).toHaveAttribute('href', `/profile/${baseProfile.id}`);

    expect(screen.getByRole('button', { name: 'Message' })).toBeInTheDocument();
  });

  it('renders a minimal profile without a photo, location, or bio', () => {
    const minimalProfile: ProfileData = {
      id: '456-def',
      first_name: 'Jane',
      role: 'petpal',
      photo_url: null,
      city: null,
      neighborhood: null,
      bio_excerpt: null,
      last_online_at: new Date().toISOString(),
    };
    render(<ProfileCard profile={minimalProfile} onMessage={mockOnMessage} />);

    // Check name
    expect(screen.getByText('Jane')).toBeInTheDocument();

    // Check for fallback icon instead of image
    expect(screen.queryByAltText('Jane')).not.toBeInTheDocument();

    // Check role text
    expect(screen.getByText(/petpal/i)).toBeInTheDocument();

    // Check that optional sections are not rendered
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
    expect(screen.queryByText(baseProfile.bio_excerpt as string)).not.toBeInTheDocument();
  });

  it.each([
    { role: 'dog_owner', icon: '🐕', text: 'Dog owner' },
    { role: 'petpal', icon: '🤝', text: 'Petpal' },
    { role: 'both', icon: '🐕‍🦺', text: 'Both' },
    { role: 'unknown_role', icon: '👤', text: 'Unknown role' },
  ])('displays the correct icon and text for role "$role"', ({ role, icon, text }) => {
    const profileWithRole: ProfileData = { ...baseProfile, role, photo_url: null };
    render(<ProfileCard profile={profileWithRole} onMessage={mockOnMessage} />);

    // Role icon is shown in two places: header fallback and role line item
    expect(screen.getAllByText(icon).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(new RegExp(text.replace(' ', ' '), 'i'))).toBeInTheDocument();
  });

  it('formats location correctly with only a city', () => {
    const profileWithCity: ProfileData = { ...baseProfile, neighborhood: null };
    render(<ProfileCard profile={profileWithCity} onMessage={mockOnMessage} />);
    expect(screen.getByText(`📍 ${baseProfile.city}`)).toBeInTheDocument();
  });

  it('handles image loading error gracefully', () => {
    render(<ProfileCard profile={baseProfile} onMessage={mockOnMessage} />);

    const profileImage = screen.getByAltText('John');
    const fallbackIconContainer = screen.getByTestId('fallback-icon-container');

    // Initially, the image is visible and the fallback has the 'hidden' class
    expect(profileImage).toBeVisible();
    expect(fallbackIconContainer).toHaveClass('hidden');

    // Simulate image loading error
    fireEvent.error(profileImage);

    // Assert that the component's onError logic ran and manipulated the styles
    expect(profileImage).toHaveStyle('display: none');
    expect(fallbackIconContainer).toHaveStyle('display: flex');
  });

  it('calls onMessage with the profile when the message button is clicked', async () => {
    render(<ProfileCard profile={baseProfile} onMessage={mockOnMessage} />);

    const messageButton = screen.getByRole('button', { name: 'Message' });
    await user.click(messageButton);

    expect(mockOnMessage).toHaveBeenCalledTimes(1);
    expect(mockOnMessage).toHaveBeenCalledWith(baseProfile);
  });

  it('does not render location or bio sections if data is empty strings', () => {
    const profileWithEmptyStrings: ProfileData = {
      ...baseProfile,
      city: '',
      neighborhood: '',
      bio_excerpt: '',
    };
    render(<ProfileCard profile={profileWithEmptyStrings} onMessage={mockOnMessage} />);

    // Assert the location section is not present
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
    // Assert the bio content is not present
    expect(screen.queryByText(baseProfile.bio_excerpt as string)).not.toBeInTheDocument();
  });
});
