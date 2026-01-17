// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'

// 定义消息类型
interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface RequestBody {
    message: string
    history: Message[]
    todos?: any[]
    plans?: any[]
}

export async function POST(request: NextRequest) {
    try {
        console.log('=== AI API 调试信息 ===')

        // 1. 优先使用客户端可访问的环境变量
        const clientApiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
        const clientAiService = process.env.NEXT_PUBLIC_AI_SERVICE

        // 2. 备用：服务端环境变量（仅构建时可用）
        const serverApiKey = process.env.DEEPSEEK_API_KEY
        const serverAiService = process.env.AI_SERVICE

        // 3. 选择有效的配置
        const effectiveApiKey = clientApiKey || serverApiKey
        const effectiveAiService = clientAiService || serverAiService || 'deepseek'

        console.log('环境变量状态:', {
            clientApiKey: clientApiKey ? '已设置' : '未设置',
            clientAiService,
            serverApiKey: serverApiKey ? '已设置' : '未设置',
            serverAiService,
            effectiveApiKey: effectiveApiKey ? '已设置' : '未设置',
            effectiveAiService
        })

        const { message, history, todos = [], plans = [] }: RequestBody = await request.json()

        // 使用有效的 AI 服务配置
        const aiService = effectiveAiService

        let responseContent = ''
        let error = null

        switch (aiService) {
            case 'openai':
                // OpenAI API
                const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
                if (!openaiApiKey) {
                    throw new Error('OPENAI_API_KEY 未配置')
                }

                const openaiMessages: Message[] = [
                    {
                        role: 'system',
                        content: `你是一个专业的任务管理助手，帮助用户管理任务、规划时间、提高效率。
            当前用户有 ${todos.length} 个任务和 ${plans.length} 个计划。
            请根据任务数据提供个性化的建议，回答要简洁实用，突出重点。`
                    },
                    ...history.slice(-6), // 保留最近6条历史
                    { role: 'user', content: message }
                ]

                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: openaiMessages,
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                })

                if (!openaiResponse.ok) {
                    const errorData = await openaiResponse.json()
                    throw new Error(`OpenAI API 错误: ${JSON.stringify(errorData)}`)
                }

                const openaiData = await openaiResponse.json()
                responseContent = openaiData.choices[0]?.message?.content || ''
                break

            case 'deepseek':
                // DeepSeek API
                if (!effectiveApiKey) {
                    throw new Error('DEEPSEEK_API_KEY 未配置。请检查 NEXT_PUBLIC_DEEPSEEK_API_KEY 环境变量')
                }

                console.log('调用 DeepSeek API...')

                const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${effectiveApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            {
                                role: 'system',
                                content: `你是一个专业的任务管理助手，帮助用户管理任务、规划时间、提高效率。
                当前用户有 ${todos.length} 个任务和 ${plans.length} 个计划。
                请根据任务数据提供个性化的建议，回答要简洁实用。`
                            },
                            ...history.slice(-6),
                            { role: 'user', content: message }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                })

                if (!deepseekResponse.ok) {
                    const errorText = await deepseekResponse.text()
                    console.error('DeepSeek API 错误:', deepseekResponse.status, errorText)
                    throw new Error(`DeepSeek API 请求失败: ${deepseekResponse.status} ${errorText}`)
                }

                const deepseekData = await deepseekResponse.json()
                responseContent = deepseekData.choices[0]?.message?.content || ''
                console.log('DeepSeek API 响应成功')
                break

            case 'local':
                // 本地模拟响应（开发用）
                responseContent = `🤖 本地模拟: ${message}\n\n当前有 ${todos.length} 个任务，${plans.length} 个计划。\n\n建议：\n1. 优先处理重要任务\n2. 合理分配时间\n3. 定期回顾进度\n\n💡 提示: 配置 API 密钥以启用真实 AI 功能。`
                break

            default:
                throw new Error(`未配置 AI 服务: ${aiService}`)
        }

        return NextResponse.json({
            success: true,
            response: responseContent,
            debug: {
                aiService: effectiveAiService,
                hasApiKey: !!effectiveApiKey,
                timestamp: new Date().toISOString()
            }
        })

    } catch (error: any) {
        console.error('AI 对话错误:', error)

        return NextResponse.json({
            success: false,
            error: error.message || 'AI 服务暂时不可用',
            response: '抱歉，AI 助手暂时无法响应。请检查配置或稍后重试。',
            debug: {
                timestamp: new Date().toISOString(),
                nodeEnv: process.env.NODE_ENV
            }
        }, { status: 500 })
    }
}