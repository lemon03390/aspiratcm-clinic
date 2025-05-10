import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = getBackendUrl();
const ENDPOINT = '/member-plans';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const requestUrl = `${BASE_URL}${ENDPOINT}/${id}`;

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
                { detail: `Error fetching member plan: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Error fetching member plan:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const requestUrl = `${BASE_URL}${ENDPOINT}/${id}`;

        console.log(`[API Proxy] PUT ${requestUrl}`, body);

        const response = await fetch(requestUrl, {
            method: 'PUT',
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
                { detail: `Error updating member plan: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Error updating member plan:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const requestUrl = `${BASE_URL}${ENDPOINT}/${id}`;

        console.log(`[API Proxy] DELETE ${requestUrl}`);

        const response = await fetch(requestUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Proxy] Error ${response.status}: ${errorText}`);
            return NextResponse.json(
                { detail: `Error deleting member plan: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Error deleting member plan:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
} 