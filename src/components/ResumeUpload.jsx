import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AI Profile Builder Component
 * Users describe themselves naturally and AI extracts structured profile data
 */
export default function AIProfileBuilder({ onExtracted, onSkip }) {
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const minLength = 50;
  const maxLength = 5000;

  const handleGenerate = async () => {
    if (!text || text.trim().length < minLength) {
      setError(`Please write at least ${minLength} characters about yourself.`);
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);

      const response = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text.trim() })
      });

      setProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate profile');
      }

      setProgress(100);

      console.log('Profile generation successful!', result);
      console.log('Extracted data:', result.data);

      if (onExtracted) {
        console.log('Calling onExtracted callback with data:', result.data);
        onExtracted(result.data);
      } else {
        console.warn('No onExtracted callback provided!');
      }

    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate profile. Please try again.');
      setProgress(0);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Info Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
        <div className="flex items-start">
          <svg
            className="h-6 w-6 text-indigo-600 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-indigo-900 mb-1">
              Tell us about yourself
            </h3>
            <p className="text-sm text-indigo-700">
              Our AI will create your profile from what you share. Include your background, skills, interests, experience, and anything else you'd like on your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder="Hi! I'm a software developer with 5 years of experience in React and Node.js. I love building user-friendly web applications and contributing to open source projects. My skills include JavaScript, TypeScript, Python, and AWS. In my free time, I enjoy hiking and photography. You can find me on GitHub as @johndoe and LinkedIn at linkedin.com/in/johndoe. My email is john@example.com..."
          disabled={generating}
          maxLength={maxLength}
          className={`w-full min-h-[300px] p-4 border-2 rounded-lg transition-all duration-200 resize-y ${
            error
              ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
              : text.length >= minLength
              ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
          } focus:outline-none focus:ring-2`}
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
          {text.length}/{maxLength} characters
        </div>
      </div>

      {/* Progress Bar */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-indigo-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              AI is creating your profile...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start"
          >
            <svg
              className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          disabled={generating}
        >
          Skip for now
        </button>
        <button
          onClick={handleGenerate}
          disabled={text.trim().length < minLength || generating}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            text.trim().length >= minLength && !generating
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {generating ? 'Generating...' : 'Generate My Profile'}
        </button>
      </div>
    </div>
  );
}
