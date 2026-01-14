"use client"

import { cn } from "@/lib/utils"
import type { View } from "@/app/page"
import { useTodo } from "@/context/todo-context"
import { LayoutList, Star, CheckCircle2, Settings, Clock, MessageSquare, Bot, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const navItems = [
  { id: "list" as View, label: "所有任务", icon: LayoutList },
  { id: "important" as View, label: "重要", icon: Star },
  { id: "completed" as View, label: "已完成", icon: CheckCircle2 },
  { id: "history" as View, label: "历程", icon: Clock },
]

// AI 对话消息类型
interface AIMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { todos, plans } = useTodo()
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      id: "1",
      content: '你好！我是你的 AI 任务助手。我可以帮你：\n1. 智能分析任务优先级\n2. 建议任务分解\n3. 提供时间管理建议\n4. 回答任务相关问题\n\n有什么可以帮你的吗？',
      role: "assistant",
      timestamp: new Date()
    }
  ])
  const [aiInput, setAiInput] = useState("")
  const [isAILoading, setIsAILoading] = useState(false)
  const aiMessagesEndRef = useRef<HTMLDivElement>(null)

  const getCounts = (view: View) => {
    switch (view) {
      case "list":
        return todos.filter((t) => !t.completed).length + plans.filter((p) => p.active).length
      case "important":
        return (
          todos.filter((t) => t.important && !t.completed).length + plans.filter((p) => p.important && p.active).length
        )
      case "completed":
        return todos.filter((t) => t.completed).length
      case "history":
        return 0
      default:
        return 0
    }
  }

  // 滚动到底部
  useEffect(() => {
    if (isAIChatOpen) {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [aiMessages, isAIChatOpen])

  const handleSendAIMessage = async () => {
    if (!aiInput.trim() || isAILoading) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: aiInput,
      role: "user",
      timestamp: new Date()
    }

    setAiMessages(prev => [...prev, userMessage])
    setAiInput("")
    setIsAILoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: aiInput,
          history: aiMessages.slice(-5).map(m => ({
            role: m.role,
            content: m.content
          })),
          // 可选：传递当前任务数据给 AI
          todos: todos.slice(0, 10), // 只传递最近的任务
          plans: plans.slice(0, 5)   // 只传递最近的计划
        })
      })

      if (!response.ok) {
        throw new Error("AI 服务请求失败")
      }

      const data = await response.json()

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date()
      }

      setAiMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("AI 对话出错:", error)
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "抱歉，AI 助手暂时无法响应。请检查网络连接或稍后重试。",
        role: "assistant",
        timestamp: new Date()
      }])
    } finally {
      setIsAILoading(false)
    }
  }

  // 快捷操作
  const quickActions = [
    {
      label: "帮我优化任务优先级",
      prompt: `我有 ${todos.filter(t => !t.completed).length} 个未完成任务和 ${plans.filter(p => p.active).length} 个进行中计划。请帮我分析并优化任务优先级。`
    },
    {
      label: "分解复杂任务",
      prompt: "如何将这个复杂任务分解成可执行的小步骤？"
    },
    {
      label: "时间管理建议",
      prompt: "基于我的任务数量，给我一些提高工作效率的时间管理建议"
    },
  ]

  return (
    <>
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col relative">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">Todo List</h1>
              <p className="text-xs text-muted-foreground">任务管理</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const count = getCounts(item.id)
            const isActive = currentView === item.id

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  <span>{item.label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* AI 对话入口 - 添加在导航项中 */}
          <button
            onClick={() => setIsAIChatOpen(true)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors mt-4",
              isAIChatOpen
                ? "bg-purple-500/20 text-sidebar-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-4 h-4 flex items-center justify-center",
                isAIChatOpen ? "text-purple-400" : "text-muted-foreground"
              )}>
                <Bot className="w-4 h-4" />
              </div>
              <span className={isAIChatOpen ? "text-purple-300" : ""}>AI 助手</span>
            </div>
            {aiMessages.filter(m => m.role === "user").length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                {aiMessages.filter(m => m.role === "user").length}
              </span>
            )}
          </button>
        </nav>

        {/* Settings */}
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={() => onViewChange("settings")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
              currentView === "settings"
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Settings className={cn("w-4 h-4", currentView === "settings" && "text-primary")} />
            <span>设置</span>
          </button>
        </div>
      </aside>

      {/* AI 对话面板 - 浮动在侧边栏右侧 */}
      {isAIChatOpen && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsAIChatOpen(false)}
          />

          {/* 对话面板 */}
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-sidebar border-l border-sidebar-border flex flex-col shadow-2xl">
            {/* 头部 */}
            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-sidebar-foreground">AI 任务助手</h3>
                  <p className="text-xs text-muted-foreground">智能任务分析与建议</p>
                </div>
              </div>
              <button
                onClick={() => setIsAIChatOpen(false)}
                className="p-2 hover:bg-sidebar-accent/50 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex-shrink-0 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-300" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl p-4",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-sidebar-accent text-sidebar-foreground rounded-bl-none"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div className={cn(
                      "text-xs mt-2",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <div className="w-4 h-4 text-primary">你</div>
                    </div>
                  )}
                </div>
              ))}

              {isAILoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="bg-sidebar-accent rounded-2xl rounded-bl-none p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiMessagesEndRef} />
            </div>

            {/* 快捷操作和输入区域 */}
            <div className="p-4 border-t border-sidebar-border">
              {/* 快捷操作按钮 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setAiInput(action.prompt)
                      setTimeout(() => {
                        const textarea = document.querySelector("textarea")
                        textarea?.focus()
                      }, 100)
                    }}
                    className="px-3 py-1.5 text-xs bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-full text-muted-foreground hover:text-sidebar-foreground transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* 输入区域 */}
              <div className="flex gap-2">
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendAIMessage()
                    }
                  }}
                  placeholder="输入您的问题..."
                  className="flex-1 bg-sidebar-accent text-sidebar-foreground rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-muted-foreground"
                  rows={3}
                  disabled={isAILoading}
                />
                <button
                  onClick={handleSendAIMessage}
                  disabled={isAILoading || !aiInput.trim()}
                  className="self-end px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-sidebar-border disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}