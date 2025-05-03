import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '../../../../../libs/apiClient'

// 處理所有設定相關API請求
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || []
    const apiPath = pathSegments.join('/')
    const url = getBackendUrl(`/settings/${apiPath}${request.nextUrl.search}`)

    console.log(`[Settings API Proxy] GET 請求: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Settings API Proxy] GET 錯誤:', error)
    return NextResponse.json(
      { error: '無法連接到後端 API' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || []
    const apiPath = pathSegments.join('/')
    const url = getBackendUrl(`/settings/${apiPath}`)
    
    console.log(`[Settings API Proxy] POST 請求: ${url}`)
    
    const body = await request.json()
    console.log(`[Settings API Proxy] POST 資料:`, body)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Settings API Proxy] POST 錯誤:', error)
    return NextResponse.json(
      { error: '無法連接到後端 API' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || []
    const apiPath = pathSegments.join('/')
    const url = getBackendUrl(`/settings/${apiPath}`)
    
    console.log(`[Settings API Proxy] PUT 請求: ${url}`)
    
    const body = await request.json()
    console.log(`[Settings API Proxy] PUT 資料:`, body)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Settings API Proxy] PUT 錯誤:', error)
    return NextResponse.json(
      { error: '無法連接到後端 API' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || []
    const apiPath = pathSegments.join('/')
    const url = getBackendUrl(`/settings/${apiPath}`)
    
    console.log(`[Settings API Proxy] DELETE 請求: ${url}`)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Settings API Proxy] DELETE 錯誤:', error)
    return NextResponse.json(
      { error: '無法連接到後端 API' },
      { status: 500 }
    )
  }
} 