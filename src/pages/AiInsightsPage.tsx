import { RefreshCw, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type {
  AiBriefResponse,
  ChatMessage,
  DataSourceMeta,
  MarketOverviewResponse,
} from '../types/market';
import { marketApi } from '../services/api';
import { D3SentimentChart } from '../components/D3SentimentChart';
import { DataDisclosure } from '../components/DataDisclosure';

const SUGGESTED_QUESTIONS = [
  'What is the KSE-100?',
  'What happened in the PSX today?',
  'Compare HBL and MEBL',
  'What does P/E ratio mean?',
  'Explain dividend yield',
  'Why did OGDC rise?',
];

interface AiInsightsPageProps {
  overview: MarketOverviewResponse | null;
  meta: DataSourceMeta | null;
  brief: AiBriefResponse | null;
  briefLoading: boolean;
  briefError: string | null;
  onRefreshBrief: () => void;
}

export function AiInsightsPage({
  overview,
  meta,
  brief,
  briefLoading,
  briefError,
  onRefreshBrief,
}: AiInsightsPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    try {
      const reply = await marketApi.askGreenline(
        trimmed,
        messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply.answer,
          timestamp: reply.answeredAt,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Unable to reach Ask GREENLINE right now. Please try again.',
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F5F2]">
            AI Market Intelligence
          </h1>
          <p className="text-sm text-[#89968D] mt-1">
            Gemini-synthesized PSX daily briefings and grounded Q&amp;A.
          </p>
        </div>
        <DataDisclosure meta={meta} />
      </div>

      {/* THE GREENLINE BRIEF Full Report */}
      <section
        aria-labelledby="full-brief-heading"
        className="rounded-xl surface-glass border border-[#2F4236] p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#39E879]">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>AI Daily Market Brief</span>
            </div>
            <h2
              id="full-brief-heading"
              className="font-display text-xl font-bold text-[#F2F5F2] mt-1"
            >
              THE GREENLINE BRIEF
            </h2>
          </div>

          <button
            type="button"
            onClick={onRefreshBrief}
            disabled={briefLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#151F19] border border-[#25332A] text-xs font-medium text-[#F2F5F2] hover:border-[#39E879]/50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${briefLoading ? 'animate-spin text-[#39E879]' : ''}`}
              aria-hidden="true"
            />
            <span>{briefLoading ? 'Generating...' : brief ? 'Regenerate Brief' : 'Generate Brief'}</span>
          </button>
        </div>

        {briefLoading && !brief && (
          <div className="space-y-3">
            <div className="h-5 w-1/2 rounded bg-[#19251D] animate-pulse" />
            <div className="h-20 rounded bg-[#19251D] animate-pulse" />
            <div className="h-20 rounded bg-[#19251D] animate-pulse" />
          </div>
        )}

        {briefError && (
          <div className="rounded-lg bg-[#151F19] border border-[#F06B72]/40 p-4 text-sm text-[#F06B72]">
            {briefError}
          </div>
        )}

        {!brief && !briefLoading && !briefError && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-[#89968D] leading-relaxed">
              Generate a Gemini-synthesized summary of KSE-100 performance, advancing and declining
              sectors, and key PSX market developments.
            </p>
            <button
              type="button"
              onClick={onRefreshBrief}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Generate Market Brief</span>
            </button>
          </div>
        )}

        {brief && (
          <div className="space-y-5 pt-3 border-t border-[#25332A]">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F2F5F2]">
                {brief.headline}
              </h3>
              <p className="text-sm text-[#89968D] leading-relaxed mt-2">{brief.marketSummary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {brief.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-[#151F19] border border-[#25332A] p-4 space-y-2"
                >
                  <div className="font-mono text-xs text-[#39E879]">Insight 0{idx + 1}</div>
                  <p className="text-sm text-[#F2F5F2]/90 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#39E879]">Positive Drivers</div>
                <p className="text-[#89968D] leading-relaxed">{brief.positiveMoversNote}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#F06B72]">Negative Pressure</div>
                <p className="text-[#89968D] leading-relaxed">{brief.negativeMoversNote}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#F2F5F2]">Key Developments</div>
                <p className="text-[#89968D] leading-relaxed">{brief.keyDevelopments}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#F2F5F2]">Session Outlook</div>
                <p className="text-[#89968D] leading-relaxed">{brief.outlook}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* D3 Daily Market Sentiment Trend */}
      <D3SentimentChart overview={overview} brief={brief} />

      {/* Ask GREENLINE Conversational Interface */}
      <section
        aria-labelledby="ask-greenline-heading"
        className="rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#25332A] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="ask-greenline-heading" className="font-display text-lg font-semibold text-[#F2F5F2]">
              Ask GREENLINE
            </h2>
            <p className="text-xs text-[#89968D]">
              Ask about PSX stocks, index mechanics, or financial valuation concepts.
            </p>
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="px-6 py-3.5 border-b border-[#25332A]/70 bg-[#0B100D] flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => sendQuestion(q)}
              className="px-3 py-1.5 rounded-lg bg-[#151F19] border border-[#25332A] text-xs text-[#8BE9A8] hover:border-[#39E879]/60 hover:text-[#39E879] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Conversation Thread */}
        <div className="p-6 space-y-4 min-h-[260px] max-h-[480px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-2 max-w-md mx-auto">
              <p className="text-sm font-medium text-[#F2F5F2]">
                Start a conversation with GREENLINE
              </p>
              <p className="text-xs text-[#89968D] leading-relaxed">
                Select a prompt above or type your own question about KSE-100 companies, financial
                ratios, or PSX market moves.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#19251D] border border-[#39E879]/40 text-[#F2F5F2]'
                      : msg.error
                        ? 'bg-[#151F19] border border-[#F06B72]/40 text-[#F06B72]'
                        : 'bg-[#151F19] border border-[#25332A] text-[#F2F5F2]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 bg-[#151F19] border border-[#25332A] text-xs font-mono text-[#8BE9A8]">
                Analyzing PSX context...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}
          className="p-4 border-t border-[#25332A] bg-[#0B100D] flex items-center gap-3"
        >
          <label htmlFor="ask-greenline-input" className="sr-only">
            Ask a question about PSX or financial concepts
          </label>
          <input
            id="ask-greenline-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a PSX stock, index, or financial concept..."
            className="flex-1 h-11 px-4 rounded-lg bg-[#101713] border border-[#25332A] text-sm text-[#F2F5F2] placeholder-[#89968D] focus:outline-none focus:border-[#39E879]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 px-4 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] disabled:opacity-50 transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </section>
    </div>
  );
}
