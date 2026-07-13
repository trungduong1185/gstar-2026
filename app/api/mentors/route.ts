import { NextResponse } from "next/server";
import { readMentorNetwork } from "@/lib/mentor-settings";
export async function GET() { const data=await readMentorNetwork(); return NextResponse.json({ ...data, mentors:data.mentors.filter(mentor=>mentor.visible!==false) }, { headers:{ "Cache-Control":"no-store" } }); }
