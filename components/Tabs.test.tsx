import { render, screen, fireEvent } from '@testing-library/react';
import Tabs from './Tabs';

describe('Tabs', () => {
  it('should render the tabs component with the first tab active by default', () => {
    render(<Tabs />);
    const mobileTab = screen.getByText('Mobile');
    expect(mobileTab).toHaveClass('animate-opacity bg-base-100 shadow');
  });

  it('should display the content of the active tab', () => {
    render(<Tabs />);
    const mobileContent = screen.getByText('Device:', { exact: false });
    expect(mobileContent).toBeInTheDocument();
    expect(screen.getByText('iPhone 13 Pro')).toBeInTheDocument();
  });

  it('should switch to a different tab when clicked and show the correct content', () => {
    render(<Tabs />);
    const tabletTab = screen.getByText('Tablet');
    fireEvent.click(tabletTab);

    expect(tabletTab).toHaveClass('animate-opacity bg-base-100 shadow');
    const mobileTab = screen.getByText('Mobile');
    expect(mobileTab).not.toHaveClass('animate-opacity bg-base-100 shadow');

    const tabletContent = screen.getByText('iPad Pro (12.9-inch)');
    expect(tabletContent).toBeInTheDocument();
    expect(screen.queryByText('iPhone 13 Pro')).not.toBeInTheDocument();
  });
});
