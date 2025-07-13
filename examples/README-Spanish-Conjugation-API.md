# Spanish Conjugation API Documentation

## Overview

The Spanish Conjugation API generates Spanish verb conjugation questions using AI-powered language models. It integrates with Langfuse for prompt management, uses the AI SDK's `generateObject` for structured output, and implements automatic API key management with rotation.

## Features

- **AI-Powered Generation**: Uses Google's Gemini 2.0 Flash model via AI SDK
- **Langfuse Integration**: Retrieves prompts from Langfuse for consistent question generation
- **Structured Output**: Uses Zod schemas with `generateObject` for type-safe responses
- **API Key Management**: Automatic rotation and validation of multiple API keys
- **Observability**: Full tracing and logging through Langfuse
- **Flexible Configuration**: Customizable difficulty levels and question counts

## API Endpoints

### POST /api/spanish

Generate Spanish conjugation questions.

**Request Body:**
```json
{
  "count": 5,
  "difficulty": "intermediate"
}
```

**Parameters:**
- `count` (optional): Number of questions to generate (default: 5)
- `difficulty` (optional): Difficulty level - "beginner", "intermediate", or "advanced" (default: "intermediate")

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "id": "unique-question-id",
      "conjugatedVerbAnswer": "hablo",
      "conjugationTense": 0,
      "verbInInfiniteTense": "hablar",
      "hasGerund": false,
      "sentenceWithVerb": "Yo hablo español todos los días.",
      "exampleSentenceWithDifferentPronoun": "Ella habla muy rápido."
    }
  ],
  "metadata": {
    "count": 5,
    "difficulty": "intermediate",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 300,
      "totalTokens": 450
    }
  }
}
```

### GET /api/spanish

Get API usage information and examples.

**Response:**
```json
{
  "message": "Spanish conjugation API - Use POST to generate questions",
  "path": "/api/spanish",
  "usage": {
    "endpoint": "POST /api/spanish",
    "parameters": {
      "count": "number (optional, default: 5) - Number of questions to generate",
      "difficulty": "string (optional, default: 'intermediate') - Difficulty level"
    },
    "example": {
      "count": 3,
      "difficulty": "beginner"
    }
  }
}
```

## Data Types

### ConjugationTense Enum
```typescript
enum ConjugationTense {
  Preterite = 0,
  Imperfect = 1,
  Conditional = 2,
  Future = 3,
  AffirmativeImperative = 4,
  NegativeImperative = 5,
  PresentSubjunctive = 6,
  ImperfectSubjunctive = 7,
  PresentProgressive = 8,
  PreteriteProgressive = 9,
  ImperfectProgressive = 10,
  ConditionalProgressive = 11,
  FutureProgressive = 12,
  PresentPerfect = 13,
  PastPerfect = 14,
  ConditionalPerfect = 15,
  FuturePerfect = 16,
  PresentPerfectSubjunctive = 17,
  PastPerfectSubjunctive = 18,
  InformalFuture = 19
}
```

### ConjugationQuestion Interface
```typescript
interface ConjugationQuestion {
  id: string;
  conjugatedVerbAnswer: string;
  conjugationTense: ConjugationTense;
  verbInInfiniteTense: string;
  hasGerund: boolean;
  sentenceWithVerb?: string;
  exampleSentenceWithDifferentPronoun?: string;
}
```

## Implementation Details

### Architecture

1. **Langfuse Integration**: Retrieves the `makeConjugation` prompt from Langfuse
2. **API Key Management**: Uses `APIKeyManager` singleton for automatic key rotation
3. **AI SDK**: Leverages `generateObject` for structured output generation
4. **Observability**: Full request tracing and token usage tracking

### Key Components

- **Prompt Management**: Langfuse stores and versions the conjugation prompt
- **Structured Generation**: Zod schemas ensure type-safe AI responses
- **Error Handling**: Automatic API key rotation on failures
- **Logging**: Comprehensive logging of API usage and key statistics

### Error Handling

The API handles various error scenarios:
- Invalid API keys (automatic rotation)
- Rate limiting (key rotation)
- Invalid request parameters (graceful fallback)
- AI generation failures (detailed error messages)

## Setup Requirements

### Environment Variables
```bash
GEMINI_API_KEY=your_fallback_api_key_here
```

### Langfuse Configuration
- Create a prompt named `makeConjugation` in your Langfuse instance
- Configure the prompt with appropriate instructions for Spanish conjugation

### Database Setup
- Ensure the `APIKeys` table is populated with valid Gemini API keys
- Keys should be marked with `type: "GEMINI"`

## Usage Examples

### Basic Usage
```javascript
const response = await fetch('/api/spanish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ count: 5, difficulty: 'intermediate' })
});

const data = await response.json();
console.log(data.questions);
```

### React Component Example
```jsx
import { useState } from 'react';

function SpanishQuiz() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/spanish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3, difficulty: 'beginner' })
      });
      
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateQuestions} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Questions'}
      </button>
      
      {questions.map((q, index) => (
        <div key={q.id}>
          <h3>Question {index + 1}</h3>
          <p>Conjugate: {q.verbInInfiniteTense}</p>
          <p>Answer: {q.conjugatedVerbAnswer}</p>
          <p>Example: {q.sentenceWithVerb}</p>
        </div>
      ))}
    </div>
  );
}
```

## Testing

### Manual Testing
```bash
# Test with curl
curl -X POST http://localhost:4321/api/spanish \
  -H "Content-Type: application/json" \
  -d '{"count": 3, "difficulty": "beginner"}'

# Test GET endpoint
curl http://localhost:4321/api/spanish
```

### Automated Testing
Run the provided test script:
```bash
node examples/test-spanish-api.js
```

## Monitoring and Observability

### Langfuse Tracing
- All requests are traced in Langfuse under the name `spanish-conjugation-generation`
- Token usage is tracked for cost monitoring
- Generation performance metrics are available

### API Key Management
- Key rotation is logged
- Key validation status is tracked
- Usage statistics are available via `getKeyStats()`

### Error Monitoring
- Failed requests are logged with detailed error messages
- API key failures trigger automatic rotation
- Rate limiting is handled gracefully

## Performance Considerations

### Token Usage
- Average token usage: ~150 prompt tokens, ~300 completion tokens per request
- Token usage scales with question count and complexity

### Response Times
- Typical response time: 2-5 seconds depending on question count
- Response time may vary based on API key performance

### Rate Limiting
- Automatic API key rotation prevents rate limit issues
- Built-in delays between key validations
- Graceful handling of rate limit errors

## Troubleshooting

### Common Issues

1. **"No valid API keys available"**
   - Check that Gemini API keys are added to the database
   - Verify keys are marked as type "GEMINI"
   - Ensure fallback API key is set in environment variables

2. **"Failed to generate questions"**
   - Check Langfuse connectivity
   - Verify the `makeConjugation` prompt exists
   - Check API key validity

3. **"Invalid API key"**
   - API key rotation should handle this automatically
   - Check logs for key validation failures

### Debug Information
- Enable detailed logging by checking console output
- Monitor Langfuse traces for generation details
- Check API key statistics in logs

## Contributing

When extending the API:
1. Update the Zod schemas for new fields
2. Update the TypeScript interfaces
3. Add appropriate error handling
4. Update documentation and examples
5. Add tests for new functionality

## License

This API is part of the AI Cloudflare Worker project and follows the same license terms.