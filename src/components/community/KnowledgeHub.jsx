import { motion } from 'framer-motion';

export function KnowledgeHub() {
  const resources = [
    {
      icon: '🚀',
      title: 'Getting Started in Milwaukee Tech',
      description: 'Your guide to joining the MKE tech community',
      link: '#',
      category: 'Guide'
    },
    {
      icon: '💻',
      title: 'Hackathon Prep Checklist',
      description: 'Everything you need for your first hackathon',
      link: '#',
      category: 'Guide'
    },
    {
      icon: '🐍',
      title: 'Python Basics for Beginners',
      description: 'Learn Python from scratch with local mentors',
      link: '#',
      category: 'Tutorial'
    },
    {
      icon: '💼',
      title: 'Milwaukee Tech Job Board',
      description: 'Find opportunities at local startups and companies',
      link: '#',
      category: 'Jobs'
    },
    {
      icon: '🎓',
      title: 'Upcoming Workshops',
      description: 'Hands-on learning sessions and skill-building',
      link: '#',
      category: 'Events'
    },
    {
      icon: '🏢',
      title: 'Milwaukee Tech Companies',
      description: 'Directory of tech companies in the area',
      link: '#',
      category: 'Directory'
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      'Guide': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Tutorial': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Jobs': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Events': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Directory': 'bg-pink-500/10 text-pink-600 border-pink-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📚</span>
          Knowledge & Resources
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource, index) => (
          <motion.a
            key={index}
            href={resource.link}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{resource.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold group-hover:text-primary transition-colors">
                    {resource.title}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(resource.category)}`}>
                    {resource.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {resource.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
