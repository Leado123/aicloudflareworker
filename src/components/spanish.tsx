"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import GradientText from "@/components/reactbits/GradientText/GradientText";
import { motion, AnimatePresence } from "framer-motion";
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

interface SpanishEntity {
  id: string;
  name: string;
  createdAt: string;
  conjugationQuestions: ConjugationQuestion[];
  genderedWordQuestions: any[];
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

interface PregeneratedQuizzesResponse {
  success: boolean;
  data?: SpanishEntity[];
  metadata?: {
    count: number;
    take: number;
    skip: number;
  };
  error?: string;
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
  const [questionCount, setQuestionCount] = useState(15);
  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    userAnswers: [],
    showResults: false,
    score: 0,
    answerChecked: false,
  });
  const [mode, setMode] = useState<"practice" | "quiz">("practice");
  const [pregeneratedQuizzes, setPregeneratedQuizzes] = useState<
    SpanishEntity[]
  >([]);
  const [loadingPregenerated, setLoadingPregenerated] = useState(false);
  const [showPregenerated] = useState(true);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isQuizOrPracticeMode, setIsQuizOrPracticeMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPregeneratedQuizzes();
  }, []);

  const fetchPregeneratedQuizzes = async () => {
    setLoadingPregenerated(true);
    try {
      const response = await fetch("/api/spanish/getList?take=10&skip=0");
      const data: PregeneratedQuizzesResponse = await response.json();

      if (data.success && data.data) {
        setPregeneratedQuizzes(data.data);
      } else {
        setError(data.error || "Failed to fetch pregenerated quizzes");
      }
    } catch (err) {
      setError("Failed to fetch pregenerated quizzes");
      console.error("Error fetching pregenerated quizzes:", err);
    } finally {
      setLoadingPregenerated(false);
    }
  };

  const loadPregeneratedQuiz = async (quiz: SpanishEntity) => {
    setLoadingQuizId(quiz.id);
    setError(null);

    try {
      // Transform the database questions to match the expected format
      const transformedQuestions: ConjugationQuestion[] =
        quiz.conjugationQuestions.map((q) => ({
          id: q.id,
          conjugatedVerbAnswer: q.conjugatedVerbAnswer,
          conjugationTense: q.conjugationTense,
          verbInInfiniteTense: q.verbInInfiniteTense,
          hasGerund: q.hasGerund,
          sentenceWithVerb: q.sentenceWithVerb,
          exampleSentenceWithDifferentPronoun:
            q.exampleSentenceWithDifferentPronoun,
        }));

      setQuestions(transformedQuestions);
      setIsQuizOrPracticeMode(true);
      setQuizState({
        currentIndex: 0,
        userAnswers: new Array(transformedQuestions.length).fill(""),
        showResults: false,
        score: 0,
        answerChecked: false,
      });
    } catch (err) {
      setError(
        `Failed to load quiz "${quiz.name}": ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading pregenerated quiz:", err);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setQuizState({
      currentIndex: 0,
      userAnswers: new Array(questionCount).fill(""),
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
          arrayLength: questionCount,
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
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
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
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
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
      if (!quizState.answerChecked && currentAnswer.trim()) {
        // Automatically check the answer when Enter is pressed
        setQuizState((prev) => ({ ...prev, answerChecked: true }));
        // Keep focus on input for next Enter press
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      } else if (quizState.answerChecked) {
        if (quizState.currentIndex < questions.length - 1) {
          nextQuestion();
        } else {
          finishQuiz();
        }
      }
    }
  };

  const renderSentenceWithInput = (
    sentence: string,
    conjugatedVerb: string
  ) => {
    if (!sentence || !conjugatedVerb) return sentence;

    const parts = sentence.split(new RegExp(`(${conjugatedVerb})`, "gi"));
    let replacementIndex = 0;

    return parts.map((part, index) => {
      if (part.toLowerCase() === conjugatedVerb.toLowerCase()) {
        replacementIndex++;
        if (replacementIndex === 1) {
          // Only replace the first occurrence with input
          const inputClassName = quizState.answerChecked
            ? isCorrect
              ? "bg-green-100 border-green-500 text-green-800"
              : "bg-red-100 border-red-500 text-red-800"
            : "border-gray-300";

          return (
            <input
              key={index}
              ref={inputRef}
              type="text"
              value={
                quizState.answerChecked && !isCorrect
                  ? conjugatedVerb
                  : currentAnswer
              }
              onChange={(e) =>
                !quizState.answerChecked && handleAnswerChange(e.target.value)
              }
              onKeyPress={handleKeyPress}
              className={`inline-block px-2 py-1 border rounded text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClassName}`}
              style={{ width: `${Math.max(conjugatedVerb.length * 12, 80)}px` }}
              readOnly={quizState.answerChecked}
              autoFocus={!quizState.answerChecked}
              tabIndex={0}
            />
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Focus input when component mounts or question changes
  useEffect(() => {
    if (questions.length > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [questions, quizState.currentIndex]);

  // Keep focus on input after answer is checked
  useEffect(() => {
    if (quizState.answerChecked && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [quizState.answerChecked]);

  const currentQuestion = questions[quizState.currentIndex];
  const currentAnswer = quizState.userAnswers[quizState.currentIndex] || "";
  const isCorrect =
    currentAnswer.toLowerCase().trim() ===
    currentQuestion?.conjugatedVerbAnswer.toLowerCase().trim();

  return (
    <div className="w-3/4 h-screen flex flex-col justify-center items-center p-6 space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {questions.length === 0 && !loading && (
        <div>
          <div className="w-full flex flex-col items-center mb-6">
            <GradientText
              className="text-2xl md:text-3xl font-extrabold py-2 px-4 mb-4"
              colors={["#ffaa40", "#9c40ff", "#40ffd9", "#ffaa40"]}
              animationSpeed={6}
              showBorder={true}
            >
              <span>
                🚀 Welcome to the Ultimate Spanish Practice App!
                <br />
                <span className="text-base font-medium">
                  Instantly generate custom quizzes, practice conjugations, and
                  access a library of pregenerated challenges.
                  <br />
                  Track your progress, get instant feedback, and level up your
                  Spanish skills with AI-powered questions!
                </span>
              </span>
            </GradientText>
            <div className="flex items-center gap-2 text-lg font-semibold mb-2">
              <BookOpen className="w-5 h-5" />
              Configure Your Practice Session
            </div>
            <div className="text-gray-600 text-sm mb-2">
              Choose your difficulty level and number of questions
            </div>
          </div>
          <div className="space-y-6">
            {/* Pregenerated Quiz Section */}
            <div className="space-y-3">
              {questions.length !== 0 && (
                <div className="absolute top-4 left-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuizOrPracticeMode(false)}
                  >
                    Go Back
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Pregenerated Quizzes
                </label>
                <div className="flex gap-2">
                  {showPregenerated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchPregeneratedQuizzes}
                      disabled={loadingPregenerated}
                      title="Refresh pregenerated quizzes"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          loadingPregenerated ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  )}
                  {loadingPregenerated && (
                    <div className="flex items-center justify-center p-6 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading pregenerated quizzes...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {loadingPregenerated ? (
                  <div className="flex items-center justify-center p-6 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading pregenerated quizzes...
                  </div>
                ) : pregeneratedQuizzes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="space-y-2">
                      {[...Array(5)].map((_, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg bg-gray-200 animate-pulse"
                        >
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  pregeneratedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className={`p-3 border rounded-lg transition-colors bg-white ${
                        loadingQuizId === quiz.id
                          ? "border-blue-200 shadow-sm cursor-not-allowed"
                          : "border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                      }`}
                      onClick={() =>
                        loadingQuizId === null && loadPregeneratedQuiz(quiz)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {quiz.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {quiz.conjugationQuestions.length} questions •{" "}
                            {new Date(quiz.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center ml-2">
                          {loadingQuizId === quiz.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

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
                {[15, 50, 75].map((count) => (
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
              disabled={loading || loadingQuizId !== null}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating Questions...
                </>
              ) : loadingQuizId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading Quiz...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error: {error}</span>
          </div>
          <Button onClick={resetQuiz} variant="outline" className="mt-3">
            Try Again
          </Button>
        </div>
      )}

      {/* Quiz Results */}
      {quizState.showResults && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6">
          <div className="flex items-center gap-2 text-green-800 font-semibold mb-4">
            <CheckCircle2 className="w-5 h-5" />
            Quiz Complete!
          </div>
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-green-700">
              {quizState.score}/{questions.length}
            </div>
            <div className="text-lg text-green-600">
              {Math.round((quizState.score / questions.length) * 100)}% Correct
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
        </div>
      )}

      {/* Question Display */}
      {questions.length > 0 && currentQuestion && !quizState.showResults && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white relative">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Question {quizState.currentIndex + 1} of {questions.length}
              </div>
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
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((quizState.currentIndex + 1) / questions.length) * 100
                  }%`,
                }}
              />
            </div>
            <div className="absolute top-4 left-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsQuizOrPracticeMode(false);
                  setQuestions([]);
                  setQuizState({
                    currentIndex: 0,
                    userAnswers: [],
                    showResults: false,
                    score: 0,
                    answerChecked: false,
                  });
                  setError(null);
                }}
              >
                Go Back
              </Button>
            </div>
          </div>
          <div className="space-y-6">
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

              {/* Sentence with Integrated Input */}
              {currentQuestion.sentenceWithVerb && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-2">
                    {!quizState.answerChecked
                      ? "Type your answer directly in the textbox below and press Enter:"
                      : "Answer submitted:"}
                  </p>
                  <p className="text-xl text-gray-800 font-medium">
                    {renderSentenceWithInput(
                      currentQuestion.sentenceWithVerb,
                      currentQuestion.conjugatedVerbAnswer
                    )}
                  </p>
                </div>
              )}

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
                  <div className="text-sm text-gray-500 text-center">
                    {quizState.currentIndex < questions.length - 1
                      ? "Press Enter to continue to next question"
                      : "Press Enter to finish quiz"}
                  </div>
                </div>
              )}

              {/* Input hint when not answered */}
              {!quizState.answerChecked && currentAnswer.trim() && (
                <div className="text-sm text-gray-500 text-center">
                  Press Enter to submit your answer
                </div>
              )}

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
          </div>
        </div>
      )}
    </div>
  );
}
