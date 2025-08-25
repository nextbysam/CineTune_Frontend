import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const body = await request.json();

		// Normalize incoming payload to expected shape
		const design = body?.design || {};
		const options = body?.options || {};

		const size = design.size || options.size || { width: 1080, height: 1920 };
		const fps = options.fps || design.fps || 30;
		const format = options.format || "mp4";
		const duration = design.duration;
		const background = design.background;
		const trackItemsArray = Array.isArray(design.trackItems)
			? design.trackItems
			: Object.values(design.trackItemsMap || {});

		const normalized = {
			design: {
				id: design.id,
				size,
				fps,
				duration,
				background,
				trackItems: trackItemsArray,
				tracks: design.tracks || [],
				transitions: design.transitionsMap || {},
			},
			options: {
				fps,
				size,
				format,
			},
		};

		const token = process.env.COMBO_SH_JWT;
		if (!token) {
			return NextResponse.json(
				{ message: "Missing COMBO_SH_JWT env for render auth" },
				{ status: 500 },
			);
		}

		const response = await fetch("https://api.combo.sh/v1/render", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(normalized),
		});

		const responseData = await response.json().catch(() => ({}));
		if (!response.ok) {
			return NextResponse.json(
				{
					message: responseData?.message || "Failed render json to video",
					debug: { status: response.status, responseData },
				},
				{ status: response.status },
			);
		}

		return NextResponse.json(responseData, { status: 200 });
	} catch (error: any) {
		console.error("/api/render POST error", error);
		return NextResponse.json(
			{ message: "Internal server error", error: String(error?.message || error) },
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type");
		const id = searchParams.get("id");
		if (!id) {
			return NextResponse.json(
				{ message: "id parameter is required" },
				{ status: 400 },
			);
		}
		if (!type) {
			return NextResponse.json(
				{ message: "type parameter is required" },
				{ status: 400 },
			);
		}

		const token = process.env.COMBO_SH_JWT;
		if (!token) {
			return NextResponse.json(
				{ message: "Missing COMBO_SH_JWT env for render auth" },
				{ status: 500 },
			);
		}

		const response = await fetch(`https://api.combo.sh/v1/render/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const payload = await response.json().catch(() => ({}));
			return NextResponse.json(
				{ message: "Failed to fetch export status", debug: payload },
				{ status: response.status },
			);
		}

		const statusData = await response.json();
		return NextResponse.json(statusData, { status: 200 });
	} catch (error: any) {
		console.error("/api/render GET error", error);
		return NextResponse.json(
			{ message: "Internal server error", error: String(error?.message || error) },
			{ status: 500 },
		);
	}
}
