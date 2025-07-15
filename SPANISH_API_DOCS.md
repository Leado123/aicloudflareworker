# Spanish Quiz API Documentation

This document describes the API endpoints for the Spanish conjugation quiz system.

## Overview

The Spanish Quiz API provides endpoints for generating, storing, and retrieving Spanish conjugation quizzes. All quizzes are automatically saved to the database when generated.

## Endpoints

### 1. Generate New Spanish Quiz

**POST** `/api/spanish`

Generates a new Spanish conjugation quiz with AI-powered questions and automatically saves it to the database.

#### Request Body

```json
{
  "arrayLength": 5,
  "difficulty": "intermediate"
}
```

#### Parameters

- `arrayLength` (optional): Number of questions to generate (default: 5)
- `difficulty` (optional): Difficulty level - "beginner", "intermediate", or "advanced" (default: "intermediate")

#### Response

```json
{
  "success": true,
  "questions": [
    {
      "id": "clx123...",
      "conjugatedVerbAnswer": "hablé",
      "conjugationTense": "Preterite",
      "verbInInfiniteTense": "hablar",
      "hasGerund": false,
      "sentenceWithVerb": "Yo hablé con mi amigo ayer.",
      "exampleSentenceWithDifferentPronoun": "Ella habló con su madre."
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

#### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

### 2. Get List of Pregenerated Quizzes

**GET** `/api/spanish/getList`

Retrieves a list of previously generated Spanish quizzes from the database.

#### Query Parameters

- `take` (optional): Number of quizzes to retrieve (default: 10)
- `skip` (optional): Number of quizzes to skip for pagination (default: 0)

#### Example Request

```
GET /api/spanish/getList?take=5&skip=0
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "Spanish Quiz - intermediate (2024-01-15)",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "conjugationQuestions": [
        {
          "id": "clx456...",
          "conjugatedVerbAnswer": "hablé",
          "conjugationTense": "Preterite",
          "verbInInfiniteTense": "hablar",
          "hasGerund": false,
          "sentenceWithVerb": "Yo hablé con mi amigo ayer.",
          "exampleSentenceWithDifferentPronoun": "Ella habló con su madre."
        }
      ],
      "genderedWordQuestions": []
    }
  ],
  "metadata": {
    "count": 5,
    "take": 5,
    "skip": 0
  }
}
```

---

### 3. Get Specific Quiz by ID

**GET** `/api/spanish/[id]`

Retrieves a specific Spanish quiz by its ID.

#### Parameters

- `id`: The unique identifier of the quiz

#### Example Request

```
GET /api/spanish/clx123abc456def789
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "clx123abc456def789",
    "name": "Spanish Quiz - advanced (2024-01-15)",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "conjugationQuestions": [
      {
        "id": "clx456...",
        "conjugatedVerbAnswer": "hubiera hablado",
        "conjugationTense": "PastPerfectSubjunctive",
        "verbInInfiniteTense": "hablar",
        "hasGerund": false,
        "sentenceWithVerb": "Si hubiera hablado antes, habría sido mejor.",
        "exampleSentenceWithDifferentPronoun": "Si él hubiera hablado..."
      }
    ],
    "genderedWordQuestions": []
  }
}
```

#### Error Response (404)

```json
{
  "success": false,
  "error": "Spanish quiz not found"
}
```

---

### 4. Create New Quiz from Existing Questions

**POST** `/api/spanish/generateNew`

Creates a new Spanish quiz entity using existing questions from the database.

#### Request Body

```json
{
  "name": "Custom Quiz Name",
  "questionIds": ["clx123...", "clx456...", "clx789..."]
}
```

#### Parameters

- `name`: Name for the new quiz
- `questionIds`: Array of question IDs to include in the quiz

#### Response

```json
{
  "success": true,
  "data": {
    "id": "clx999...",
    "name": "Custom Quiz Name",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "conjugationQuestions": [
      {
        "id": "clx123...",
        "conjugatedVerbAnswer": "hablé",
        "conjugationTense": "Preterite",
        "verbInInfiniteTense": "hablar",
        "hasGerund": false,
        "sentenceWithVerb": "Yo hablé con mi amigo ayer.",
        "exampleSentenceWithDifferentPronoun": "Ella habló con su madre."
      }
    ],
    "genderedWordQuestions": []
  }
}
```

---

### 5. Test Endpoints

**GET** `/api/test-spanish`

Runs comprehensive tests on the Spanish quiz system to verify functionality.

#### Response

```json
{
  "success": true,
  "message": "Tests completed: 6/6 passed",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "tests": [
    {
      "name": "Database Connection",
      "status": "PASSED",
      "result": "Database connected successfully"
    }
  ],
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  }
}
```

**POST** `/api/test-spanish`

Creates sample quiz data for testing purposes.

#### Request Body

```json
{
  "action": "create-sample-quiz"
}
```

#### Response

```json
{
  "success": true,
  "message": "Sample quiz created successfully",
  "data": {
    "id": "clx999...",
    "name": "Sample Quiz - 1/15/2024",
    "conjugationQuestions": [...]
  }
}
```

---

## Data Models

### ConjugationQuestion

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

### ConjugationTense Enum

Available tenses:
- `Preterite`
- `Imperfect`
- `Conditional`
- `Future`
- `AffirmativeImperative`
- `NegativeImperative`
- `PresentSubjunctive`
- `ImperfectSubjunctive`
- `PresentProgressive`
- `PreteriteProgressive`
- `ImperfectProgressive`
- `ConditionalProgressive`
- `FutureProgressive`
- `PresentPerfect`
- `PastPerfect`
- `ConditionalPerfect`
- `FuturePerfect`
- `PresentPerfectSubjunctive`
- `PastPerfectSubjunctive`
- `InformalFuture`

### SpanishEntity

```typescript
interface SpanishEntity {
  id: string;
  name: string;
  createdAt: string;
  conjugationQuestions: ConjugationQuestion[];
  genderedWordQuestions: GenderedWordQuestion[];
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (quiz not found)
- `500`: Internal Server Error

---

## Database Integration

- All generated quizzes are automatically saved to the PostgreSQL database
- Questions are stored with full metadata including tense, infinitive form, and example sentences
- Quizzes can be retrieved and reused through the pregenerated quiz interface
- Database uses Prisma ORM with proper type safety

---

## Frontend Integration

The Spanish React component (`/src/components/spanish.tsx`) automatically:
- Displays pregenerated quizzes when available
- Allows users to load existing quizzes
- Provides a refresh button to reload the quiz list
- Shows loading states and error handling
- Saves new quizzes to the database when generated

---

## Testing

Use the test endpoints to verify system functionality:
1. Visit `/api/test-spanish` to run comprehensive tests
2. Use `POST /api/test-spanish` with `{"action": "create-sample-quiz"}` to create sample data
3. Check the frontend at `/spanish` to verify UI integration