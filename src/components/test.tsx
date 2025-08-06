'use client';

// Import necessary hooks and components from React and other libraries
import { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import GrammarCorrectionView from '@/components/GrammarCorrectionView';
import { useConversations } from '@/hooks/useConversations';

// The main component for the home page
export default function Home() {
  // Define the list of available tools
  const tools = [
    { id: 1, name: 'Grammar Correction', icon: '📝' },
    { id: 2, name: 'Language Translation', icon: '💻' },
    { id: 3, name: 'File OCR', icon: '📄' },
    { id: 4, name: 'Paraphraser', icon: '🔄' },
    { id: 5, name: 'Summarizer', icon: '📋' },
  ];

  // State management for UI elements and application logic
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<{ id: number; name: string; icon: string } | null>({
    id: 5,
    name: 'Summarizer',
    icon: '📋',
  });

  // Custom hook to manage conversations
  const {
    conversations,
    currentConversationId,
    currentConversation,
    createNewConversation,
    addMessageToConversation,
    deleteConversation,
    selectConversation,
    clearCurrentConversation,
    updateLastMessage,
    overwriteLastMessage,
  } = useConversations();

  /****************************************************************************
   * START: Grammar Correction Tool's Differentiated Logic
   *
   * The following section highlights how the 'Grammar Correction' tool is
   * handled differently from the other tools.
   ****************************************************************************/

  /**
   * This function determines the API endpoint based on the selected tool.
   * For the 'Grammar Correction' tool, it uses a specific URL, while all
   * other tools use a default API URL.
   */
  const getApiUrl = (toolName: string) => {
    if (toolName === 'Grammar Correction') {
      return process.env.NEXT_PUBLIC_GRAMMAR_API_URL; // Specific URL for Grammar Correction
    }
    return process.env.NEXT_PUBLIC_API_URL; // Default URL for other tools
  };

  /**
   * This function submits the user's task to the backend. The handling of the
   * response is different for the 'Grammar Correction' tool.
   */
  const submitTask = async (convId: string, query: string, file?: File) => {
    if (!selectedTool) {
      setIsStreaming(false);
      return;
    }

    const formData = new FormData();
    let toolName = selectedTool.name.toLowerCase().replace(' ', '_');
    if (toolName === 'language_translation') {
      toolName = 'translate';
    }
    formData.append('taskid', toolName);
    formData.append('query', query);
    if (file) {
      formData.append('file', file);
    }

    // Get the appropriate API URL for the selected tool.
    const apiUrl = getApiUrl(selectedTool.name);

    try {
      const response = await fetch(`${apiUrl}/submit-task`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const jobId = result.jobid;
        console.log(result);
        console.log(result.jobid);
        

        /**
         * If the selected tool is 'Grammar Correction', the application
         * immediately receives the original HTML content and a job ID.
         * It then updates the last message in the conversation with a
         * special 'grammar' type, including the job ID and the original HTML.
         * It does not proceed to poll for job status or stream a response
         * in the same way as other tools.
         */
        if (selectedTool.name === 'Grammar Correction') {
            console.log(result.html);
          overwriteLastMessage(convId, {
            type: 'grammar',
            jobId: result.jobid,
            originalHtml: result.html,
          });
          setIsStreaming(false);
        } else {
          // For all other tools, the application polls for job status.
          const pollJobStatus = setInterval(async () => {
            try {
              const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-status?jobid=${jobId}`);

              if (statusResponse.ok) {
                const statusResult = await statusResponse.json();
                if (statusResult.status === 'ocr_completed' || statusResult.status === 'summarizer_completed' || statusResult.status === 'translate_completed' || statusResult.status === 'grammar_completed') {
                  clearInterval(pollJobStatus);
                  streamResponse(convId, jobId);
                }
              } else {
                clearInterval(pollJobStatus);
                overwriteLastMessage(convId, `Error checking job status for "${selectedTool.name}".`);
                setIsStreaming(false);
              }
            } catch (error) {
              clearInterval(pollJobStatus);
              console.error('Error polling job status:', error);
              overwriteLastMessage(convId, `Error polling job status for "${selectedTool.name}".`);
              setIsStreaming(false);
            }
          }, 1000);
        }
      } else {
        overwriteLastMessage(convId, `Error submitting task "${selectedTool.name}".`);
        setIsStreaming(false);
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      overwriteLastMessage(convId, `Error submitting task "${selectedTool.name}".`);
      setIsStreaming(false);
    }
  };
  
  /****************************************************************************
   * END: Grammar Correction Tool's Differentiated Logic
   ****************************************************************************/

  // Function to stream the response from the server
  const streamResponse = async (convId: string, jobId: string) => {
    streamControllerRef.current = new AbortController();
    const { signal } = streamControllerRef.current;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stream/${jobId}`, { signal });
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let initialContent = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const token = line.substring(5).trim();

            if (token) {
              let contentToAppend = token;
              try {
                contentToAppend = JSON.parse(token);
              } catch (error) {
                // Non-JSON token, use as is
              }

              if (initialContent) {
                overwriteLastMessage(convId, contentToAppend);
                initialContent = false;
              } else {
                updateLastMessage(convId, contentToAppend);
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Error streaming response:', error);
        overwriteLastMessage(convId, 'Error streaming response.');
      }
    }
    finally {
      setIsStreaming(false);
      streamControllerRef.current = null;
    }
  };

  // Handles the user's request by creating a conversation and submitting the task
  const handleUserRequest = async (message: string, file?: File) => {
    setIsStreaming(true);
    let convId = currentConversationId;
    if (!convId) {
      const newConv = createNewConversation();
      convId = newConv.id;
    }

    let userMessage = message;
    if (file) {
      userMessage = message ? `${message}\n\nFile "${file.name}" uploaded.` : `File "${file.name}" uploaded.`;
    }

    addMessageToConversation(convId, {
      content: userMessage,
      role: 'user',
    });

    addMessageToConversation(convId, {
      content: 'Analyzing...',
      role: 'assistant',
    });

    submitTask(convId, message, file);
  };

  // Handler for sending a text message
  const handleSendMessage = (message: string) => {
    handleUserRequest(message);
  };

  // Handler for uploading a file
  const handleFileUpload = (file: File, message?: string) => {
    handleUserRequest(message || '', file);
  };

  // Handler for starting a new chat
  const handleNewChat = () => {
    clearCurrentConversation();
    setIsSidebarOpen(false);
  };

  // Handler for selecting a tool
  const handleToolSelect = (tool: { id: number; name: string; icon: string }) => {
    if (currentConversationId) {
      clearCurrentConversation();
    }
    setSelectedTool(tool);
  };

  // Toggles the visibility of the sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // JSX for rendering the component
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        conversations={conversations}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={deleteConversation}
        currentConversationId={currentConversationId}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">SaarthiGPT</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {/* Tools Dropdown */}
                {isToolsDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10" ref={dropdownRef}>
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 px-3 py-1">Tools</div>
                      {tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setSelectedTool(tool);
                            setIsToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
                        >
                          <span className="text-lg">{tool.icon}</span>
                          <span className="text-sm text-gray-700">{tool.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto">
          {currentConversation ? (
            <div className="pb-32">
              {currentConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          ) : (
            // Welcome Screen
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTool ? `${selectedTool.name} Tool` : 'How can I help you today?'}
                </h2>
                <p className="text-gray-600">
                  {selectedTool
                    ? `You're using the ${selectedTool.name} tool. Click on the tools icon to switch tools.`
                    : 'Click on the tools icon near the bottom right corner to select different tools available.'}
                </p>
              </div>

              {/* Tool-specific prompts */}
              {selectedTool && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {selectedTool.id === 1 && (
                    <>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Check grammar and spelling</h3>
                        <p className="text-sm text-gray-600">Paste your text to get grammar corrections</p>
                      </div>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Improve writing style</h3>
                        <p className="text-sm text-gray-600">Make your writing more professional and clear</p>
                      </div>
                    </>
                  )}
                  {selectedTool.id === 2 && (
                    <>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Attach file</h3>
                        <p className="text-sm text-gray-600">Attach file to get the english translation</p>
                      </div>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Paste the complete text</h3>
                        <p className="text-sm text-gray-600">Get the line by line translation of any Language in english</p>
                      </div>
                    </>
                  )}
                  {selectedTool.id === 3 && (
                    <>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Extract text from document</h3>
                        <p className="text-sm text-gray-600">Upload a document to extract readable text</p>
                      </div>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Convert image to text</h3>
                        <p className="text-sm text-gray-600">Upload an image to extract text content</p>
                      </div>
                    </>
                  )}
                  {selectedTool.id === 4 && (
                    <>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Rephrase text</h3>
                        <p className="text-sm text-gray-600">Rewrite text while keeping the same meaning</p>
                      </div>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Simplify text</h3>
                        <p className="text-sm text-gray-600">Make complex text easier to understand</p>
                      </div>
                    </>
                  )}
                  {selectedTool.id === 5 && (
                    <>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Upload document for summary</h3>
                        <p className="text-sm text-gray-600">Upload PDF, DOC, or text files to get a summary</p>
                      </div>
                      <div
                        className="bg-white p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <h3 className="font-medium text-gray-900 mb-2">Extract key points</h3>
                        <p className="text-sm text-gray-600">Get the main points and important information</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Default prompts when no tool is selected */}
              {!selectedTool && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                    onClick={() => handleSendMessage('Write a professional email')}
                  >
                    <h3 className="font-medium text-gray-900 mb-2">Write a professional email</h3>
                    <p className="text-sm text-gray-600">Draft a business email for any purpose</p>
                  </div>
                  <div
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                    onClick={() => handleSendMessage('Explain a complex topic')}
                  >
                    <h3 className="font-medium text-gray-900 mb-2">Explain a complex topic</h3>
                    <p className="text-sm text-gray-600">Get a simple explanation of any concept</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Search Bar */}
        <SearchBar
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onToolSelect={handleToolSelect}
          disabled={isStreaming}
          currentTool={selectedTool}
          isStreaming={isStreaming}
          onStopStreaming={() => {
            if (streamControllerRef.current) {
              streamControllerRef.current.abort();
            }
          }}
        />
      </div>
    </div>
  );
}