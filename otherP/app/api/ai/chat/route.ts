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
        console.log('1. 环境变量 DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已设置' : '未设置')
        console.log('2. 环境变量 NEXT_PUBLIC_AI_SERVICE:', process.env.NEXT_PUBLIC_AI_SERVICE)
        console.log('3. 所有环境变量:', Object.keys(process.env).filter(key => key.includes('DEEPSEEK') || key.includes('OPENAI')))

        const { message, history, todos = [], plans = [] }: RequestBody = await request.json()

        // 选择使用的 AI 服务（可配置）
        const aiService = process.env.AI_SERVICE || 'openai'

        let responseContent = ''
        let error = null

        switch (aiService) {
            case 'openai':
                // OpenAI API
                if (!process.env.OPENAI_API_KEY) {
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
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
                if (!process.env.DEEPSEEK_API_KEY) {
                    throw new Error('DEEPSEEK_API_KEY 未配置')
                }

                const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            {
                                role: 'system',
                                content: '你是一个专业的任务管理助手，帮助用户管理任务、规划时间、提高效率。'
                            },
                            ...history.slice(-6),
                            { role: 'user', content: message }
                        ],
                        max_tokens: 1000
                    })
                })

                if (!deepseekResponse.ok) {
                    throw new Error('DeepSeek API 请求失败')
                }

                const deepseekData = await deepseekResponse.json()
                responseContent = deepseekData.choices[0]?.message?.content || ''
                break

            case 'local':
                // 本地模拟响应（开发用）
                responseContent = `这是对"${message}"的模拟回复。当前你有 ${todos.length} 个任务和 ${plans.length} 个计划。建议：1. 优先处理重要任务 2. 合理分配时间 3. 定期回顾进度。`
                break

            default:
                throw new Error('未配置 AI 服务')
        }

        return NextResponse.json({
            success: true,
            response: responseContent
        })

    } catch (error: any) {
        console.error('AI 对话错误:', error)

        return NextResponse.json({
            success: false,
            error: error.message || 'AI 服务暂时不可用',
            response: '抱歉，AI 助手暂时无法响应。请检查配置或稍后重试。'
        }, { status: 500 })
    }
}