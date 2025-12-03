
import React, { useState, useEffect } from 'react';
import { AddressAutofill } from '@mapbox/search-js-react';

interface AddressAutofillInputProps {
  accessToken: string;
  onAddressSelect?: (address: any) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
  defaultValue?: string;
}

export const AddressAutofillInput: React.FC<AddressAutofillInputProps> = ({
  accessToken,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className = "",
  name = "address",
  required = false,
  defaultValue = ""
}) => {
  const [isTokenValid, setIsTokenValid] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Validate access token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!accessToken || accessToken.trim() === '') {
        setIsTokenValid(false);
        setError("Access token is missing");
        setIsLoading(false);
        return;
      }

      try {
        // Test the token with a simple request
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${accessToken}`
        );
        
        if (response.status === 401 || response.status === 403) {
          setIsTokenValid(false);
          setError("Invalid Mapbox access token");
        } else if (!response.ok) {
          setIsTokenValid(false);
          setError("Failed to validate access token");
        } else {
          setIsTokenValid(true);
          setError("");
        }
      } catch (err) {
        setIsTokenValid(false);
        setError("Network error: Unable to validate token");
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className={`${className} p-3 border border-gray-300 rounded`}>
        <span className="text-gray-500">Loading address autofill...</span>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className={`${className}`}>
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          className="w-full p-3 border border-red-500 rounded"
          required={required}
          defaultValue={defaultValue}
          disabled
        />
        <p className="text-red-500 text-sm mt-1">
          ⚠️ {error}. Address autofill is disabled.
        </p>
      </div>
    );
  }

  return (
    <AddressAutofill 
      accessToken={accessToken}
      onRetrieve={(result) => {
        if (onAddressSelect) {
          onAddressSelect(result);
        }
      }}
    >
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        autoComplete="address-line1"
        className={`w-full p-3 border border-gray-300 rounded focus:border-blue-500 focus:outline-none ${className}`}
        required={required}
        defaultValue={defaultValue}
      />
    </AddressAutofill>
  );
};