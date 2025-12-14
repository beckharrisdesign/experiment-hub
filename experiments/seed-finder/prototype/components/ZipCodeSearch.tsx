"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ZipCodeSearch() {
  const [zipCode, setZipCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedZip = zipCode.trim();
    if (trimmedZip.length === 5 && /^\d{5}$/.test(trimmedZip)) {
      router.push(`/zip/${trimmedZip}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter zip code (e.g., 78726)"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          maxLength={5}
          pattern="\d{5}"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Search
        </button>
      </div>
      {zipCode.length > 0 && zipCode.length !== 5 && (
        <p className="mt-2 text-sm text-gray-500">
          Please enter a 5-digit zip code
        </p>
      )}
    </form>
  );
}

