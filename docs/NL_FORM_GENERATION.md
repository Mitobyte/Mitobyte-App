# Natural Language Form Generation

## Overview

The application now includes **AI-powered natural language form generation**. Admins can describe a form in plain English and have AI automatically create the form structure with appropriate question types.

## Features

✨ **Natural Language Input** - Describe your form conversationally
🤖 **Powered by Llama 3.1 70B** - Advanced AI for accurate form parsing
📋 **Smart Question Types** - Automatically selects appropriate field types
✏️ **Editable Output** - Review and modify generated forms before saving

## How to Use

### 1. Access the Form Builder
Navigate to: **Admin Dashboard** → **Event Forms** tab

### 2. Click "Generate with AI"
A text input will appear with the sparkle (✨) icon

### 3. Describe Your Form
Type a natural language description of the form you want to create.

#### Example Descriptions:

**Simple Feedback Form:**
```
Create a feedback form with name, email, rating from 1-5, and comments
```

**Workshop Registration:**
```
Make a workshop registration form with:
- Participant name (required)
- Email address (required)
- Company name (optional)
- Experience level: beginner, intermediate, or advanced (dropdown)
- What do you hope to learn? (long text)
- Dietary restrictions (optional text)
```

**Event Check-In:**
```
Build a check-in form with full name, email, t-shirt size (S, M, L, XL, XXL as multiple choice), and optional feedback
```

**Customer Satisfaction:**
```
Create a satisfaction survey with:
- Customer name
- Order number
- Overall satisfaction (1-5 rating)
- Product quality (1-5 rating)
- What did you like best? (paragraph)
- Suggestions for improvement (paragraph)
- Would you recommend us? (yes/no radio buttons)
```

### 4. Click "Generate Form"
The AI will process your description and create:
- Form title
- Form description
- All questions with appropriate types
- Required/optional flags
- Placeholder text
- Options for select/radio/checkbox fields

### 5. Review & Edit
- Review the generated questions
- Add, remove, or reorder questions as needed
- Modify any question details
- Click "Save Form" when ready

## Supported Question Types

| Type | Description | Best For |
|------|-------------|----------|
| **text** | Short single-line input | Names, titles, short answers |
| **textarea** | Multi-line text area | Comments, descriptions, paragraphs |
| **email** | Email validation | Email addresses |
| **number** | Numeric input | Quantities, ages, counts |
| **select** | Dropdown menu | Single choice from many options |
| **radio** | Radio buttons | Single choice from few options |
| **checkbox** | Multiple checkboxes | Multiple selections allowed |
| **rating** | 1-5 star rating | Satisfaction, quality ratings |

## Tips for Best Results

### Be Specific About Types
❌ "Add a question about satisfaction"
✅ "Add a satisfaction rating from 1-5"

### Include Options for Multiple Choice
❌ "Add t-shirt size selection"
✅ "Add t-shirt size: S, M, L, XL, XXL as dropdown"

### Specify Required vs Optional
❌ "Add phone number"
✅ "Add optional phone number"

### Use Clear Field Names
❌ "Add info field"
✅ "Add company name (short text)"

## API Endpoint

For programmatic access:

```bash
POST /api/forms/parse-natural-language
Content-Type: application/json

{
  "description": "Create a feedback form with name, email, rating 1-5, and comments"
}
```

Response:
```json
{
  "success": true,
  "form": {
    "title": "Feedback Form",
    "description": "Feedback collection form",
    "questions": [
      {
        "label": "Name",
        "type": "text",
        "required": true,
        "placeholder": "Enter your name",
        "options": []
      },
      {
        "label": "Email",
        "type": "email",
        "required": true,
        "placeholder": "your@email.com",
        "options": []
      },
      {
        "label": "Rating",
        "type": "rating",
        "required": true,
        "placeholder": "",
        "options": []
      },
      {
        "label": "Comments",
        "type": "textarea",
        "required": false,
        "placeholder": "Share your feedback",
        "options": []
      }
    ]
  }
}
```

## Technical Details

- **AI Model**: Cloudflare Workers AI - Llama 3.1 70B Instruct
- **Temperature**: 0.3 (optimized for consistent structured output)
- **Max Tokens**: 2000
- **Processing Time**: 3-8 seconds typically
- **Input Limit**: 2000 characters

## Troubleshooting

### "AI service is not configured"
- Ensure Workers AI binding is configured in `wrangler.toml`
- Verify the `AI` binding is available in production

### Generation takes too long
- Simplify your description
- Break complex forms into smaller requests
- Use more direct language

### Questions not generated correctly
- Be more specific about field types
- Explicitly state if fields are required or optional
- List out options for multiple choice questions

### Form doesn't match expectations
- Try rephrasing your description
- Use the manual "Add Question" button to fine-tune
- Edit generated questions directly in the UI

## Examples by Use Case

### Event Check-In
```
Create an event check-in form with:
- Full name (required)
- Email (required)
- Company (optional)
- First time attendee? (yes/no)
- How did you hear about us? (dropdown: social media, friend, website, email, other)
```

### Post-Event Feedback
```
Make a post-event feedback form with:
- Event name
- Attendee name (required)
- Email (required)
- Overall experience rating 1-5
- Content quality rating 1-5
- Venue rating 1-5
- What did you like most? (paragraph)
- What could be improved? (paragraph)
- Would you attend again? (yes/no/maybe)
```

### Workshop Registration
```
Build a workshop registration with:
- Participant full name (required)
- Email address (required)
- Phone number (optional)
- Company/Organization (optional)
- Job title (optional)
- Technical skill level: beginner, intermediate, advanced (dropdown)
- Previous workshop attendance? (yes/no)
- Learning objectives (paragraph)
- Special accommodations needed (optional text)
```

### Customer Survey
```
Create a customer satisfaction survey with:
- Customer name
- Order/Invoice number
- Product received rating 1-5
- Quality rating 1-5
- Customer service rating 1-5
- Delivery experience rating 1-5
- Most satisfied with (checkboxes: quality, price, service, delivery, packaging)
- Improvement suggestions (paragraph)
- Recommend to others? (yes, no, maybe - radio buttons)
- May we contact you for follow-up? (yes/no)
```

## Future Enhancements

Planned improvements:
- [ ] Form templates library with common patterns
- [ ] Iterative refinement (modify existing forms)
- [ ] Multi-language support
- [ ] Conditional logic generation
- [ ] Advanced validation rules
- [ ] Custom field types

## Support

For issues or questions:
- Check the browser console for error messages
- Verify AI binding is configured
- Review the generated form JSON in network tab
- Contact: [Your Support Email]
