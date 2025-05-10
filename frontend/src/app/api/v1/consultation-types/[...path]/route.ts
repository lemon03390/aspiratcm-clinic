import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    console.log('[API Proxy] GET consultation-types', params.path);
    try {
        const backendUrl = getBackendUrl(`/consultation-types/${params.path.join('/')}`);
        console.log('[API Proxy] Forwarding to:', backendUrl);

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') || '' }
                    : {})
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error proxying consultation-types GET request:', error);
        return NextResponse.json(
            { detail: '系統錯誤，請稍後再試' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    console.log('[API Proxy] POST consultation-types', params.path);
    try {
        const body = await request.json();
        const backendUrl = getBackendUrl(`/consultation-types/${params.path.join('/')}`);
        console.log('[API Proxy] Forwarding to:', backendUrl, body);

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') || '' }
                    : {})
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error proxying consultation-types POST request:', error);
        return NextResponse.json(
            { detail: '系統錯誤，請稍後再試' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    console.log('[API Proxy] PUT consultation-types', params.path);
    try {
        const body = await request.json();
        const backendUrl = getBackendUrl(`/consultation-types/${params.path.join('/')}`);
        console.log('[API Proxy] Forwarding to:', backendUrl, body);

        const response = await fetch(backendUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') || '' }
                    : {})
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error proxying consultation-types PUT request:', error);
        return NextResponse.json(
            { detail: '系統錯誤，請稍後再試' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    console.log('[API Proxy] DELETE consultation-types', params.path);
    try {
        const backendUrl = getBackendUrl(`/consultation-types/${params.path.join('/')}`);
        console.log('[API Proxy] Forwarding to:', backendUrl);

        const response = await fetch(backendUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') || '' }
                    : {})
            },
        });

        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error proxying consultation-types DELETE request:', error);
        return NextResponse.json(
            { detail: '系統錯誤，請稍後再試' },
            { status: 500 }
        );
    }
} 