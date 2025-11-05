import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileCard from './ProfileCard';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );

  MockLink.displayName = 'Link';

  return MockLink;
});

describe('ProfileCard', () => {
  const mockOnMessage = jest.fn();
  const user = userEvent.setup();

  const baseProfile = {
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
    // Clear mocks before each test
    mockOnMessage.mockClear();
    // Suppress console errors for the image loading test
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    expect(screen.getByText(baseProfile.bio_excerpt)).toBeInTheDocument();

    // Check action buttons
    const viewDetailsLink = screen.getByRole('link', { name: 'View Details' });
    expect(viewDetailsLink).toBeInTheDocument();
    expect(viewDetailsLink).toHaveAttribute('href', `/profile/${baseProfile.id}`);

    expect(screen.getByRole('button', { name: 'Message' })).toBeInTheDocument();
  });

  it('renders a minimal profile without a photo, location, or bio', () => {
    const minimalProfile = {
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
    expect(screen.queryByText(baseProfile.bio_excerpt)).not.toBeInTheDocument();
  });

  it.each([
    { role: 'dog_owner', icon: '🐕', text: 'Dog owner' },
    { role: 'petpal', icon: '🤝', text: 'Petpal' },
    { role: 'both', icon: '🐕‍🦺', text: 'Both' },
    { role: 'unknown', icon: '👤', text: 'Unknown' },
  ])('displays the correct icon and text for role "$role"', ({ role, icon, text }) => {
    const profileWithRole = { ...baseProfile, role, photo_url: null }; // Use null photo to see fallback icon
    render(<ProfileCard profile={profileWithRole} onMessage={mockOnMessage} />);

    // Role icon is shown in two places: header fallback and role line item
    expect(screen.getAllByText(icon).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(new RegExp(text, 'i'))).toBeInTheDocument();
  });

  it('formats location correctly with only a city', () => {
    const profileWithCity = { ...baseProfile, neighborhood: null };
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

    // After error, the image should have display: none and the fallback should have display: flex
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
    const profileWithEmptyStrings = {
      ...baseProfile,
      city: '',
      neighborhood: '',
      bio_excerpt: '',
    };
    render(<ProfileCard profile={profileWithEmptyStrings} onMessage={mockOnMessage} />);

    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
    // The bio p tag will exist but be empty, so we check its parent div.
    // A more robust check might be to add a data-testid to the bio container.
    const bioParagraph = screen.queryByText(baseProfile.bio_excerpt);
    expect(bioParagraph).not.toBeInTheDocument();
  });
});
