// Simple test script for the Spanish conjugation API
// Run this with: node test-spanish-api.js

const API_BASE_URL = 'http://localhost:4321'; // Adjust for your local dev server

async function testSpanishConjugationAPI() {
  console.log('🚀 Testing Spanish Conjugation API...\n');

  // Test 1: Basic functionality
  console.log('📝 Test 1: Basic functionality (5 intermediate questions)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/spanish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 5,
        difficulty: 'intermediate'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success!');
      console.log(`Generated ${data.questions.length} questions`);
      console.log(`Token usage: ${data.metadata.usage.totalTokens} tokens`);

      // Show first question
      if (data.questions.length > 0) {
        const q = data.questions[0];
        console.log(`Sample question: ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`);
        if (q.sentenceWithVerb) {
          console.log(`Example: ${q.sentenceWithVerb}`);
        }
      }
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Beginner level
  console.log('📝 Test 2: Beginner level (3 questions)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/spanish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 3,
        difficulty: 'beginner'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success!');
      console.log(`Generated ${data.questions.length} beginner questions`);

      data.questions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`);
        console.log(`   Has gerund: ${q.hasGerund}`);
        console.log(`   Tense: ${q.conjugationTense}`);
      });
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Advanced level
  console.log('📝 Test 3: Advanced level (2 questions)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/spanish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 2,
        difficulty: 'advanced'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success!');
      console.log(`Generated ${data.questions.length} advanced questions`);

      data.questions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.verbInInfiniteTense} → ${q.conjugatedVerbAnswer}`);
        if (q.sentenceWithVerb) {
          console.log(`   Example: ${q.sentenceWithVerb}`);
        }
        if (q.exampleSentenceWithDifferentPronoun) {
          console.log(`   Alternative: ${q.exampleSentenceWithDifferentPronoun}`);
        }
      });
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Test GET endpoint
  console.log('📝 Test 4: GET endpoint (should return usage info)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/spanish`, {
      method: 'GET'
    });

    const data = await response.json();
    console.log('✅ GET response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 5: Error handling (invalid parameters)
  console.log('📝 Test 5: Error handling (invalid parameters)');
  try {
    const response = await fetch(`${API_BASE_URL}/api/spanish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: -1,
        difficulty: 'invalid_difficulty'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ API handled invalid params gracefully');
      console.log(`Generated ${data.questions.length} questions despite invalid params`);
    } else {
      console.log('✅ API properly rejected invalid params:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Testing complete!');
}

// Run the tests
testSpanishConjugationAPI().catch(console.error);
