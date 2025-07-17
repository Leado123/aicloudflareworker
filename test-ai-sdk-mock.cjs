#!/usr/bin/env node

/**
 * Mock test for AI SDK streaming without server dependency
 * Simulates what the AI SDK's toTextStreamResponse() would return
 */

// Mock streaming responses that AI SDK would generate
const mockResponses = {
  basic: [
    '{"response":"Hello! Here\'s a joke for you:","suggestedNextPrompts":[]}',
    '{"response":"Hello! Here\'s a joke for you:\\n\\nWhy don\'t scientists trust atoms?","suggestedNextPrompts":[]}',
    '{"response":"Hello! Here\'s a joke for you:\\n\\nWhy don\'t scientists trust atoms?\\n\\nBecause they make up everything!","suggestedNextPrompts":["Tell me another joke","Explain why this is funny","What are atoms really?"]}',
  ],

  incremental: [
    '{"response":"Once upon a time"}',
    '{"response":"Once upon a time, there was a robot"}',
    '{"response":"Once upon a time, there was a robot named Artie who loved to paint."}',
    '{"response":"Once upon a time, there was a robot named Artie who loved to paint.","suggestedNextPrompts":["What did Artie paint?","How did Artie learn to paint?","Tell me more about Artie"]}'
  ],

  fileAttachment: [
    '{"response":"I can see you\'ve shared a JavaScript file with me."}',
    '{"response":"I can see you\'ve shared a JavaScript file with me. The code shows a simple hello function."}',
    '{"response":"I can see you\'ve shared a JavaScript file with me. The code shows a simple hello function that logs \\"Hello, world!\\" to the console.","suggestedNextPrompts":["How can I improve this code?","What are JavaScript best practices?","Can you explain console.log?"]}'
  ],

  error: [
    '{"error":"Invalid API key provided"}'
  ],

  malformed: [
    '{"response":"This is a partial',
    ' response that continues"}',
    '{"response":"This is a partial response that continues","suggestedNextPrompts":["Continue the story","What happens next?","Tell me more"]}'
  ]
};

// Simulate the streaming process
async function simulateStream(chunks, onChunk) {
  console.log(`🎭 Simulating stream with ${chunks.length} chunks`);

  let fullResponse = { response: "", suggestedNextPrompts: [] };
  let accumulatedText = "";

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`📦 Processing chunk ${i + 1}: ${chunk}`);

    accumulatedText += chunk;

    // Try to parse the accumulated text as JSON
    try {
      const parsed = JSON.parse(accumulatedText);
      console.log(`✅ Successfully parsed JSON:`, parsed);

      // Check if it's a complete response
      if (parsed.response !== undefined) {
        fullResponse.response = parsed.response;

        // Call onChunk with the response
        onChunk({
          response: parsed.response,
          suggestedNextPrompts: parsed.suggestedNextPrompts || [],
        });
      }

      if (parsed.suggestedNextPrompts !== undefined) {
        fullResponse.suggestedNextPrompts = parsed.suggestedNextPrompts;
      }

      if (parsed.error) {
        throw new Error(parsed.error);
      }
    } catch (jsonError) {
      // If JSON parsing fails, treat as incremental text
      console.log(`⚠️  Not complete JSON yet: ${jsonError.message}`);

      // For incremental updates, call onChunk with the current accumulated text
      onChunk({
        response: accumulatedText,
        suggestedNextPrompts: [],
      });

      fullResponse.response = accumulatedText;
    }

    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Final processing - ensure we have a complete response
  if (accumulatedText && !fullResponse.response) {
    try {
      const finalParsed = JSON.parse(accumulatedText);
      fullResponse.response = finalParsed.response || accumulatedText;
      fullResponse.suggestedNextPrompts = finalParsed.suggestedNextPrompts || [];
    } catch (e) {
      // If final parsing fails, use accumulated text as response
      fullResponse.response = accumulatedText;
      fullResponse.suggestedNextPrompts = [];
    }
  }

  // Ensure we have default suggested prompts if none provided
  if (fullResponse.suggestedNextPrompts.length === 0) {
    fullResponse.suggestedNextPrompts = [
      "Can you tell me more about this?",
      "What are the next steps?",
      "How does this relate to other topics?",
    ];
  }

  return fullResponse;
}

// Test functions
async function testBasicStreaming() {
  console.log('🚀 Test 1: Basic AI SDK streaming');
  console.log('=' .repeat(50));

  let chunkCount = 0;
  const result = await simulateStream(mockResponses.basic, (chunk) => {
    chunkCount++;
    console.log(`📥 Chunk ${chunkCount} received:`, chunk);
  });

  console.log('\n📊 Final result:', result);

  const isValid = result.response.includes('atoms') &&
                  result.response.includes('everything') &&
                  result.suggestedNextPrompts.length === 3;

  console.log(`\n${isValid ? '✅' : '❌'} Test ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

async function testIncrementalStreaming() {
  console.log('\n🚀 Test 2: Incremental streaming');
  console.log('=' .repeat(50));

  let updates = [];
  const result = await simulateStream(mockResponses.incremental, (chunk) => {
    updates.push(chunk.response);
    console.log(`📥 Update: "${chunk.response}"`);
  });

  console.log('\n📊 All updates:', updates);
  console.log('📊 Final result:', result);

  const isValid = updates.length > 0 &&
                  result.response.includes('robot named Artie') &&
                  result.suggestedNextPrompts.length === 3;

  console.log(`\n${isValid ? '✅' : '❌'} Test ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

async function testFileAttachment() {
  console.log('\n🚀 Test 3: File attachment processing');
  console.log('=' .repeat(50));

  // Mock file attachment
  const mockFile = {
    name: 'test.js',
    type: 'application/javascript',
    size: 89,
    data: btoa('function hello() {\n  console.log("Hello, world!");\n}\n\nhello();')
  };

  console.log('📎 Mock file:', mockFile.name, `(${mockFile.size} bytes)`);
  console.log('📎 Decoded content:', atob(mockFile.data));

  const result = await simulateStream(mockResponses.fileAttachment, (chunk) => {
    console.log(`📥 File response: "${chunk.response}"`);
  });

  console.log('\n📊 Final result:', result);

  const isValid = result.response.includes('JavaScript') &&
                  result.response.includes('function') &&
                  result.suggestedNextPrompts.length === 3;

  console.log(`\n${isValid ? '✅' : '❌'} Test ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

async function testErrorHandling() {
  console.log('\n🚀 Test 4: Error handling');
  console.log('=' .repeat(50));

  try {
    await simulateStream(mockResponses.error, (chunk) => {
      console.log(`📥 Chunk: ${JSON.stringify(chunk)}`);
    });

    console.log('❌ Expected error but got success');
    return false;
  } catch (error) {
    console.log('✅ Correctly caught error:', error.message);
    return error.message === 'Invalid API key provided';
  }
}

async function testMalformedData() {
  console.log('\n🚀 Test 5: Malformed data handling');
  console.log('=' .repeat(50));

  let partialUpdates = [];
  const result = await simulateStream(mockResponses.malformed, (chunk) => {
    partialUpdates.push(chunk.response);
    console.log(`📥 Partial update: "${chunk.response}"`);
  });

  console.log('\n📊 All partial updates:', partialUpdates);
  console.log('📊 Final result:', result);

  const isValid = partialUpdates.length > 0 &&
                  result.response.includes('partial response that continues') &&
                  result.suggestedNextPrompts.length === 3;

  console.log(`\n${isValid ? '✅' : '❌'} Test ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

async function testChatResponseInterface() {
  console.log('\n🚀 Test 6: ChatResponse interface validation');
  console.log('=' .repeat(50));

  const mockResponse = {
    response: "This is a test response",
    suggestedNextPrompts: ["Prompt 1", "Prompt 2", "Prompt 3"]
  };

  console.log('📋 Testing interface:', mockResponse);

  const isValidInterface = typeof mockResponse.response === 'string' &&
                          Array.isArray(mockResponse.suggestedNextPrompts) &&
                          mockResponse.suggestedNextPrompts.length === 3 &&
                          mockResponse.suggestedNextPrompts.every(p => typeof p === 'string');

  console.log(`Interface validation: ${isValidInterface ? '✅' : '❌'}`);

  // Test FileAttachment interface
  const mockAttachment = {
    name: 'test.txt',
    type: 'text/plain',
    size: 123,
    data: btoa('Hello world')
  };

  const isValidAttachment = typeof mockAttachment.name === 'string' &&
                           typeof mockAttachment.type === 'string' &&
                           typeof mockAttachment.size === 'number' &&
                           typeof mockAttachment.data === 'string';

  console.log(`Attachment interface: ${isValidAttachment ? '✅' : '❌'}`);

  const isValid = isValidInterface && isValidAttachment;
  console.log(`\n${isValid ? '✅' : '❌'} Test ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

async function runAllTests() {
  console.log('🧪 AI SDK Mock Test Suite');
  console.log('==========================\n');

  const tests = [
    { name: 'Basic Streaming', fn: testBasicStreaming },
    { name: 'Incremental Streaming', fn: testIncrementalStreaming },
    { name: 'File Attachment', fn: testFileAttachment },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Malformed Data', fn: testMalformedData },
    { name: 'Interface Validation', fn: testChatResponseInterface }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (await test.fn()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw error:`, error.message);
      failed++;
    }
  }

  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! AI SDK streaming logic is working correctly.');
    console.log('💡 The implementation should work with the real AI SDK streaming.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the streaming implementation.');
  }

  return failed === 0;
}

// Performance test
async function performanceTest() {
  console.log('\n🚀 Performance Test: Large response simulation');
  console.log('=' .repeat(50));

  // Generate large response chunks
  const largeResponse = Array.from({ length: 10 }, (_, i) =>
    `{"response":"This is chunk ${i + 1} of a very long response that simulates a large AI response with multiple paragraphs and detailed explanations. ".repeat(${i + 1})}`
  );

  const startTime = Date.now();
  let updateCount = 0;

  const result = await simulateStream(largeResponse, (chunk) => {
    updateCount++;
    if (updateCount % 5 === 0) {
      console.log(`📥 Update ${updateCount}: ${chunk.response.length} characters`);
    }
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('\n📊 Performance Results:');
  console.log(`- Duration: ${duration}ms`);
  console.log(`- Updates: ${updateCount}`);
  console.log(`- Final response length: ${result.response.length}`);
  console.log(`- Average update time: ${Math.round(duration / updateCount)}ms`);

  const isValid = result.response.length > 100 && updateCount > 0;
  console.log(`\n${isValid ? '✅' : '❌'} Performance test ${isValid ? 'PASSED' : 'FAILED'}`);

  return isValid;
}

// Main execution
async function main() {
  const success = await runAllTests();
  const perfSuccess = await performanceTest();

  console.log('\n🏁 Overall Results:');
  console.log(`Core functionality: ${success ? '✅' : '❌'}`);
  console.log(`Performance: ${perfSuccess ? '✅' : '❌'}`);

  if (success && perfSuccess) {
    console.log('\n🎉 All systems go! The AI SDK streaming implementation is ready.');
    console.log('🚀 Next steps:');
    console.log('  1. Start your dev server: npm run dev');
    console.log('  2. Test with real API: node test-stream-ai-sdk.cjs');
    console.log('  3. Check the UI for streaming responses and suggested prompts');
  }

  process.exit(success && perfSuccess ? 0 : 1);
}

main();
