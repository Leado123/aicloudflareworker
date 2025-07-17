#!/usr/bin/env node

/**
 * Test script for AI SDK's text stream response format
 * Tests the updated /api/ai-stream endpoint using result.toTextStreamResponse()
 */

const API_URL = 'http://localhost:4322/api/ai-stream';

async function testAISDKStreaming() {
  console.log('🚀 Testing AI SDK text stream response...\n');

  const testMessages = [
    {
      role: 'user',
      content: 'Hello! Tell me a short joke and suggest 3 follow-up questions.'
    }
  ];

  const testData = {
    messages: testMessages,
    attachments: []
  };

  try {
    console.log('📤 Sending request to:', API_URL);
    console.log('📤 Request payload:', JSON.stringify(testData, null, 2));
    console.log('\n--- AI SDK STREAMING RESPONSE ---');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log();

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:', response.status, errorText);
      return;
    }

    if (!response.body) {
      console.error('❌ No response body received');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let chunkCount = 0;

    console.log('📥 Reading AI SDK text stream...\n');

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\n✅ Stream completed');
        break;
      }

      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      console.log(`📦 Chunk ${chunkCount} (${value.length} bytes):`);
      console.log('Raw chunk:', JSON.stringify(chunk));

      // Show readable content if it's not control characters
      if (chunk.trim() && !chunk.includes('\x00')) {
        console.log('Content:', chunk);
      }
    }

    console.log('\n📊 Final Results:');
    console.log(`- Total chunks: ${chunkCount}`);
    console.log(`- Total text length: ${fullText.length}`);
    console.log(`- Full response text:`);
    console.log(fullText);

    // Try to parse as JSON (AI SDK might return JSON)
    try {
      const parsed = JSON.parse(fullText);
      console.log('\n✅ Successfully parsed as JSON:');
      console.log('- Response:', parsed.response || 'N/A');
      console.log('- Suggested prompts:', parsed.suggestedNextPrompts || 'N/A');

      if (parsed.response && parsed.suggestedNextPrompts) {
        console.log('🎉 Structured response received successfully!');
        return true;
      }
    } catch (e) {
      console.log('\n⚠️  Response is not JSON, treating as text stream');
    }

    if (fullText.length === 0) {
      console.log('❌ NO DATA RECEIVED - API is not streaming!');
      return false;
    } else {
      console.log('✅ Text data was received');
      return true;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack:', error.stack);
    return false;
  }
}

async function testWithFileAttachment() {
  console.log('\n🚀 Testing with file attachment...\n');

  const testMessages = [
    {
      role: 'user',
      content: 'Can you help me understand this code and suggest improvements?'
    }
  ];

  // Create a mock JavaScript file
  const mockFile = {
    name: 'example.js',
    type: 'application/javascript',
    size: 89,
    data: btoa('function hello() {\n  console.log("Hello, world!");\n}\n\nhello();')
  };

  const testData = {
    messages: testMessages,
    attachments: [mockFile]
  };

  try {
    console.log('📤 Sending request with file attachment...');
    console.log('📎 File:', mockFile.name, `(${mockFile.size} bytes)`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ File attachment test failed:', response.status, errorText);
      return false;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let hasFileReference = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      // Check if the response mentions the file
      if (chunk.toLowerCase().includes('javascript') ||
          chunk.toLowerCase().includes('function') ||
          chunk.toLowerCase().includes('code')) {
        hasFileReference = true;
      }
    }

    console.log('📝 Response length:', fullText.length);
    console.log('📝 Response preview:', fullText.substring(0, 200) + '...');

    if (hasFileReference) {
      console.log('✅ File attachment was processed successfully');
      return true;
    } else {
      console.log('⚠️  File attachment may not have been processed');
      return false;
    }

  } catch (error) {
    console.error('❌ File attachment test failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🚀 Testing error handling...\n');

  const invalidData = {
    messages: "this should be an array" // Invalid format
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData),
    });

    console.log('Error test status:', response.status);

    if (response.status === 400) {
      console.log('✅ Error handling works correctly');
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return true;
    } else {
      console.log('⚠️  Unexpected status for error test');
      return false;
    }

  } catch (error) {
    console.error('❌ Error test failed:', error.message);
    return false;
  }
}

async function testLargeResponse() {
  console.log('\n🚀 Testing large response streaming...\n');

  const testMessages = [
    {
      role: 'user',
      content: 'Write a detailed explanation of JavaScript closures with examples and suggest 3 follow-up questions.'
    }
  ];

  const testData = {
    messages: testMessages,
    attachments: []
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      console.error('❌ Large response test failed:', response.status);
      return false;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let chunkCount = 0;
    let chunkSizes = [];

    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunkCount++;
      chunkSizes.push(value.length);
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      if (chunkCount % 10 === 0) {
        process.stdout.write(`📦 Processed ${chunkCount} chunks... `);
        process.stdout.write(`(${fullText.length} chars total)\n`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n📊 Large response results:');
    console.log(`- Total chunks: ${chunkCount}`);
    console.log(`- Total response length: ${fullText.length}`);
    console.log(`- Average chunk size: ${Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length)} bytes`);
    console.log(`- Stream duration: ${duration}ms`);
    console.log(`- Throughput: ${Math.round(fullText.length / duration * 1000)} chars/sec`);

    if (fullText.length > 500) {
      console.log('✅ Large response streaming works correctly');
      return true;
    } else {
      console.log('⚠️  Response seems small for a detailed explanation');
      return false;
    }

  } catch (error) {
    console.error('❌ Large response test failed:', error.message);
    return false;
  }
}

async function checkServerHealth() {
  console.log('🏥 Checking server health...\n');

  try {
    const response = await fetch('http://localhost:4322/', {
      method: 'GET',
    });

    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log('⚠️  Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible:', error.message);
    console.log('   Make sure to run: npm run dev');
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 AI SDK Text Stream Test Suite');
  console.log('=================================\n');

  const serverOk = await checkServerHealth();
  if (!serverOk) {
    console.log('❌ Server is not available, exiting...');
    process.exit(1);
  }

  const tests = [
    { name: 'Basic AI SDK Streaming', fn: testAISDKStreaming },
    { name: 'File Attachment', fn: testWithFileAttachment },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Large Response', fn: testLargeResponse }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n▶️  Running: ${test.name}`);
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      failed++;
    }
  }

  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! AI SDK streaming is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
  }

  return failed === 0;
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ for fetch support');
  process.exit(1);
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
