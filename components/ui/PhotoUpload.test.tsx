// PhotoUpload.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhotoUpload from './PhotoUpload';

// --- Mocks ---

// Mock Supabase client
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockRemove = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/libs/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  }),
}));

// Mock OptimizedImage component
jest.mock('./OptimizedImage', () => {
  // eslint-disable-next-line @next/next/no-img-element
  return jest.fn(({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />);
});

// Mock console to avoid clutter
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

// Mock Browser APIs used in compressImage
beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock window.URL.createObjectURL

  globalThis.URL.createObjectURL = jest.fn(() => 'mock-object-url');
  globalThis.URL.revokeObjectURL = jest.fn(); // Mock global.Image

  Object.defineProperty(globalThis, 'Image', {
    writable: true,
    value: class MockImage {
      src: string = '';
      onload: (() => void) | null = null;
      width: number = 800;
      height: number = 600;

      constructor() {
        // Simulate async image load
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    },
  });

  globalThis.HTMLCanvasElement.prototype.getContext = function () {
    return {
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof globalThis.HTMLCanvasElement.prototype.getContext;

  globalThis.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,mocked-data'; // Mock fetch for data URL -> blob conversion

  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      blob: () => Promise.resolve(new Blob(['mock-image-data'], { type: 'image/jpeg' })),
    } as Response)
  );
});

afterAll(() => {
  // Restore console
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
  jest.restoreAllMocks();
});

// --- Test Suite ---

describe('PhotoUpload', () => {
  const mockOnPhotoUploaded = jest.fn(); // Reset mocks before each test

  beforeEach(() => {
    jest.clearAllMocks(); // Default successful mock implementations

    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    mockUpload.mockResolvedValue({ error: null, data: { path: 'test-user-id/12345.jpg' } });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://supabase.mock/public/test-bucket/test-user-id/12345.jpg',
      },
    });
    mockRemove.mockResolvedValue({ error: null });
  });

  it('renders placeholder when no initial URL is provided', () => {
    render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        initialPhotoUrl={''}
        bucketName="test-bucket"
      />
    );

    expect(screen.getByText('No photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument();
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });

  it('renders initial photo and change/remove buttons when URL is provided', () => {
    const initialUrl = 'https://example.com/initial.jpg';
    render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        initialPhotoUrl={initialUrl}
        bucketName="test-bucket"
      />
    );

    const img = screen.getByAltText('Profile');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', initialUrl);
    expect(screen.getByRole('button', { name: 'Change Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove profile photo' })).toBeInTheDocument(); // Remove button
  });

  it('hides upload/remove buttons when disabled', () => {
    const initialUrl = 'https://example.com/initial.jpg';
    render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        initialPhotoUrl={initialUrl}
        disabled={true}
        bucketName="test-bucket"
      />
    ); // Image is still visible

    expect(screen.getByAltText('Profile')).toBeInTheDocument(); // Buttons are hidden

    expect(screen.queryByRole('button', { name: 'Change Photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove profile photo' })).not.toBeInTheDocument();
  });

  it('handles successful photo upload', async () => {
    const { container } = render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        bucketName="test-bucket"
        initialPhotoUrl={''}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const mockFile = new File(['mock-image-data'], 'test.png', { type: 'image/png' }); // Simulate file selection

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [mockFile] } });
    }); // Check uploading state

    expect(screen.getByRole('button', { name: 'Uploading...' })).toBeDisabled(); // Wait for all async operations to complete

    expect(await screen.findByRole('button', { name: 'Change Photo' })).toBeInTheDocument(); // Verify mocks were called

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockGetPublicUrl).toHaveBeenCalledTimes(1); // Verify callback

    const newUrl = 'https://supabase.mock/public/test-bucket/test-user-id/12345.jpg';
    expect(mockOnPhotoUploaded).toHaveBeenCalledWith(newUrl); // Verify UI update

    const img = screen.getByAltText('Profile');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', newUrl);
  });

  it('handles photo removal', async () => {
    const initialUrl = 'https://supabase.mock/public/test-bucket/test-user-id/12345.jpg';
    render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        initialPhotoUrl={initialUrl}
        bucketName="test-bucket"
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove profile photo' });

    await act(async () => {
      fireEvent.click(removeButton);
    }); // Verify Supabase remove was called with correct path

    expect(mockRemove).toHaveBeenCalledWith(['test-user-id/12345.jpg']); // Verify callback

    expect(mockOnPhotoUploaded).toHaveBeenCalledWith(''); // Verify UI update

    expect(screen.getByText('No photo')).toBeInTheDocument();
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument();
  });

  it('handles removal of non-supabase photo', async () => {
    const initialUrl = 'https://example.com/not-supabase.jpg';
    render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        initialPhotoUrl={initialUrl}
        bucketName="test-bucket"
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove profile photo' });

    await act(async () => {
      fireEvent.click(removeButton);
    }); // Should NOT call Supabase remove

    expect(mockRemove).not.toHaveBeenCalled(); // Should still clear state and call callback

    expect(mockOnPhotoUploaded).toHaveBeenCalledWith('');
    expect(screen.getByText('No photo')).toBeInTheDocument();
  });

  it('shows error for non-image file', async () => {
    const { container } = render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        bucketName="test-bucket"
        initialPhotoUrl={''}
      />
    );
    const fileInput = container.querySelector('input[type="file"]');
    const textFile = new File(['not an image'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [textFile] } });
    });

    expect(await screen.findByText('Please select a valid image file')).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockOnPhotoUploaded).not.toHaveBeenCalled();
  });

  it('shows error for file size too large', async () => {
    const { container } = render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        bucketName="test-bucket"
        initialPhotoUrl={''}
      />
    );
    const fileInput = container.querySelector('input[type="file"]'); // Create a file larger than 10MB

    const largeFile = new File(['a'.repeat(10 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [largeFile] } });
    });

    expect(
      await screen.findByText('File size too large. Max allowed is 10MB before compression.')
    ).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockOnPhotoUploaded).not.toHaveBeenCalled();
  });

  it('shows error on Supabase upload failure', async () => {
    // Simulate upload error
    mockUpload.mockResolvedValue({ error: new Error('Upload permission denied'), data: null });

    const { container } = render(
      <PhotoUpload
        id="test-id"
        onPhotoUploaded={mockOnPhotoUploaded}
        bucketName="test-bucket"
        initialPhotoUrl={''}
      />
    );
    const fileInput = container.querySelector('input[type="file"]');
    const mockFile = new File(['mock-image-data'], 'test.png', { type: 'image/png' });

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [mockFile] } });
    });

    expect(await screen.findByText('Upload failed: Upload permission denied')).toBeInTheDocument(); // Button should reset

    expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument();
    expect(mockOnPhotoUploaded).not.toHaveBeenCalled();
  });
});
