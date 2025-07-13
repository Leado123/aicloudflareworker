"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface ConjugationQuestion {
  id: string;
  conjugatedVerbAnswer: string;
  conjugationTense: string;
  verbInInfiniteTense: string;
  hasGerund: boolean;
  sentenceWithVerb?: string;
  exampleSentenceWithDifferentPronoun?: string;
}

interface ConjugationResponse {
  success: boolean;
  questions?: ConjugationQuestion[];
  metadata?: {
    count: number;
    difficulty: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: string;
}

interface QuizState {
  currentIndex: number;
  userAnswers: string[];
  showResults: boolean;
  score: number;
  answerChecked: boolean;
}

const DIFFICULTIES = [
  {
    value: "beginner",
    label: "Beginner",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    color: "bg-yellow-100 text-yellow-800",
  },
  { value: "advanced", label: "Advanced", color: "bg-red-100 text-red-800" },
];

const CONJUGATION_TENSES: { [key: string]: string } = {
  Preterite: "Preterite",
  Imperfect: "Imperfect",
  Conditional: "Conditional",
  Future: "Future",
  AffirmativeImperative: "Affirmative Imperative",
  NegativeImperative: "Negative Imperative",
  PresentSubjunctive: "Present Subjunctive",
  ImperfectSubjunctive: "Imperfect Subjunctive",
  PresentProgressive: "Present Progressive",
  PreteriteProgressive: "Preterite Progressive",
  ImperfectProgressive: "Imperfect Progressive",
  ConditionalProgressive: "Conditional Progressive",
  FutureProgressive: "Future Progressive",
  PresentPerfect: "Present Perfect",
  PastPerfect: "Past Perfect",
  ConditionalPerfect: "Conditional Perfect",
  FuturePerfect: "Future Perfect",
  PresentPerfectSubjunctive: "Present Perfect Subjunctive",
  PastPerfectSubjunctive: "Past Perfect Subjunctive",
  InformalFuture: "Informal Future",
};

const ACCENT_BUTTONS = [
  { char: "á", label: "á" },
  { char: "é", label: "é" },
  { char: "í", label: "í" },
  { char: "ó", label: "ó" },
  { char: "ú", label: "ú" },
  { char: "ü", label: "ü" },
  { char: "ñ", label: "ñ" },
];

export default function Spanish() {
  const [questions, setQuestions] = useState<ConjugationQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [questionCount, setQuestionCount] = useState(5);
  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    userAnswers: [],
    showResults: false,
    score: 0,
    answerChecked: false,
  });
  const [mode, setMode] = useState<"practice" | "quiz">("practice");
  const inputRef = useRef<HTMLInputElement>(null);

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setQuizState({
      currentIndex: 0,
      userAnswers: [],
      showResults: false,
      score: 0,
      answerChecked: false,
    });

    try {
      const response = await fetch("/api/spanish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: questionCount,
          difficulty: difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ConjugationResponse = await response.json();

      if (data.success && data.questions) {
        setQuestions(data.questions);
        setQuizState((prev) => ({
          ...prev,
          userAnswers: new Array(data.questions!.length).fill(""),
        }));
      } else {
        setError(data.error || "Failed to generate questions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (answer: string) => {
    const newAnswers = [...quizState.userAnswers];
    newAnswers[quizState.currentIndex] = answer;
    setQuizState((prev) => ({ ...prev, userAnswers: newAnswers }));
  };

  const checkAnswer = () => {
    setQuizState((prev) => ({ ...prev, answerChecked: true }));
  };

  const nextQuestion = () => {
    if (quizState.currentIndex < questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        answerChecked: false,
      }));
      // Focus the input for the next question
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const previousQuestion = () => {
    if (quizState.currentIndex > 0) {
      setQuizState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        answerChecked: false,
      }));
      // Focus the input for the previous question
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const finishQuiz = () => {
    const score = quizState.userAnswers.reduce((acc, answer, index) => {
      const isCorrect =
        answer.toLowerCase().trim() ===
        questions[index].conjugatedVerbAnswer.toLowerCase().trim();
      return acc + (isCorrect ? 1 : 0);
    }, 0);

    setQuizState((prev) => ({ ...prev, showResults: true, score }));
  };

  const resetQuiz = () => {
    setQuestions([]);
    setQuizState({
      currentIndex: 0,
      userAnswers: [],
      showResults: false,
      score: 0,
      answerChecked: false,
    });
    setError(null);
  };

  const insertAccent = (char: string) => {
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = quizState.userAnswers[quizState.currentIndex] || "";
      const newValue =
        currentValue.substring(0, start) + char + currentValue.substring(end);

      handleAnswerChange(newValue);

      // Set cursor position after the inserted character
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (
        !quizState.answerChecked &&
        quizState.userAnswers[quizState.currentIndex]?.trim()
      ) {
        checkAnswer();
      } else if (quizState.answerChecked) {
        if (quizState.currentIndex < questions.length - 1) {
          nextQuestion();
        } else {
          finishQuiz();
        }
      }
    }
  };

  const hollowOutSentence = (sentence: string, conjugatedVerb: string) => {
    if (!sentence || !conjugatedVerb) return sentence;
    
    let match = new RegExp(conjugatedVerb, "gi");
    sentence = sentence.replace(match, "_".repeat(conjugatedVerb.length));
    
    return sentence;
  };

  // Focus input when component mounts or question changes
  useEffect(() => {
    if (questions.length > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [questions, quizState.currentIndex]);

  const currentQuestion = questions[quizState.currentIndex];
  const currentAnswer = quizState.userAnswers[quizState.currentIndex] || "";
  const isCorrect =
    currentAnswer.toLowerCase().trim() ===
    currentQuestion?.conjugatedVerbAnswer.toLowerCase().trim();

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Spanish Conjugation Practice
        </h1>
        <p className="text-gray-600">
          Master Spanish verb conjugations with AI-powered questions
        </p>
      </div>

      {/* Configuration Panel */}
      {questions.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Configure Your Practice Session
            </CardTitle>
            <CardDescription>
              Choose your difficulty level and number of questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Demo Section - Show when no questions loaded */}
            {questions.length === 0 && !loading && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
                <h3 className="text-sm font-medium text-yellow-800 mb-3">
                  🎯 Demo: Hollowing Out Function (Testing Accent Characters)
                </h3>
                <div className="space-y-3 text-sm">
                  {/* Test 1: Accented verb */}
                  <div className="grid grid-cols-1 gap-1 p-2 bg-white rounded border">
                    <div>
                      <strong>Test 1 - Accented verb:</strong>
                    </div>
                    <div>Original: "Yo hablé con mi padre ayer."</div>
                    <div>Verb: "hablé"</div>
                    <div className="text-blue-600">
                      Result: "
                      {hollowOutSentence(
                        "Yo hablé con mi padre ayer.",
                        "hablé"
                      )}
                      "
                    </div>
                  </div>

                  {/* Test 2: Compound verb */}
                  <div className="grid grid-cols-1 gap-1 p-2 bg-white rounded border">
                    <div>
                      <strong>Test 2 - Compound verb:</strong>
                    </div>
                    <div>Original: "Estoy hablando por teléfono."</div>
                    <div>Verb: "estoy hablando"</div>
                    <div className="text-blue-600">
                      Result: "
                      {hollowOutSentence(
                        "Estoy hablando por teléfono.",
                        "estoy hablando"
                      )}
                      "
                    </div>
                  </div>

                  {/* Test 3: More accents */}
                  <div className="grid grid-cols-1 gap-1 p-2 bg-white rounded border">
                    <div>
                      <strong>Test 3 - More accents:</strong>
                    </div>
                    <div>Original: "Él comió una pizza deliciosa."</div>
                    <div>Verb: "comió"</div>
                    <div className="text-blue-600">
                      Result: "
                      {hollowOutSentence(
                        "Él comió una pizza deliciosa.",
                        "comió"
                      )}
                      "
                    </div>
                  </div>

                  {/* Test 4: No accents */}
                  <div className="grid grid-cols-1 gap-1 p-2 bg-white rounded border">
                    <div>
                      <strong>Test 4 - Regular verb:</strong>
                    </div>
                    <div>Original: "Nosotros caminamos al parque."</div>
                    <div>Verb: "caminamos"</div>
                    <div className="text-blue-600">
                      Result: "
                      {hollowOutSentence(
                        "Nosotros caminamos al parque.",
                        "caminamos"
                      )}
                      "
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-sm font-medium">Difficulty Level</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((diff) => (
                  <Button
                    key={diff.value}
                    variant={difficulty === diff.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(diff.value)}
                  >
                    {diff.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Number of Questions</label>
              <div className="flex gap-2">
                {[3, 5, 10, 15].map((count) => (
                  <Button
                    key={count}
                    variant={questionCount === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuestionCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Practice Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={mode === "practice" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("practice")}
                >
                  Practice Mode
                </Button>
                <Button
                  variant={mode === "quiz" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("quiz")}
                >
                  Quiz Mode
                </Button>
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
            <Button onClick={resetQuiz} variant="outline" className="mt-3">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quiz Results */}
      {quizState.showResults && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              Quiz Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-green-700">
                {quizState.score}/{questions.length}
              </div>
              <div className="text-lg text-green-600">
                {Math.round((quizState.score / questions.length) * 100)}%
                Correct
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={resetQuiz} variant="outline">
                  New Questions
                </Button>
                <Button
                  onClick={() =>
                    setQuizState((prev) => ({
                      ...prev,
                      showResults: false,
                      currentIndex: 0,
                      answerChecked: false,
                    }))
                  }
                >
                  Review Answers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Display */}
      {questions.length > 0 && currentQuestion && !quizState.showResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Question {quizState.currentIndex + 1} of {questions.length}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    DIFFICULTIES.find((d) => d.value === difficulty)?.color
                  }
                >
                  {difficulty}
                </Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((quizState.currentIndex + 1) / questions.length) * 100
                  }%`,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-6">
              {/* Centered Tense */}
              <div className="flex justify-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {CONJUGATION_TENSES[currentQuestion.conjugationTense] ||
                    currentQuestion.conjugationTense}
                </Badge>
              </div>

              {/* Verb to Conjugate */}
              <div className="text-2xl font-bold text-gray-900">
                Conjugate:{" "}
                <span className="text-blue-600">
                  {currentQuestion.verbInInfiniteTense}
                </span>
              </div>

              {/* Hollowed-out Sentence */}
              {currentQuestion.sentenceWithVerb && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-2">
                    Fill in the blank:
                  </p>
                  <p className="text-xl text-gray-800 font-medium">
                    {hollowOutSentence(
                      currentQuestion.sentenceWithVerb,
                      currentQuestion.conjugatedVerbAnswer
                    )}
                  </p>
                </div>
              )}

              {/* Input Section */}
              <div className="space-y-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your answer..."
                  className="w-full max-w-md mx-auto px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={quizState.answerChecked && mode === "quiz"}
                />

                {/* Accent Buttons */}
                <div className="flex justify-center gap-1 flex-wrap">
                  {ACCENT_BUTTONS.map((accent) => (
                    <Button
                      key={accent.char}
                      variant="outline"
                      size="sm"
                      onClick={() => insertAccent(accent.char)}
                      className="min-w-8 h-8 p-1"
                    >
                      {accent.label}
                    </Button>
                  ))}
                </div>

                {/* Check Answer Button */}
                {!quizState.answerChecked && currentAnswer.trim() && (
                  <Button onClick={checkAnswer} className="mt-2">
                    Check Answer (Press Enter)
                  </Button>
                )}

                {/* Answer Feedback */}
                {quizState.answerChecked && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                      <span className="text-lg font-medium">
                        {isCorrect ? "Correct!" : "Incorrect"}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="text-center">
                        <span className="text-sm text-gray-600">
                          Correct answer:{" "}
                          <span className="font-medium text-green-600">
                            {currentQuestion.conjugatedVerbAnswer}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Example with Different Pronoun */}
              {currentQuestion.exampleSentenceWithDifferentPronoun && (
                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800 font-medium">
                    Example with different pronoun:
                  </p>
                  <p className="text-blue-800">
                    {currentQuestion.exampleSentenceWithDifferentPronoun}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                onClick={previousQuestion}
                disabled={quizState.currentIndex === 0}
                variant="outline"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {quizState.answerChecked && (
                  <>
                    {quizState.currentIndex < questions.length - 1 ? (
                      <Button onClick={nextQuestion}>
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={finishQuiz}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Finish Quiz
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Button */}
      {questions.length > 0 && (
        <div className="text-center">
          <Button onClick={resetQuiz} variant="outline">
            Start New Session
          </Button>
        </div>
      )}
    </div>
  );
}
