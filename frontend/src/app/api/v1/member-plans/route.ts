import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = getBackendUrl();
const ENDPOINT = '/member-plans';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const requestUrl = `${BASE_URL}${ENDPOINT}${searchParams ? `?${searchParams}` : ''}`;

        console.log(`[API Proxy] GET ${requestUrl}`);

        const response = await fetch(requestUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[API Proxy] Error ${response.status}: ${await response.text()}`);
            return NextResponse.json(
                { detail: `Error fetching member plans: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Error fetching member plans:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const requestUrl = `${BASE_URL}${ENDPOINT}`;

        console.log(`[API Proxy] POST ${requestUrl}`, body);

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Proxy] Error ${response.status}: ${errorText}`);
            return NextResponse.json(
                { detail: `Error creating member plan: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Error creating member plan:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
} 