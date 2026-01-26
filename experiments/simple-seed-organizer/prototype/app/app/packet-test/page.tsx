'use client';

import { useState, useEffect } from 'react';

export default function PacketTestPage() {
  const [authTest, setAuthTest] = useState<{
    loading: boolean;
    success: boolean | null;
    message: string | null;
    error: string | null;
    details: any;
  }>({
    loading: true,
    success: null,
    message: null,
    error: null,
    details: null
  });

  // Test authentication on mount
  useEffect(() => {
    const testAuth = async () => {
      setAuthTest(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await fetch('/api/test-auth');
        const data = await response.json();
        
        setAuthTest({
          loading: false,
          success: data.success,
          message: data.message || null,
          error: data.error || null,
          details: data
        });
      } catch (err) {
        setAuthTest({
          loading: false,
          success: false,
          message: null,
          error: err instanceof Error ? err.message : 'Failed to test authentication',
          details: null
        });
      }
    };

    testAuth();
  }, []);

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#101828] mb-2">OpenAI API Authentication Test</h1>
        <p className="text-sm text-[#6a7282] mb-6">Simple test to verify API key authentication</p>

        {/* Auth Test Result */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            {authTest.loading && (
              <>
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-sm font-medium text-[#4a5565]">Testing authentication...</span>
              </>
            )}
            {!authTest.loading && authTest.success && (
              <>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-green-600">Authentication Successful!</span>
              </>
            )}
            {!authTest.loading && !authTest.success && (
              <>
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm font-medium text-red-600">Authentication Failed</span>
              </>
            )}
          </div>

          {authTest.message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">{authTest.message}</p>
            </div>
          )}

          {authTest.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800 mb-1">Error</p>
              <p className="text-sm text-red-600">{authTest.error}</p>
            </div>
          )}

          {authTest.details && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Test Details</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs text-[#101828] overflow-auto border border-gray-200">
                {JSON.stringify(authTest.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">What this test does:</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Checks if OPENAI_API_KEY is set in environment variables</li>
            <li>Makes a simple GET request to OpenAI's /models endpoint</li>
            <li>Verifies the API key is valid and has proper permissions</li>
            <li>Returns basic information about available models</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
