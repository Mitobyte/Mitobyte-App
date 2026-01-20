import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function FeedbackViewer({ feedback, checkInsTotal }) {
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' or 'responses'
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const responseRate = checkInsTotal > 0
    ? ((feedback.total / checkInsTotal) * 100).toFixed(1)
    : 0;

  const { responses = {}, formTitle } = feedback;
  const { totalSubmissions = 0, submissions = [], questionAnalytics = [] } = responses;

  // Export to CSV
  const exportToCSV = () => {
    if (totalSubmissions === 0) return;

    // Build CSV headers
    const headers = ['Submission ID', 'Timestamp', ...questionAnalytics.map(q => q.label)];

    // Build CSV rows
    const rows = submissions.map(submission => {
      const row = [
        submission.id,
        new Date(submission.timestamp).toLocaleString(),
        ...questionAnalytics.map(q => {
          const answer = submission.answers[q.questionId];
          // Escape commas and quotes in CSV
          if (typeof answer === 'string' && (answer.includes(',') || answer.includes('"'))) {
            return `"${answer.replace(/"/g, '""')}"`;
          }
          return answer || '';
        })
      ];
      return row.join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (totalSubmissions === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
            <p className="text-muted-foreground">
              Feedback submissions will appear here once attendees submit the feedback form.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{formTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {totalSubmissions} {totalSubmissions === 1 ? 'response' : 'responses'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('analytics')}
          >
            📊 Analytics
          </Button>
          <Button
            variant={viewMode === 'responses' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('responses')}
          >
            📋 Responses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
          >
            ⬇️ Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Submissions received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{responseRate}%</div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalSubmissions} of {checkInsTotal} attendees
            </p>
            <div className="mt-2">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(responseRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{questionAnalytics.length}</div>
            <p className="text-sm text-muted-foreground mt-2">
              in this form
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {questionAnalytics.map((question, index) => (
            <Card key={question.questionId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {question.label}
                      {question.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {question.responseCount} responses ({question.responseRate}% response rate)
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                    {question.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Rating Question */}
                {question.type === 'rating' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">
                        {question.average}
                      </div>
                      <p className="text-sm text-muted-foreground">Average Rating</p>
                    </div>
                    {question.distribution && (
                      <div className="space-y-2">
                        {Object.entries(question.distribution)
                          .sort((a, b) => Number(b[0]) - Number(a[0]))
                          .map(([rating, count]) => {
                            const percentage = (count / question.responseCount) * 100;
                            return (
                              <div key={rating} className="flex items-center gap-3">
                                <div className="w-20 text-sm font-medium">
                                  {'⭐'.repeat(Number(rating))} ({rating})
                                </div>
                                <div className="flex-1">
                                  <div className="bg-secondary rounded-full h-6 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.5 }}
                                      className="bg-yellow-500 h-full rounded-full flex items-center justify-end px-2"
                                    >
                                      <span className="text-xs font-medium">
                                        {count}
                                      </span>
                                    </motion.div>
                                  </div>
                                </div>
                                <div className="w-12 text-sm text-muted-foreground text-right">
                                  {percentage.toFixed(0)}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Radio/Multiple Choice Question */}
                {question.type === 'radio' && question.distribution && (
                  <div className="space-y-2">
                    {Object.entries(question.distribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([answer, count]) => {
                        const percentage = (count / question.responseCount) * 100;
                        return (
                          <div key={answer} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="text-sm mb-1 font-medium">{answer}</div>
                              <div className="bg-secondary rounded-full h-6 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.5 }}
                                  className="bg-blue-500 h-full rounded-full flex items-center justify-end px-2"
                                >
                                  <span className="text-xs text-white font-medium">
                                    {count}
                                  </span>
                                </motion.div>
                              </div>
                            </div>
                            <div className="w-12 text-sm text-muted-foreground text-right">
                              {percentage.toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Text/Textarea Question */}
                {(question.type === 'text' || question.type === 'textarea' || question.type === 'email') && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      {question.responseCount} text {question.responseCount === 1 ? 'response' : 'responses'}
                    </p>
                    {question.sampleResponses && question.sampleResponses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Sample Responses:
                        </p>
                        {question.sampleResponses.map((response, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-secondary/50 rounded-lg text-sm"
                          >
                            {response}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedQuestion(question)}
                      className="mt-2"
                    >
                      View All Responses
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Responses View */}
      {viewMode === 'responses' && (
        <Card>
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="bg-secondary/50">
                    <th className="p-2 text-left font-medium">ID</th>
                    <th className="p-2 text-left font-medium">Date</th>
                    {questionAnalytics.map(q => (
                      <th key={q.questionId} className="p-2 text-left font-medium">
                        {q.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission, idx) => (
                    <motion.tr
                      key={submission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border hover:bg-secondary/30"
                    >
                      <td className="p-2">#{submission.id}</td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(submission.timestamp).toLocaleDateString()}
                      </td>
                      {questionAnalytics.map(q => (
                        <td key={q.questionId} className="p-2 max-w-xs">
                          <div className="truncate" title={submission.answers[q.questionId]}>
                            {submission.answers[q.questionId] || '-'}
                          </div>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal for viewing all responses to a question */}
      {selectedQuestion && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedQuestion(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{selectedQuestion.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    All {selectedQuestion.responseCount} responses
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedQuestion(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-3">
                {submissions
                  .map(s => s.answers[selectedQuestion.questionId])
                  .filter(Boolean)
                  .map((response, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-secondary/50 rounded-lg text-sm"
                    >
                      {response}
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
