import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function PostComposer({ userEmail, onPostCreated }) {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const extractTags = (text) => {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }
    return [...new Set(tags)]; // Remove duplicates
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError(null);

    try {
      const tags = extractTags(content);

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          content: content.trim(),
          tags,
          visibility: 'public'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      const data = await response.json();
      setContent('');
      if (onPostCreated) onPostCreated(data.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const charCount = content.length;
  const maxChars = 500;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Use #hashtags..."
          className="w-full p-4 bg-transparent border border-border/40 rounded-lg resize-none focus:outline-none focus:border-foreground/60 transition-colors text-sm"
          rows={4}
          maxLength={maxChars}
          autoFocus
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={charCount > maxChars * 0.9 ? 'text-foreground' : ''}>
              {charCount}/{maxChars}
            </span>
            {extractTags(content).length > 0 && (
              <div className="flex items-center gap-1">
                {extractTags(content).map(tag => (
                  <span key={tag} className="text-muted-foreground">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={posting || !content.trim() || charCount > maxChars}
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {error && (
          <div className="text-xs text-foreground bg-foreground/10 px-3 py-2 rounded">{error}</div>
        )}
      </form>
    </div>
  );
}
